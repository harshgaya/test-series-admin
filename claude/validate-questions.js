/*
  validate-questions.js   (Postgres direct connection version)

  Connects straight to your Supabase Postgres using the connection string in
  SUPABASE_URL (postgresql://postgres:...). Uses the `pg` library, NOT
  supabase-js, so your database URL works directly.

  Run in VS Code terminal (from a folder that has your .env):
    npm install @anthropic-ai/sdk pg dotenv
    node validate-questions.js

  .env must contain:
    ANTHROPIC_API_KEY=sk-ant-...
    SUPABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres

  Starts in DRY_RUN (prints, writes nothing). When it looks right:
    - set DRY_RUN = false
    - set TEST_LIMIT = 0  (full run, resumable)
    - run ONCE in Supabase SQL editor first:
        ALTER TABLE questions ADD COLUMN IF NOT EXISTS reval_at timestamptz;
        CREATE INDEX IF NOT EXISTS idx_questions_reval
          ON questions (id) WHERE reval_at IS NULL;
*/

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import pg from "pg";

/* ------------------------- CONFIG ------------------------- */

const DRY_RUN = false; // true = print only, NO db writes. false = apply.
const TEST_LIMIT = 0; // questions to process in test. 0 = all (full run).
const START_ID = 0; // begin from this id (ids >= this). 0 = no limit.

const MODEL = "claude-haiku-4-5-20251001"; // pass 2 (flagged only): "claude-sonnet-4-6"
const BATCH_SIZE = 25;
const CONCURRENCY = 8;
// Pass 2: set true + MODEL sonnet to re-check ONLY answer_flag questions
const REDO_FLAGGED = false;
// Hard stop when estimated spend reaches this (USD). 0 = no cap.
const COST_LIMIT_USD = 20;
// Process questions used in published tests FIRST (highest student impact)
const PRIORITIZE_TEST_QUESTIONS = true;
// Only validate questions actually used in a test (skips unused bank questions).
// Best for a tight budget - spends only on questions students can see.
const ONLY_TEST_QUESTIONS = false;
// Only validate questions from these exam ids. [] = all exams.
// 3 = NEET UG, 5 = JEE Main. (4 = Class 10, 8 = Class 9 foundation - skipped)
const ONLY_EXAMS = [3, 5];
// Skip questions whose subject name matches any of these (case-insensitive).
// Leave [] to validate everything.
const SKIP_SUBJECTS = ["Biology", "Botany", "Zoology"];
const MAX_TOKENS = 2500;

const APPLY_TEXT_FIXES = true; // write fixed question/solution/option LaTeX
const APPLY_ANSWER_CHANGES = false; // never auto-flip correct option; only flag

/* ---------------------------------------------------------- */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const { Pool } = pg;

// Supabase uses a self-signed cert chain. Strip any sslmode in the URL (it would
// override our ssl object and demand full verification), then disable rejection.
const rawConn = process.env.SUPABASE_URL || "";
const connectionString = rawConn
  .replace(/[?&]sslmode=[^&]*/i, "")
  .replace(/[?&]uselibpqcompat=[^&]*/i, "");

const pool = new Pool({
  connectionString,
  ssl: { require: true, rejectUnauthorized: false },
  max: CONCURRENCY + 2,
});

const SYSTEM = `You are an expert NEET/JEE question checker and LaTeX corrector.
You verify the marked correct answer, the solution quality, and all LaTeX.

LaTeX CONVENTION (MANDATORY - this exact style):
- All math/formulas wrapped in single dollars: $x^2$, $\\frac{1}{2}mv^2$, $10^{-3}$
- Chemical formulas use subscripts in math: $H_2O$, $CO_2$, $K_2Cr_2O_7$, $NH_3$
- Ions: $Ca^{2+}$, $OH^-$, $Cl^-$
- Units inside math with \\text: $9.8\\,\\text{m/s}^2$, $5.6\\,\\text{g}$
- Arrows: \\rightarrow (NEVER a Unicode arrow), equilibrium \\rightleftharpoons
- NEVER use \\ce{} (mhchem). Vanilla LaTeX only.
- Plain descriptive prose stays plain (not inside dollars).

SOLUTION RULES:
- Be as CONCISE as the problem allows. Simple one-step questions get 2-3 lines.
  Multi-step JEE problems (integration, mechanics, etc.) can be longer - use as
  many steps as the maths genuinely needs, but no filler.
- Each formula in $...$. Each step on its own line, separated by a blank line
  (two \\n). Do not run steps together in one paragraph.
- Go straight to the correct method. Do NOT show alternative interpretations,
  do NOT reconsider or second-guess. NEVER use words like "Hmm", "Wait",
  "Actually", "On reflection", "let me reconsider", "However", "But".
- Do NOT use \\boxed. Do NOT restate the question. No filler sentences.
- Define every symbol; never reuse one letter for two meanings.
- MUST end with a line "Answer: X" where X is the correct option letter or integer.
- If the solution is missing, too short, or wrong, write a correct one.

CHECK ALL OF:
1. answerCorrect: solve the question yourself. Set true if the option tagged
   "<-- marked correct" matches your solved answer; false ONLY if you are
   confident the marked option is wrong. Never set false for formatting issues.
2. correctLabel: the label (A/B/C/D) or integer of YOUR solved answer. If the
   marked option is correct, correctLabel MUST equal the marked label.
3. solution: corrected/complete solution in the exact format above.
   - Your final computed answer MUST exactly equal one of the given options.
   - If your computed value does NOT match any option, do NOT fudge it or say
     "closest to". Instead set "uncertain": true and explain briefly in issues.
   - If you cannot solve the problem confidently, set "uncertain": true and do
     NOT invent a solution. Never write "wait", "let me reconsider", or show
     failed attempts. A short honest flag is better than a wrong solution.
4. uncertain: true if you are not fully confident in the answer/solution, or
   your result does not match any option. Otherwise false.
5. questionTextFixed: ONLY the corrected question text with fixed LaTeX, or null
   if no change. NEVER put commentary, complaints, or notes here. NEVER write
   things like "the question is ambiguous" or "it should ask". If the question
   is flawed, leave questionTextFixed null and explain in "issues" instead.
   This field must always be a valid exam question or null - nothing else.
6. optionsFixed: ONLY the options that needed fixing (empty array if none). Do
   not repeat unchanged option text - this wastes tokens.
7. duplicateOptions: true if any two options have identical text
8. issues: short list of what was wrong

Respond with ONLY the JSON object. Start your response immediately with the
opening brace. Do NOT write any explanation, reasoning, or prose before the JSON.
CRITICAL JSON RULES: escape every backslash as \\\\ and every newline inside a
string as \\n. Do not put real line breaks inside JSON string values. Keep
LaTeX backslashes properly escaped (e.g. \\\\frac, \\\\text).`;

function buildPrompt(q, options) {
  const optLines = options
    .map(
      (o) =>
        `${o.label}. ${o.option_text}${o.is_correct ? "   <-- marked correct" : ""}`,
    )
    .join("\n");
  return `QUESTION (id ${q.id}, type ${q.question_type || "MCQ"}):
${q.question_text}

OPTIONS:
${optLines}

CURRENT SOLUTION:
${q.solution_text || "(empty)"}

Validate everything. Solve the question yourself to verify the marked answer.
Return JSON:
{
  "answerCorrect": true,
  "correctLabel": "A",
  "solution": "step ...\\n\\nAnswer: X",
  "questionTextFixed": "...",
  "optionsFixed": [{"label":"A","optionText":"..."}],
  "duplicateOptions": false,
  "issues": ["..."]
}`;
}

const stripFences = (t) => t.replace(/```json|```/g, "").trim();

// Robustly extract and parse the JSON object from a model response that may
// include prose (with LaTeX braces) before/after, or raw newlines in strings.
function tryParse(raw) {
  const t = stripFences(raw);

  // candidate start positions: every '{' that is followed by a quoted key
  const candidates = [];
  const keyPattern = /\{\s*"/g;
  let m;
  while ((m = keyPattern.exec(t)) !== null) candidates.push(m.index);
  if (candidates.length === 0) {
    const i = t.indexOf("{");
    if (i !== -1) candidates.push(i);
  }

  const end = t.lastIndexOf("}");
  if (end === -1) {
    // truncated response (no closing brace) - try to salvage completed fields
    return salvageTruncated(t);
  }

  for (const start of candidates) {
    if (end < start) continue;
    const block = t.slice(start, end + 1);
    try {
      return JSON.parse(block);
    } catch {}
    const fixed = escapeNewlinesInStrings(block);
    try {
      return JSON.parse(fixed);
    } catch {}
  }
  // all attempts failed - last resort salvage
  return salvageTruncated(t);
}

// When the JSON is cut off mid-string, pull out the fields that DID complete
// using targeted regexes. Returns a partial object or null.
function salvageTruncated(t) {
  const obj = {};
  const bool = (k) => {
    const m = t.match(new RegExp(`"${k}"\\s*:\\s*(true|false)`));
    if (m) obj[k] = m[1] === "true";
  };
  const str = (k) => {
    const m = t.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (m)
      obj[k] = m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
  };
  bool("answerCorrect");
  bool("uncertain");
  bool("duplicateOptions");
  str("correctLabel");
  str("solution");
  // if the solution itself was cut off (no Answer: line), treat as uncertain
  if (obj.solution && !/answer\s*:/i.test(obj.solution)) {
    obj.solution = null;
    obj.uncertain = true;
  }
  // need at least something useful
  if (Object.keys(obj).length === 0) return null;
  if (!("issues" in obj)) obj.issues = ["recovered from truncated response"];
  obj.uncertain = obj.uncertain || true;
  return obj;
}

// escape raw newlines/tabs ONLY inside JSON string values
function escapeNewlinesInStrings(block) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of block) {
    if (inStr) {
      if (esc) {
        out += ch;
        esc = false;
      } else if (ch === "\\") {
        out += ch;
        esc = true;
      } else if (ch === '"') {
        out += ch;
        inStr = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        // drop
      } else if (ch === "\t") {
        out += " ";
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out;
}

async function getOptions(qid) {
  const { rows } = await pool.query(
    "select * from question_options where question_id = $1 order by order_index asc",
    [qid],
  );
  return rows;
}

function makeClean(qtext, options, parsed) {
  const opts = Array.isArray(parsed.optionsFixed)
    ? parsed.optionsFixed.map((o) => o.optionText)
    : options.map((o) => o.option_text);
  return (qtext + " " + opts.join(" "))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function validateOne(q) {
  const options = await getOptions(q.id);

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(q, options) }],
  });

  const raw = resp.content?.[0]?.text || "";
  let parsed = tryParse(raw);
  if (!parsed) {
    console.error(`  id ${q.id} PARSE FAIL`);
    console.error("  raw start:", raw.slice(0, 200));
    return { id: q.id, status: "error", usage: resp.usage };
  }

  // SAFETY: protect the original question text. The model must NOT rewrite,
  // re-interpret, or comment on the question. We only allow small LaTeX-level
  // corrections. Anything that changes the question substantially is rejected.
  if (parsed.questionTextFixed) {
    const orig = q.question_text || "";
    const fixed = parsed.questionTextFixed;
    const qf = fixed.toLowerCase();

    // hard reject: any commentary/meta phrasing
    const commentaryPhrases = [
      "the question",
      "it should",
      "ambiguous",
      "incomplete",
      "should be revised",
      "should clarify",
      "should specify",
      "answer:",
      "unclear",
      "vague",
      "this asks",
      "appears to",
    ];
    const hasCommentary = commentaryPhrases.some((ph) => qf.includes(ph));

    // similarity check: the fixed text must be close to the original in length
    // and share most words. Big changes = rewrite = reject.
    const lenRatio = fixed.length / Math.max(orig.length, 1);
    const origWords = new Set(
      orig
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter(Boolean),
    );
    const fixedWords = fixed
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const shared = fixedWords.filter((w) => origWords.has(w)).length;
    const overlap = origWords.size ? shared / origWords.size : 1;

    const tooDifferent = lenRatio > 1.6 || lenRatio < 0.5 || overlap < 0.6;

    if (hasCommentary || tooDifferent) {
      parsed.questionTextFixed = null; // keep the original question untouched
      if (Array.isArray(parsed.issues))
        parsed.issues.push(
          "questionTextFixed rejected (would alter the question)",
        );
    }
  }

  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
  const answerWrong = parsed.answerCorrect === false;
  let uncertain = parsed.uncertain === true;

  // SAFETY: reject solutions that contain meta-commentary instead of a real
  // solution. This happens when the model cannot solve (e.g. graph/image
  // questions) and rambles its confusion into the solution field.
  if (parsed.solution) {
    const sl = parsed.solution.toLowerCase();
    const badPhrases = [
      "i cannot",
      "cannot verify",
      "without seeing",
      "this suggests",
      "the marked answer",
      "the provided solution",
      "appears to be",
      "the question likely",
      "not among the options",
      "i am unable",
      "based on the marked",
      "the solution text does not",
      "however, the marked",
    ];
    if (badPhrases.some((p) => sl.includes(p))) {
      parsed.solution = null; // do not save commentary as a solution
      uncertain = true;
      issues.push("solution rejected (commentary, not a clean solution)");
    }
  }

  // Image-based questions: the model only sees text, so it cannot reliably
  // solve questions that depend on a diagram/graph. Flag, do not rewrite.
  const hasImage =
    (q.question_image_url && q.question_image_url.trim() !== "") || false;
  if (hasImage) {
    parsed.solution = null; // keep existing solution; don't let text-only AI guess
    parsed.questionTextFixed = null;
    uncertain = true;
    issues.unshift(
      "HAS IMAGE - skipped (text-only AI cannot read the diagram)",
    );
  }

  if (answerWrong)
    issues.unshift(`ANSWER may be wrong - should be ${parsed.correctLabel}`);
  if (uncertain) issues.unshift("UNCERTAIN - needs review");
  if (parsed.duplicateOptions) issues.push("Duplicate option text");
  const status = answerWrong
    ? "answer_flag"
    : uncertain
      ? "uncertain"
      : issues.length
        ? "fixed"
        : "ok";

  /* ---------- DRY RUN: print only ---------- */
  if (DRY_RUN) {
    console.log("\n======================================================");
    console.log(`Q ${q.id}  [${status}]`);
    console.log("issues:", issues.length ? issues.join(" | ") : "none");
    if (
      parsed.questionTextFixed &&
      parsed.questionTextFixed !== q.question_text
    ) {
      console.log("\n-- question LaTeX changed --");
      console.log("OLD:", q.question_text);
      console.log("NEW:", parsed.questionTextFixed);
    }
    const oldSol = q.solution_text || "(empty)";
    if (parsed.solution && parsed.solution !== oldSol) {
      console.log("\n-- solution rewritten --");
      console.log("OLD:", oldSol.slice(0, 200));
      console.log("NEW:\n" + parsed.solution);
    }
    if (Array.isArray(parsed.optionsFixed)) {
      for (const f of parsed.optionsFixed) {
        const m = options.find((o) => o.label === f.label);
        if (m && f.optionText && f.optionText !== m.option_text) {
          console.log(
            `-- option ${f.label}: "${m.option_text}" -> "${f.optionText}"`,
          );
        }
      }
    }
    if (answerWrong)
      console.log(
        `*** ANSWER FLAG: marked correct differs from AI's ${parsed.correctLabel} ***`,
      );
    return { id: q.id, status, usage: resp.usage };
  }

  /* ---------- REAL RUN: write back ---------- */
  const client = await pool.connect();
  try {
    await client.query("begin");

    const sets = [
      "ai_validated_at = now()",
      "is_ai_validated = true",
      "ai_validation_status = $2",
      "ai_validation_notes = $3",
      "ai_validation_fix = $4",
    ];
    const params = [
      q.id,
      status,
      issues.join(" | ").slice(0, 1000),
      answerWrong ? `suggested correct: ${parsed.correctLabel}` : null,
    ];
    let p = 5;
    if (APPLY_TEXT_FIXES && parsed.questionTextFixed) {
      sets.push(`question_text = $${p++}`);
      params.push(parsed.questionTextFixed);
      sets.push(`question_text_clean = $${p++}`);
      params.push(makeClean(parsed.questionTextFixed, options, parsed));
    }
    if (APPLY_TEXT_FIXES && parsed.solution) {
      sets.push(`solution_text = $${p++}`);
      params.push(parsed.solution);
    }

    await client.query(
      `update questions set ${sets.join(", ")} where id = $1`,
      params,
    );

    if (APPLY_TEXT_FIXES && Array.isArray(parsed.optionsFixed)) {
      for (const f of parsed.optionsFixed) {
        const m = options.find((o) => o.label === f.label);
        if (m && f.optionText && f.optionText !== m.option_text) {
          await client.query(
            "update question_options set option_text = $1 where id = $2",
            [f.optionText, m.id],
          );
        }
      }
    }

    if (APPLY_ANSWER_CHANGES && answerWrong && parsed.correctLabel) {
      for (const o of options) {
        await client.query(
          "update question_options set is_correct = $1 where id = $2",
          [o.label === parsed.correctLabel, o.id],
        );
      }
    }

    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return { id: q.id, status, usage: resp.usage };
}

async function runBatch(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const slice = rows.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(slice.map((q) => validateOne(q)));
    settled.forEach((s, idx) => {
      if (s.status === "fulfilled") out.push(s.value);
      else {
        const id = slice[idx].id;
        out.push({ id, status: "error" });
        console.error(`  id ${id} ERROR: ${s.reason?.message}`);
      }
    });
  }
  return out;
}

async function fetchRows(limit) {
  const where = ["questions.is_active = true"];
  const params = [];
  let p = 1;
  if (START_ID > 0) {
    where.push(`questions.id >= $${p++}`);
    params.push(START_ID);
  }
  if (REDO_FLAGGED)
    where.push("questions.ai_validation_status = 'answer_flag'");
  else if (!DRY_RUN) where.push("questions.ai_validated_at is null");

  if (SKIP_SUBJECTS.length > 0) {
    where.push(
      `not exists (select 1 from subjects s where s.id = questions.subject_id and lower(s.name) = any($${p++}))`,
    );
    params.push(SKIP_SUBJECTS.map((n) => n.toLowerCase()));
  }
  if (ONLY_EXAMS.length > 0) {
    where.push(`questions.exam_id = any($${p++})`);
    params.push(ONLY_EXAMS);
  }
  if (ONLY_TEST_QUESTIONS) {
    where.push(
      "exists (select 1 from test_questions tq where tq.question_id = questions.id)",
    );
  }

  params.push(limit);
  const orderBy = PRIORITIZE_TEST_QUESTIONS
    ? `order by (exists (select 1 from test_questions tq where tq.question_id = questions.id)) desc, questions.id asc`
    : `order by questions.id asc`;
  const { rows } = await pool.query(
    `select questions.* from questions where ${where.join(" and ")} ${orderBy} limit $${p}`,
    params,
  );
  return rows;
}

async function main() {
  console.log(
    `MODE: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (writing to DB)"} | model ${MODEL} | limit ${TEST_LIMIT || "ALL"} | start id ${START_ID}`,
  );

  let processed = 0,
    flagged = 0,
    errors = 0,
    tin = 0,
    tout = 0;
  const start = Date.now();

  try {
    if (TEST_LIMIT > 0) {
      const rows = (await fetchRows(TEST_LIMIT)).slice(0, TEST_LIMIT);
      const res = await runBatch(rows);
      for (const r of res) {
        processed++;
        if (r.status === "answer_flag") flagged++;
        if (r.status === "error") errors++;
        if (r.usage) {
          tin += r.usage.input_tokens || 0;
          tout += r.usage.output_tokens || 0;
        }
      }
    } else {
      while (true) {
        const rows = await fetchRows(BATCH_SIZE);
        if (rows.length === 0) {
          console.log("\nDone - no more rows.");
          break;
        }
        const res = await runBatch(rows);
        for (const r of res) {
          processed++;
          if (r.status === "answer_flag") flagged++;
          if (r.status === "error") errors++;
          if (r.usage) {
            tin += r.usage.input_tokens || 0;
            tout += r.usage.output_tokens || 0;
          }
        }
        const mins = ((Date.now() - start) / 60000).toFixed(1);
        console.log(
          `Processed ${processed} | flags ${flagged} | errors ${errors} | tok in ${tin} out ${tout} | ${mins}m`,
        );
      }
    }
  } finally {
    await pool.end();
  }

  const isHaiku = MODEL.includes("haiku");
  const cost = isHaiku
    ? (tin / 1e6) * 1 + (tout / 1e6) * 5
    : (tin / 1e6) * 3 + (tout / 1e6) * 15;
  console.log(`\n--- summary ---`);
  console.log(
    `processed ${processed} | answer-flags ${flagged} | errors ${errors}`,
  );
  console.log(`approx cost this run: $${cost.toFixed(3)}`);
  if (DRY_RUN)
    console.log(`\nDRY RUN - nothing written. Set DRY_RUN=false to apply.`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";
import { logApiUsage, isSystemSuspended } from "@/lib/billing";

// ── Auto-fix common LaTeX mistakes ────────────────────────────────────────────
function autoFixLatex(text) {
  if (!text) return text;
  let r = text;
  // Only safe pattern fixes - do NOT touch backslashes (breaks \rightarrow etc)
  // Fix unicode times/div inside math blocks
  r = r.replace(
    /\$([^$]*?)×([^$]*?)\$/g,
    (_, b, a) => "$" + b + "\\times" + a + "$",
  );
  r = r.replace(
    /\$([^$]*?)÷([^$]*?)\$/g,
    (_, b, a) => "$" + b + "\\div" + a + "$",
  );
  return r;
}

function fixLatexInSuggestedFix(fix) {
  if (!fix) return fix;
  const r = { ...fix };
  if (r.questionText) r.questionText = autoFixLatex(r.questionText);
  if (r.solutionText) r.solutionText = autoFixLatex(r.solutionText);
  if (r.optionChanges?.length > 0) {
    r.optionChanges = r.optionChanges.map((c) => ({
      ...c,
      newText: c.newText ? autoFixLatex(c.newText) : c.newText,
    }));
  }
  return r;
}

// ── LaTeX checker ─────────────────────────────────────────────────────────────
function checkLatex(text) {
  if (!text) return [];
  const issues = [];
  const dollars = (text.match(/\$/g) || []).length;
  if (dollars % 2 !== 0) issues.push("Unclosed $ delimiter");
  if (/\\text\{[^}]*\\cdot[^}]*\}/.test(text))
    issues.push("\\cdot inside \\text{}");
  if (/\\text\{[^}]*\\times[^}]*\}/.test(text))
    issues.push("\\times inside \\text{}");
  if (/\\text\{[^}]*\^[^}]*\}/.test(text)) issues.push("^ inside \\text{}");
  if (/\\text\{[^}]*_[^}]*\}/.test(text)) issues.push("_ inside \\text{}");
  if (/\\\\[a-zA-Z]/.test(text)) issues.push("Double backslash \\\\command");
  if (/<span|<div|&lt;span/.test(text)) issues.push("HTML tags in text");
  if (/[×÷≠≤≥±∞∑∫√π°]/.test(text)) {
    const s = text.match(/[×÷≠≤≥±∞∑∫√π°]/g);
    issues.push(`Unicode math: ${[...new Set(s)].join(" ")}`);
  }
  if (/\\frac\s+\d/.test(text)) issues.push("\\frac without braces");
  if (/\$\s*\$/.test(text)) issues.push("Empty math block");
  return issues;
}

function checkAllLatex(question, options) {
  const all = [];
  checkLatex(question.questionText).forEach((i) => all.push(`Q: ${i}`));
  options.forEach((o) =>
    checkLatex(o.optionText).forEach((i) => all.push(`Opt ${o.label}: ${i}`)),
  );
  checkLatex(question.solutionText).forEach((i) => all.push(`Sol: ${i}`));
  return all;
}

async function autoFixQuestionLatex(q) {
  const updates = {};
  const optionUpdates = [];
  const fixed = autoFixLatex(q.questionText);
  if (fixed !== q.questionText) updates.questionText = fixed;
  const fixedSol = autoFixLatex(q.solutionText);
  if (fixedSol !== q.solutionText) updates.solutionText = fixedSol;
  for (const opt of q.options) {
    const fixedOpt = autoFixLatex(opt.optionText);
    if (fixedOpt !== opt.optionText)
      optionUpdates.push({ id: opt.id, optionText: fixedOpt });
  }
  const remainingIssues = checkAllLatex(
    {
      questionText: updates.questionText || q.questionText,
      solutionText: updates.solutionText || q.solutionText,
    },
    q.options.map((o) => {
      const u = optionUpdates.find((x) => x.id === o.id);
      return u ? { ...o, optionText: u.optionText } : o;
    }),
  );
  return { updates, optionUpdates, remainingIssues };
}

// ── SYSTEM PROMPT (cached by Anthropic - free on repeated calls) ──────────────
const SYSTEM_PROMPT = `You are a NEET/JEE question validator for Indian competitive exams.

JUDGE AT NEET/JEE LEVEL ONLY. These are standard coaching/board level questions, NOT research or PhD level. Do not nitpick exact textbook values, edge cases, or university-level precision. If the answer is what a NEET/JEE textbook and coaching institute would accept as correct, it is correct.

BE DECISIVE. Give a clear verdict. Never contradict yourself (do not say the answer is wrong and then say it is correct). One short reason only.

When genuinely unsure at this level, LEAN PASS - trust the question. Only FAIL for a clear, definite error a NEET/JEE teacher would agree is wrong.

You check questions for:
1. Content correctness (right answer at NEET/JEE level)
2. LaTeX validity (proper syntax that renders correctly in KaTeX)
3. Solution quality (clear enough for a student to understand)

General LaTeX rules:
- ALL math must be in $...$ or $$...$$ delimiters
- Never \\cdot or \\times inside \\text{}: use \\text{N}\\cdot\\text{m}
- Never ^ or _ inside \\text{}: use \\text{m}^2 not \\text{m^2}
- No Unicode math symbols (×÷≠≤≥→⇌) - use LaTeX commands
- \\frac must have braces: \\frac{a}{b}

Chemistry LaTeX rules:
- Chemical equations MUST be in $...$: $Ca(OH)_2 + Cl_2 \\rightarrow CaOCl_2 + H_2O$
- Chemical formulas with subscripts: $H_2SO_4$, $Ca(OH)_2$, $CO_2$, $NH_3$
- Arrow in equations: \\rightarrow (not → Unicode)
- Equilibrium arrow: \\rightleftharpoons
- Ion charges: $Ca^{2+}$, $OH^-$, $Cl^-$, $NH_4^+$
- Plain descriptive text outside equations is fine: "Bleaching powder is formed by:"
- Kb, Ka values: $K_b = 1.8 \\times 10^{-5}$

Physics/Math LaTeX rules:
- Variables and values: $W_{net} = 100$ J, $v = 20$ m/s
- Fractions: $\\frac{1}{2}mv^2$
- Powers: $10^{-3}$, $x^2$

Always respond with valid JSON only. No markdown, no extra text.`;

// ── Pass check prompt (minimal tokens) ───────────────────────────────────────
function buildPassCheckPrompt(question, options, correctOption, solutionText) {
  const opts = options
    .map((o) => `${o.label}. ${o.optionText}${o.isCorrect ? " [CORRECT]" : ""}`)
    .join("\n");

  return `Validate this ${question.subject?.name || "science"} question for NEET/JEE.

QUESTION: ${question.questionText}

OPTIONS:
${opts}

MARKED CORRECT: ${correctOption?.label || "none"}

SOLUTION: ${solutionText || "none"}

Judge everything at NEET/JEE level only. Do NOT nitpick exact textbook values or university-level edge cases. Be decisive and never contradict yourself.

Check:
1. Is the marked correct answer right at NEET/JEE level? (what a coaching institute / NCERT would accept)
2. Is the solution accurate at this level?
3. LaTeX check - flag ALL of these as latexIssues:
   - Plain text chemical formulas: H2SO4, CaCO3, CO2, NO2 -> should be $H_2SO_4$, $CaCO_3$
   - Plain text chemical equations: CaCO3+H2SO4->CaSO4 -> should be $CaCO_3+H_2SO_4\\rightarrow CaSO_4$
   - Unicode arrows in equations: -> or = not inside $...$ -> should use \\rightarrow or \\rightleftharpoons
   - Plain math expressions: pH < 5.6, v = 20 m/s -> should be $pH < 5.6$, $v = 20$ m/s
   - Missing $ delimiters on any math variable or formula
   - Broken LaTeX commands inside wrong contexts
4. Is the question clear and complete?
5. SOLUTION QUALITY - flag as a content issue if the solution is weak:
   - Missing entirely (no solution provided)
   - Too short: only states the final answer with no working or reasoning (e.g. just "Answer: B")
   - Does not explain the steps, formula, or concept needed to reach the answer
   - A NEET/JEE student reading it could NOT understand WHY the answer is correct
   A good solution explains the reasoning or steps, not just the final answer.
   If the solution is weak, add an entry to "issues" that STARTS WITH "Solution: " and
   describes what is missing (e.g. "Solution: too short, only states the answer with no steps").

Respond with JSON only:
{
  "status": "pass",
  "issues": [],
  "latexIssues": [],
  "summary": ""
}

status rules (judge at NEET/JEE level, lean pass when unsure):
- "pass" = answer is correct at NEET/JEE level (and solution is acceptable). Use this whenever the answer is right, even if you are slightly unsure - trust the question.
- "fail" = a CLEAR, definite error a NEET/JEE teacher would agree on (wrong answer, broken/incomplete question). Do not fail over minor textbook-value precision.
- "uncertain" = ONLY when the answer is correct but the solution is missing or too short to understand. Do not use uncertain for content you are merely unsure about - lean pass instead.
- NEVER contradict yourself. Pick one verdict.
issues: list of content problems (wrong answer, bad solution, incomplete question, weak solution starting with "Solution: ")
latexIssues: list of LaTeX syntax problems (missing $, wrong commands, bare chemical equations)
summary: one sentence, empty string if pass`;
}

// ── Fix generation prompt (only for fail/uncertain) ───────────────────────────
function buildFixPrompt(
  question,
  options,
  correctOption,
  solutionText,
  issues,
  latexIssues,
) {
  const opts = options
    .map((o) => `${o.label}. ${o.optionText}${o.isCorrect ? " [CORRECT]" : ""}`)
    .join("\n");
  const allIssues = [...issues, ...latexIssues].join("\n- ");

  return `You must fix a ${question.subject?.name || "science"} NEET/JEE question. Issues:
- ${allIssues}

QUESTION: ${question.questionText}

OPTIONS:
${opts}

CORRECT: ${correctOption?.label || "none"}

SOLUTION: ${solutionText || "none"}

=== MANDATORY LATEX TRANSFORMATION RULES ===

Every chemical formula and equation MUST be wrapped in $...$. This is not optional.

TRANSFORMATION EXAMPLES - follow these exactly:

Plain text → LaTeX (REQUIRED):
  Ca(OH)2  →  $Ca(OH)_2$
  H2SO4    →  $H_2SO_4$
  CaCO3    →  $CaCO_3$
  CO2      →  $CO_2$
  Cl2      →  $Cl_2$
  NOx      →  $NO_x$
  SO2      →  $SO_2$
  CaOCl2   →  $CaOCl_2$

Equations with plain arrow → LaTeX (REQUIRED):
  Ca(OH)2+Cl2→CaOCl2+H2O
  becomes:
  $Ca(OH)_2 + Cl_2 \\rightarrow CaOCl_2 + H_2O$

  CaOCl2+H2SO4→CaSO4+Cl2+H2O
  becomes:
  $CaOCl_2 + H_2SO_4 \\rightarrow CaSO_4 + Cl_2 + H_2O$

  CaCO3+H2SO4→CaSO4+CO2+H2O
  becomes:
  $CaCO_3 + H_2SO_4 \\rightarrow CaSO_4 + CO_2 + H_2O$

Math values → LaTeX (REQUIRED):
  pH < 5.6  →  $pH < 5.6$
  Kb = 1.8x10-5  →  $K_b = 1.8 \\times 10^{-5}$
  v = 20 m/s  →  $v = 20$ m/s

Rules:
- Arrow in equations: \\rightarrow (never Unicode →)
- Equilibrium: \\rightleftharpoons (never ⇌)
- Ion charges: $Ca^{2+}$, $OH^-$, $Cl^-$
- Descriptive text stays plain: "Uses: (1) Bleaching cotton" is fine as-is
- Only wrap the formula/equation itself in $, not the surrounding words

=== SOLUTION QUALITY ===
If the issues mention a weak or short solution (any issue starting with "Solution:"),
REWRITE solutionText into a clear, complete, step-by-step explanation a NEET/JEE
student can follow. It must:
- State the concept or formula used
- Show the working/steps that lead to the answer
- End by stating which option is correct and why
- Use proper LaTeX for all math/chemistry as per the rules above
Do not just restate the final answer - explain the reasoning.

Provide ONLY the fields that changed. null = no change needed.
Return valid JSON:
{
  "questionText": null,
  "solutionText": null,
  "correctOptionLabel": null,
  "optionChanges": []
}`;
}

// ── Single Claude API call ────────────────────────────────────────────────────
async function callAI(
  userPrompt,
  maxTokens = 600,
  model = "claude-haiku-4-5-20251001",
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(data.error?.message || "API error");
  if (data.usage) {
    const route = model.includes("haiku") ? "validate-check" : "validate-fix";
    logApiUsage({
      route,
      model,
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
    }).catch(() => {});
  }

  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    const truncated = clean.endsWith("}") ? clean : clean + '"}';
    try {
      return JSON.parse(truncated);
    } catch {
      const statusMatch = clean.match(/"status"\s*:\s*"(pass|fail|uncertain)"/);
      const summaryMatch = clean.match(/"summary"\s*:\s*"([^"]{0,200})"/);
      return {
        status: statusMatch?.[1] || "uncertain",
        issues: ["Response truncated - question may be too long"],
        latexIssues: [],
        summary: summaryMatch?.[1] || "AI response was cut off",
      };
    }
  }
}

// Alias for backward compat
const callClaude = callAI;

// ── POST /api/questions/validate ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const batchSize = Math.min(body.batchSize || 20, 50);
    const startFromId = body.startFromId || 1;
    const examId = body.examId || null;

    const where = {
      isAiValidated: false,
      isActive: true,
      id: { gte: startFromId },
    };
    if (examId) where.examId = parseInt(examId);

    const questions = await prisma.question.findMany({
      where,
      take: batchSize,
      orderBy: { id: "asc" },
      include: {
        options: { orderBy: { orderIndex: "asc" } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        exam: { select: { id: true, name: true } },
      },
    });

    if (questions.length === 0) {
      return successResponse({ processed: 0, results: [], done: true });
    }

    const results = [];

    for (const q of questions) {
      const correctOption = q.options.find((o) => o.isCorrect);

      // ── Step 1: Regex LaTeX auto-fix (free, no API) ───────────────────────
      const latexIssuesBefore = checkAllLatex(q, q.options);
      let autoFixApplied = false;

      if (latexIssuesBefore.length > 0) {
        const { updates, optionUpdates, remainingIssues } =
          await autoFixQuestionLatex(q);

        if (Object.keys(updates).length > 0 || optionUpdates.length > 0) {
          if (Object.keys(updates).length > 0) {
            await prisma.question.update({
              where: { id: q.id },
              data: updates,
            });
            if (updates.questionText) q.questionText = updates.questionText;
            if (updates.solutionText) q.solutionText = updates.solutionText;
          }
          for (const ou of optionUpdates) {
            await prisma.questionOption.update({
              where: { id: ou.id },
              data: { optionText: ou.optionText },
            });
            const opt = q.options.find((o) => o.id === ou.id);
            if (opt) opt.optionText = ou.optionText;
          }
          autoFixApplied = true;
        }

        // NOTE: We no longer "skip AI entirely" when LaTeX is auto-fixed,
        // because the AI also judges SOLUTION QUALITY now. Even a question with
        // clean LaTeX may have a weak/short solution that needs flagging.
        // (If you want to keep API costs minimal and NOT check solution quality
        // on auto-fixed-clean questions, restore the old early-continue here.)
      }

      // ── Step 2: AI pass check (~600 tokens output - enough for long questions) ──
      let aiStatus = "uncertain";
      let aiIssues = [];
      let aiLatexIssues = [];
      let aiSummary = "";
      let suggestedFix = null;

      try {
        const passResult = await callClaude(
          buildPassCheckPrompt(q, q.options, correctOption, q.solutionText),
          600,
        );

        aiStatus = passResult.status || "uncertain";
        aiIssues = passResult.issues || [];
        aiLatexIssues = passResult.latexIssues || [];
        aiSummary = passResult.summary || "";

        // ── Step 3: Fix generation only for fail/uncertain ────────────────
        // Passing questions: 1 API call total
        // Failing/weak-solution questions: 2 API calls total
        if (
          aiStatus !== "pass" &&
          (aiIssues.length > 0 || aiLatexIssues.length > 0)
        ) {
          try {
            // Using Haiku for fix generation too (cost saving). Haiku is weaker at
            // strict LaTeX formatting than Sonnet, so review fixes before applying.
            const fixResult = await callAI(
              buildFixPrompt(
                q,
                q.options,
                correctOption,
                q.solutionText,
                aiIssues,
                aiLatexIssues,
              ),
              1500,
              "claude-haiku-4-5-20251001",
            );
            suggestedFix = fixLatexInSuggestedFix(fixResult);
          } catch {
            // Fix failed - still save status without fix
          }
        }
      } catch (err) {
        aiStatus = "uncertain";
        aiSummary = `AI check failed: ${err.message}`;
      }

      // ── Step 4: Combine and save ──────────────────────────────────────────
      const remainingLatexIssues = checkAllLatex(q, q.options);
      const stillHasLatex = remainingLatexIssues.length > 0;

      let finalStatus = aiStatus;
      if (stillHasLatex && aiStatus === "pass") finalStatus = "uncertain";

      const notesParts = [];
      if (aiSummary) notesParts.push(aiSummary);
      aiIssues.forEach((i) => notesParts.push(i));
      aiLatexIssues.forEach((i) => notesParts.push(`AI-LaTeX: ${i}`));
      if (autoFixApplied) notesParts.push("LaTeX partially auto-fixed");
      if (stillHasLatex)
        remainingLatexIssues.forEach((i) => notesParts.push(`LaTeX: ${i}`));

      await prisma.question.update({
        where: { id: q.id },
        data: {
          isAiValidated: true,
          aiValidationStatus: finalStatus,
          aiValidationNotes: notesParts.join(" | ") || null,
          aiValidationFix: suggestedFix ? JSON.stringify(suggestedFix) : null,
          aiValidatedAt: new Date(),
        },
      });

      results.push({
        id: q.id,
        status: finalStatus,
        aiStatus,
        latexIssues: remainingLatexIssues,
        hasLatexIssues: stillHasLatex,
        autoFixed: autoFixApplied,
        issues: [...aiIssues, ...aiLatexIssues, ...remainingLatexIssues],
        summary: aiSummary,
        chapter: q.chapter?.name,
        subject: q.subject?.name,
        exam: q.exam?.name,
      });
    }

    const lastId = questions[questions.length - 1].id;
    const nextQuestion = await prisma.question.findFirst({
      where: { ...where, id: { gt: lastId }, isAiValidated: false },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    return successResponse({
      processed: results.length,
      results,
      nextStartId: nextQuestion?.id || null,
      done: !nextQuestion,
    });
  } catch (error) {
    console.error("Validation batch error:", error);
    return errorResponse("Validation failed", 500);
  }
}

// ── GET /api/questions/validate ───────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    const where = examId ? { examId: parseInt(examId) } : {};

    const [total, validated, pass, fail, uncertain, notValidated, latexCount] =
      await Promise.all([
        prisma.question.count({ where }),
        prisma.question.count({ where: { ...where, isAiValidated: true } }),
        prisma.question.count({
          where: { ...where, aiValidationStatus: "pass" },
        }),
        prisma.question.count({
          where: { ...where, aiValidationStatus: "fail" },
        }),
        prisma.question.count({
          where: { ...where, aiValidationStatus: "uncertain" },
        }),
        prisma.question.count({ where: { ...where, isAiValidated: false } }),
        prisma.question.count({
          where: {
            ...where,
            isAiValidated: true,
            aiValidationNotes: { contains: "LaTeX:" },
          },
        }),
      ]);

    const nextQuestion = await prisma.question.findFirst({
      where: { ...where, isAiValidated: false },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    return successResponse({
      total,
      validated,
      pass,
      fail,
      uncertain,
      notValidated,
      latexCount,
      nextStartId: nextQuestion?.id || null,
      done: !nextQuestion,
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch stats", 500);
  }
}

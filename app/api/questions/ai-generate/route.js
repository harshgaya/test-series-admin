import { successResponse, errorResponse } from "@/lib/api";
import { logApiUsage, isSystemSuspended } from "@/lib/billing";

const SYSTEM_PROMPT = `You are an expert NEET/JEE question writer and LaTeX formatter.
You help convert plain text questions into properly formatted exam questions with LaTeX.

LaTeX rules (MANDATORY):
- ALL math in $...$: $x^2 + y^2$, $\frac{a}{b}$, $\sqrt{x}$
- Chemical formulas: $H_2SO_4$, $Ca(OH)_2$, $CO_2$
- Chemical equations: $Ca(OH)_2 + Cl_2 \rightarrow CaOCl_2 + H_2O$
- Arrow: \rightarrow not →, equilibrium: \rightleftharpoons
- Greek letters: $\alpha$, $\beta$, $\theta$, $\phi$, $\omega$
- Degree: $60°$ → $60^\circ$
- Units with math: $9.8$ m/s², $3 \times 10^8$ m/s
- Fractions: $\frac{numerator}{denominator}$
- Subscripts: $H_2O$, $v_0$, $W_{net}$
- Superscripts: $x^2$, $10^{-5}$
- Vectors: $\vec{F}$, $\hat{i}$
- Plain descriptive text stays as plain text

Always respond with valid JSON only. No markdown.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      questionText,
      subject,
      chapter,
      exam,
      hasOptions,
      existingOptions,
    } = body;

    if (!questionText?.trim()) return errorResponse("Question text required");
    if (!process.env.ANTHROPIC_API_KEY)
      return errorResponse("API key not configured");
    if (await isSystemSuspended()) {
      return errorResponse(
        "Service suspended due to overdue payment. Please clear dues in Billing.",
        402,
      );
    }

    const subjectContext = [exam, subject, chapter].filter(Boolean).join(" > ");
    const mode = hasOptions ? "convert" : "generate";

    const prompt =
      mode === "convert"
        ? buildConvertPrompt(questionText, existingOptions, subjectContext)
        : buildGeneratePrompt(questionText, subjectContext);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return errorResponse(data.error?.message || "AI API error", 500);
    }
    if (data.usage) {
      await logApiUsage({
        route: "ai-generate",
        model: "claude-sonnet-4-6",
        inputTokens: data.usage.input_tokens || 0,
        outputTokens: data.usage.output_tokens || 0,
      });
    }

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return errorResponse("Could not parse AI response", 500);
    }

    return successResponse({
      questionText: parsed.questionText,
      options: parsed.options || [],
      solutionText: parsed.solutionText || "",
      difficulty: parsed.difficulty || "MEDIUM",
      mode,
    });
  } catch (error) {
    console.error("AI generate error:", error);
    return errorResponse("AI generation failed: " + error.message, 500);
  }
}

// Convert mode - teacher has written question + options, just convert to LaTeX
function buildConvertPrompt(questionText, existingOptions, context) {
  const optsList = (existingOptions || [])
    .filter((o) => o.optionText?.trim())
    .map((o) => `${o.label}. ${o.optionText}${o.isCorrect ? " [CORRECT]" : ""}`)
    .join("\n");

  return `Convert this ${context} question to proper LaTeX format. Keep the meaning exactly the same, just fix the formatting.

QUESTION: ${questionText}

${optsList ? `OPTIONS:\n${optsList}` : ""}

Convert everything to proper LaTeX. Return JSON:
{
  "questionText": "question with proper $LaTeX$",
  "options": [
    {"label": "A", "optionText": "option with $LaTeX$", "isCorrect": false},
    {"label": "B", "optionText": "option with $LaTeX$", "isCorrect": true},
    {"label": "C", "optionText": "option with $LaTeX$", "isCorrect": false},
    {"label": "D", "optionText": "option with $LaTeX$", "isCorrect": false}
  ],
  "solutionText": "step by step solution with $LaTeX$\\nAnswer: X",
  "difficulty": "EASY|MEDIUM|HARD"
}`;
}

// Generate mode - teacher wrote question stem only, AI generates everything
function buildGeneratePrompt(questionText, context) {
  return `You are writing a ${context} MCQ question for NEET/JEE exam.

Teacher's question (may be rough/incomplete):
"${questionText}"

Tasks:
1. Rewrite the question clearly and completely with proper LaTeX
2. Generate 4 plausible options (A/B/C/D) - mark exactly one correct
3. Make wrong options believable (common mistakes, close values)
4. Write a clear step-by-step solution with LaTeX
5. Assign difficulty based on concept complexity

Return JSON:
{
  "questionText": "complete rewritten question with proper $LaTeX$",
  "options": [
    {"label": "A", "optionText": "$value_or_expression$", "isCorrect": false},
    {"label": "B", "optionText": "$value_or_expression$", "isCorrect": true},
    {"label": "C", "optionText": "$value_or_expression$", "isCorrect": false},
    {"label": "D", "optionText": "$value_or_expression$", "isCorrect": false}
  ],
  "solutionText": "Given: ...\\nStep 1: ...\\nStep 2: ...\\nAnswer: B",
  "difficulty": "EASY|MEDIUM|HARD"
}

Rules:
- Options must be distinct and non-overlapping
- Correct answer should not always be B - vary it
- Solution must justify why correct answer is right and others wrong
- Use NEET/JEE standard notation and conventions`;
}

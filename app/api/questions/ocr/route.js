import { successResponse, errorResponse } from "@/lib/api";
import { logApiUsage, isSystemSuspended } from "@/lib/billing";

const SYSTEM_PROMPT = `You are an expert at extracting NEET/JEE questions from images.
Extract questions exactly as written. Convert ALL math and chemistry to LaTeX.

LaTeX rules (MANDATORY):
- ALL math expressions in $...$: $x^2 + y^2 = r^2$, $\\frac{1}{2}mv^2$
- Chemical formulas: $H_2SO_4$, $Ca(OH)_2$, $CO_2$, $NH_3$
- Chemical equations: $Ca(OH)_2 + Cl_2 \\rightarrow CaOCl_2 + H_2O$
- Arrow in equations: \\rightarrow (never Unicode →)
- Equilibrium: \\rightleftharpoons (never ⇌)
- Ion charges: $Ca^{2+}$, $OH^-$, $Cl^-$, $NH_4^+$
- Units with numbers: $9.8$ m/s², $3 \\times 10^8$ m/s
- Subscripts: $H_2O$, $NH_3$, $SO_2$
- Superscripts: $x^2$, $10^{-5}$
- Fractions: $\\frac{a}{b}$
- Kb/Ka values: $K_b = 1.8 \\times 10^{-5}$
- Descriptive text stays plain: "The compound reacts with:" is fine

Solution formatting rules (IMPORTANT):
- Write solutions as clear step-by-step explanation
- Use \\n for line breaks between steps
- Number steps: "Step 1: ...", "Step 2: ..." for multi-step solutions
- End with: "Answer: X" or "Answer: [option letter]"
- Keep steps concise but complete
- All math in each step must be in $...$

Always respond with valid JSON only.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mediaType = "image/jpeg", hint = "" } = body;

    if (!imageBase64) return errorResponse("Image data required");
    if (!process.env.ANTHROPIC_API_KEY)
      return errorResponse("API key not configured");
    if (await isSystemSuspended()) {
      // ← add
      return errorResponse(
        "Service suspended due to overdue payment. Please clear dues in Billing.",
        402,
      );
    }

    const hintText = hint ? `\nContext hint from teacher: ${hint}` : "";

    const prompt = `Extract the NEET/JEE question(s) from this image.${hintText}

For EACH question found, extract:
- questionText: full question text with proper LaTeX for all math/chemistry
- questionType: "MCQ" | "INTEGER" | "MULTI_CORRECT"
- options: array of {label, optionText, isCorrect} - mark the correct one(s)
- correctAnswer: label of correct option (A/B/C/D) or integer value
- solutionText: full solution with proper formatting (see rules below)
- difficulty: "EASY" | "MEDIUM" | "HARD"
- hasImage: true if question needs a diagram/graph not in the text
- imageNote: describe any diagram briefly if present

SOLUTION FORMAT RULES:
Write solutionText as a well-structured explanation using \\n for line breaks.

Example of good solutionText format:
"Given: $W_{AB} = 300$ J, $W_{BC} = -200$ J\\nStep 1: Apply work-energy theorem for cyclic process.\\nStep 2: Net work = $W_{AB} + W_{BC} = 300 + (-200) = 100$ J\\nAnswer: A"

Example for chemistry:
"Bleaching powder is produced by passing $Cl_2$ gas over dry slaked lime.\\nReaction: $Ca(OH)_2 + Cl_2 \\\\rightarrow CaOCl_2 + H_2O$\\nThe active ingredient is $CaOCl_2$ (calcium hypochlorite).\\nAnswer: B"

Rules for solutionText:
- Use \\n to separate steps and sections
- All formulas, equations, values in $...$
- Start with "Given:" if numerical values are provided
- Show working step by step
- End with "Answer: X" where X is the correct option letter or value
- If no solution visible in image, write a complete solution yourself

JSON format:
{
  "questions": [
    {
      "questionText": "...",
      "questionType": "MCQ",
      "options": [
        {"label": "A", "optionText": "...", "isCorrect": false},
        {"label": "B", "optionText": "...", "isCorrect": true},
        {"label": "C", "optionText": "...", "isCorrect": false},
        {"label": "D", "optionText": "...", "isCorrect": false}
      ],
      "correctAnswer": "B",
      "solutionText": "Step 1: ...\\nStep 2: ...\\nAnswer: B",
      "difficulty": "MEDIUM",
      "hasImage": false,
      "imageNote": ""
    }
  ],
  "totalFound": 1,
  "extractionNotes": "any warnings about image quality or missing content"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return errorResponse(data.error?.message || "Claude API error", 500);
    }
    if (data.usage) {
      // ← add
      await logApiUsage({
        route: "ocr",
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
      return errorResponse(
        "Could not parse AI response - try a clearer image",
        500,
      );
    }

    if (!parsed.questions?.length) {
      return errorResponse("No questions found in image", 400);
    }

    return successResponse({
      questions: parsed.questions,
      totalFound: parsed.totalFound || parsed.questions.length,
      extractionNotes: parsed.extractionNotes || "",
    });
  } catch (error) {
    console.error("OCR error:", error);
    return errorResponse("OCR processing failed: " + error.message, 500);
  }
}

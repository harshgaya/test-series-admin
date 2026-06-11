import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

function autoFixLatex(text) {
  if (!text) return text;
  let r = text;
  // Only safe fixes - do NOT strip backslashes (breaks \rightarrow, \frac etc)
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

// Apply AI fix fields on top of current question, then run autoFixLatex on everything
async function applyAllFixes(qid, fix) {
  const q = await prisma.question.findUnique({
    where: { id: qid },
    include: { options: true },
  });
  if (!q) throw new Error("Question not found");

  // Start with current values, overlay AI fix where provided, then autoFixLatex everything
  const newQuestionText = autoFixLatex(fix?.questionText || q.questionText);
  const newSolutionText = autoFixLatex(fix?.solutionText || q.solutionText);

  const questionUpdates = {};
  if (newQuestionText !== q.questionText)
    questionUpdates.questionText = newQuestionText;
  if (newSolutionText !== q.solutionText)
    questionUpdates.solutionText = newSolutionText;

  await prisma.question.update({
    where: { id: qid },
    data: {
      ...questionUpdates,
      isAiValidated: true,
      aiValidationStatus: "pass",
      aiValidationNotes: "Fixed: AI content + LaTeX auto-fix applied",
      aiValidationFix: null,
      aiValidatedAt: new Date(),
    },
  });

  // Fix options - overlay AI option changes then autoFixLatex
  for (const opt of q.options) {
    const aiChange = fix?.optionChanges?.find((c) => c.label === opt.label);
    const newText = autoFixLatex(aiChange?.newText || opt.optionText);
    if (newText !== opt.optionText) {
      await prisma.questionOption.update({
        where: { id: opt.id },
        data: { optionText: newText },
      });
    }
  }

  // Update correct answer if AI says it changed
  if (fix?.correctOptionLabel) {
    const currentCorrect = q.options.find((o) => o.isCorrect);
    if (currentCorrect?.label !== fix.correctOptionLabel) {
      await prisma.questionOption.updateMany({
        where: { questionId: qid },
        data: { isCorrect: false },
      });
      const newCorrect = q.options.find(
        (o) => o.label === fix.correctOptionLabel,
      );
      if (newCorrect) {
        await prisma.questionOption.update({
          where: { id: newCorrect.id },
          data: { isCorrect: true },
        });
      }
    }
  }
}

// Run the regex autoFixLatex across one question's text + options.
// Returns true if anything actually changed.
async function regexFixOne(q) {
  let changed = false;
  const qUpdates = {};
  const newQ = autoFixLatex(q.questionText);
  const newSol = autoFixLatex(q.solutionText);
  if (newQ !== q.questionText) {
    qUpdates.questionText = newQ;
    changed = true;
  }
  if (newSol !== q.solutionText) {
    qUpdates.solutionText = newSol;
    changed = true;
  }
  if (Object.keys(qUpdates).length > 0) {
    await prisma.question.update({ where: { id: q.id }, data: qUpdates });
  }
  for (const opt of q.options) {
    const newText = autoFixLatex(opt.optionText);
    if (newText !== opt.optionText) {
      await prisma.questionOption.update({
        where: { id: opt.id },
        data: { optionText: newText },
      });
      changed = true;
    }
  }
  return changed;
}

// GET /api/questions/validate/flagged
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "fail";
    const examId = searchParams.get("examId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (examId) where.examId = parseInt(examId);

    // "latex" filter: any validated question whose notes mention a LaTeX issue,
    // regardless of pass/fail/uncertain status.
    if (status === "latex") {
      where.isAiValidated = true;
      where.aiValidationNotes = { contains: "LaTeX:" };
    } else if (status === "all") {
      where.aiValidationStatus = { in: ["fail", "uncertain"] };
      where.isAiValidated = true;
    } else {
      where.aiValidationStatus = status;
      where.isAiValidated = true;
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "asc" },
        include: {
          options: { orderBy: { orderIndex: "asc" } },
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true } },
          exam: { select: { id: true, name: true } },
        },
      }),
      prisma.question.count({ where }),
    ]);

    return successResponse({
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch flagged questions", 500);
  }
}

// PATCH /api/questions/validate/flagged
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { questionId, action, fix } = body;

    // ── BULK: apply AI fix + LaTeX fix to ALL flagged questions ───────────
    if (action === "fixAllFlagged") {
      const examId = body.examId ? parseInt(body.examId) : null;
      const statusFilter = body.status || "all";

      const where = { isAiValidated: true };
      if (examId) where.examId = examId;
      if (statusFilter === "latex") {
        where.aiValidationNotes = { contains: "LaTeX:" };
      } else if (statusFilter === "all") {
        where.aiValidationStatus = { in: ["fail", "uncertain"] };
      } else {
        where.aiValidationStatus = statusFilter;
      }

      const questions = await prisma.question.findMany({
        where,
        select: { id: true, aiValidationFix: true },
        orderBy: { id: "asc" },
        take: 100, // process in chunks of 100 to avoid serverless timeout
      });

      let applied = 0;
      let latexOnly = 0;
      let failed = 0;

      for (const q of questions) {
        try {
          let qFix = null;
          if (q.aiValidationFix) {
            try {
              qFix = JSON.parse(q.aiValidationFix);
            } catch {
              qFix = null;
            }
          }
          // applyAllFixes overlays AI fix (if any) and runs LaTeX auto-fix on everything
          await applyAllFixes(q.id, qFix);
          if (qFix) applied++;
          else latexOnly++;
        } catch {
          failed++;
        }
      }

      return successResponse({
        bulk: true,
        scanned: questions.length,
        appliedAiFix: applied,
        latexOnly,
        failed,
      });
    }

    // ── BULK: fix all LaTeX (regex only, no AI, free) ─────────────────────
    if (action === "fixAllLatex") {
      const examId = body.examId ? parseInt(body.examId) : null;
      const where = {
        isAiValidated: true,
        aiValidationNotes: { contains: "LaTeX:" },
      };
      if (examId) where.examId = examId;

      const questions = await prisma.question.findMany({
        where,
        include: { options: true },
        take: 1000, // safety cap per run
      });

      let fixedCount = 0;
      let unchangedCount = 0;
      for (const q of questions) {
        const changed = await regexFixOne(q);
        if (changed) {
          // Re-mark as pass and clear the LaTeX note since regex handled it
          await prisma.question.update({
            where: { id: q.id },
            data: {
              aiValidationStatus: "pass",
              aiValidationNotes: "LaTeX auto-fixed (bulk)",
              aiValidationFix: null,
              aiValidatedAt: new Date(),
            },
          });
          fixedCount++;
        } else {
          unchangedCount++;
        }
      }

      return successResponse({
        bulk: true,
        scanned: questions.length,
        fixed: fixedCount,
        needsAi: unchangedCount, // these have LaTeX issues regex can't fix (bare formulas, missing $)
      });
    }

    const qid = parseInt(questionId);

    if (action === "reset") {
      await prisma.question.update({
        where: { id: qid },
        data: {
          isAiValidated: false,
          aiValidationStatus: null,
          aiValidationNotes: null,
          aiValidationFix: null,
          aiValidatedAt: null,
        },
      });
      return successResponse({ reset: true });
    }

    if (action === "approve") {
      await prisma.question.update({
        where: { id: qid },
        data: {
          isAiValidated: true,
          aiValidationStatus: "pass",
          aiValidationNotes: "Manually approved by admin",
          aiValidationFix: null,
          aiValidatedAt: new Date(),
        },
      });
      return successResponse({ approved: true });
    }

    if (action === "deactivate") {
      await prisma.question.update({
        where: { id: qid },
        data: { isActive: false },
      });
      return successResponse({ deactivated: true });
    }

    // "fix" = apply AI content fix + autoFixLatex on all fields
    if (action === "fix") {
      if (!fix) return errorResponse("Fix data required");
      await applyAllFixes(qid, fix);
      return successResponse({ fixed: true });
    }

    // "fixLatex" = autoFixLatex only (no AI content change)
    if (action === "fixLatex") {
      await applyAllFixes(qid, null);
      return successResponse({ fixed: true });
    }

    // "fixAll" = both AI fix + autoFixLatex (same as fix but explicit)
    if (action === "fixAll") {
      await applyAllFixes(qid, fix || null);
      return successResponse({ fixed: true });
    }

    return errorResponse("Invalid action");
  } catch (error) {
    console.error("flagged route error:", error?.message, error);
    return errorResponse(error?.message || "Failed to update question", 500);
  }
}

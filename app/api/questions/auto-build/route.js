import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function POST(request) {
  try {
    const { sections, excludeIds = [] } = await request.json();

    if (!sections || sections.length === 0) {
      return errorResponse("At least one section is required");
    }

    const allQuestions = [];

    for (const section of sections) {
      const { subjectId, chapterIds, count, difficulty, type } = section;

      if (!subjectId || !count) continue;

      // Build where clause
      const where = {
        subjectId: parseInt(subjectId),
        isActive: true,
        id: { notIn: [...excludeIds, ...allQuestions.map((q) => q.id)] },
      };

      if (chapterIds?.length > 0) {
        where.chapterId = { in: chapterIds.map(Number) };
      }

      if (type && type !== "BOTH") {
        where.questionType = type;
      }

      // If difficulty percentages provided — pick per difficulty
      const hasDifficultyRules =
        difficulty &&
        (difficulty.EASY > 0 || difficulty.MEDIUM > 0 || difficulty.HARD > 0);

      if (hasDifficultyRules) {
        const easyCount = Math.round(((difficulty.EASY || 0) / 100) * count);
        const hardCount = Math.round(((difficulty.HARD || 0) / 100) * count);
        const medCount = count - easyCount - hardCount;

        const picks = await Promise.all([
          pickRandom({ ...where, difficulty: "EASY" }, easyCount),
          pickRandom({ ...where, difficulty: "MEDIUM" }, medCount),
          pickRandom({ ...where, difficulty: "HARD" }, hardCount),
        ]);

        allQuestions.push(...picks.flat());
      } else {
        // Mixed difficulty — just pick randomly
        const questions = await pickRandom(where, count);
        allQuestions.push(...questions);
      }
    }

    return successResponse({ questions: allQuestions });
  } catch (error) {
    console.error("Auto build error:", error);
    return errorResponse("Failed to build questions", 500);
  }
}

async function pickRandom(where, count) {
  if (count <= 0) return [];

  // Get all matching question IDs first
  const ids = await prisma.question.findMany({
    where,
    select: { id: true },
  });

  if (ids.length === 0) return [];

  // Shuffle and pick
  const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, count);
  const pickedIds = shuffled.map((q) => q.id);

  // Fetch full question data
  const questions = await prisma.question.findMany({
    where: { id: { in: pickedIds } },
    include: {
      options: { orderBy: { orderIndex: "asc" } },
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
    },
  });

  return questions;
}

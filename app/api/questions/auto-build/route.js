import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function POST(request) {
  try {
    const {
      sections,
      excludeIds = [],
      extraExamIds = [],
    } = await request.json();

    if (!sections || sections.length === 0) {
      return errorResponse("At least one section is required");
    }

    const allQuestions = [];

    for (const section of sections) {
      const { subjectId, chapterIds, count, difficulty, type } = section;

      if (!subjectId || !count) continue;

      // Resolve subject IDs (include same-named subjects from extra exams)
      let subjectIds = [parseInt(subjectId)];

      if (extraExamIds.length > 0) {
        const primarySubject = await prisma.subject.findUnique({
          where: { id: parseInt(subjectId) },
          select: { name: true },
        });

        if (primarySubject) {
          const matchingSubjects = await prisma.subject.findMany({
            where: {
              name: { equals: primarySubject.name.trim(), mode: "insensitive" },
              examId: { in: extraExamIds.map(Number) },
            },
            select: { id: true },
          });
          subjectIds = [
            parseInt(subjectId),
            ...matchingSubjects.map((s) => s.id),
          ];
        }
      }

      // Base where clause (no difficulty here)
      const baseWhere = {
        subjectId: subjectIds.length === 1 ? subjectIds[0] : { in: subjectIds },
        isActive: true,
      };

      if (chapterIds?.length > 0) {
        baseWhere.chapterId = { in: chapterIds.map(Number) };
      }

      if (type && type !== "BOTH") {
        baseWhere.questionType = type;
      }

      const excludeNow = () => [
        ...excludeIds,
        ...allQuestions.map((q) => q.id),
      ];

      const hasDifficultyRules =
        difficulty &&
        (difficulty.EASY > 0 || difficulty.MEDIUM > 0 || difficulty.HARD > 0);

      let picked = [];

      if (hasDifficultyRules) {
        const easyCount = Math.round(((difficulty.EASY || 0) / 100) * count);
        const hardCount = Math.round(((difficulty.HARD || 0) / 100) * count);
        const medCount = count - easyCount - hardCount;

        // Pick per difficulty (exclude already-selected)
        const easyPicks = await pickRandom(
          { ...baseWhere, difficulty: "EASY", id: { notIn: excludeNow() } },
          easyCount,
        );
        picked.push(...easyPicks);
        allQuestions.push(...easyPicks);

        const medPicks = await pickRandom(
          { ...baseWhere, difficulty: "MEDIUM", id: { notIn: excludeNow() } },
          medCount,
        );
        picked.push(...medPicks);
        allQuestions.push(...medPicks);

        const hardPicks = await pickRandom(
          { ...baseWhere, difficulty: "HARD", id: { notIn: excludeNow() } },
          hardCount,
        );
        picked.push(...hardPicks);
        allQuestions.push(...hardPicks);

        // CRITICAL: fill shortfall from ANY difficulty
        // Handles the common case where all questions are one difficulty
        const shortfall = count - picked.length;
        if (shortfall > 0) {
          const fill = await pickRandom(
            { ...baseWhere, id: { notIn: excludeNow() } },
            shortfall,
          );
          picked.push(...fill);
          allQuestions.push(...fill);
        }
      } else {
        picked = await pickRandom(
          { ...baseWhere, id: { notIn: excludeNow() } },
          count,
        );
        allQuestions.push(...picked);
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

  const ids = await prisma.question.findMany({
    where,
    select: { id: true },
  });

  if (ids.length === 0) return [];

  // Shuffle and take `count`
  const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, count);
  const pickedIds = shuffled.map((q) => q.id);

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

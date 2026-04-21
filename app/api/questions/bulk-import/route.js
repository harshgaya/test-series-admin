import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function POST(request) {
  try {
    const { questions } = await request.json();

    if (!questions || questions.length === 0) {
      return errorResponse("No questions provided");
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Cache auto-created topics to avoid duplicate DB calls
    // key: "chapterId_topicName" → topicId
    const topicCache = {};

    async function resolveTopicId(topicName, chapterId) {
      if (!topicName || !chapterId) return null;

      const key = `${chapterId}_${topicName.trim().toLowerCase()}`;
      if (topicCache[key]) return topicCache[key];

      // Try to find existing topic
      const existing = await prisma.topic.findFirst({
        where: {
          chapterId: parseInt(chapterId),
          name: { equals: topicName.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });

      if (existing) {
        topicCache[key] = existing.id;
        return existing.id;
      }

      // Auto-create topic
      const created = await prisma.topic.create({
        data: {
          name: topicName.trim(),
          chapterId: parseInt(chapterId),
          isActive: true,
        },
        select: { id: true },
      });

      topicCache[key] = created.id;
      return created.id;
    }

    for (const q of questions) {
      try {
        // Duplicate check — exact question text match in same exam
        const existing = await prisma.question.findFirst({
          where: {
            questionText: q.questionText,
            examId: parseInt(q.examId),
          },
          select: { id: true },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        // Resolve or auto-create topic
        const topicId = q.topicName
          ? await resolveTopicId(q.topicName, q.chapterId)
          : q.topicId
            ? parseInt(q.topicId)
            : null;

        await prisma.question.create({
          data: {
            questionText: q.questionText,
            questionType: q.questionType || "MCQ",
            difficulty: q.difficulty || "MEDIUM",
            examId: parseInt(q.examId),
            subjectId: parseInt(q.subjectId),
            chapterId: parseInt(q.chapterId),
            topicId: topicId,
            solutionText: q.solutionText || null,
            tags: q.tags || [],
            isActive: true,
            options: {
              create: (q.options || []).map((opt, i) => ({
                label: opt.label,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect || false,
                orderIndex: i,
              })),
            },
          },
        });

        imported++;
      } catch (err) {
        console.error("Error importing question:", err);
        errors++;
      }
    }

    return successResponse({ imported, duplicates, errors });
  } catch (error) {
    console.error(error);
    return errorResponse("Bulk import failed", 500);
  }
}

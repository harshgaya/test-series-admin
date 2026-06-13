import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";
import { resolveClassification } from "@/lib/resolveClassification";

export async function POST(request) {
  try {
    const { questions } = await request.json();

    if (!questions || questions.length === 0) {
      return errorResponse("No questions provided");
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Cache: chapterId -> { subjectId, examId } so we don't re-lookup per row
    const classCache = {};
    // Cache auto-created topics: "chapterId_topicName" -> topicId
    const topicCache = {};

    async function getClassification(chapterId) {
      const key = String(chapterId);
      if (classCache[key]) return classCache[key];
      const c = await resolveClassification(chapterId);
      classCache[key] = c;
      return c;
    }

    async function resolveTopicId(topicName, chapterId) {
      if (!topicName || !chapterId) return null;

      const key = `${chapterId}_${topicName.trim().toLowerCase()}`;
      if (topicCache[key]) return topicCache[key];

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
        if (!q.chapterId) {
          errors++;
          continue;
        }

        // Chapter is source of truth - derive examId + subjectId from it.
        // Client examId/subjectId IGNORED so a row can never land in the wrong exam/subject.
        let examId, subjectId, chapterId;
        try {
          ({ examId, subjectId, chapterId } = await getClassification(
            q.chapterId,
          ));
        } catch (e) {
          console.error("Invalid chapter in row:", q.chapterId, e.message);
          errors++;
          continue;
        }

        // Duplicate check - same text within the derived exam
        const existing = await prisma.question.findFirst({
          where: {
            questionText: q.questionText,
            examId,
            isActive: true,
          },
          select: { id: true },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        const topicId = q.topicName
          ? await resolveTopicId(q.topicName, chapterId)
          : q.topicId
            ? parseInt(q.topicId)
            : null;

        await prisma.question.create({
          data: {
            questionText: q.questionText,
            questionType: q.questionType || "MCQ",
            difficulty: q.difficulty || "MEDIUM",
            examId,
            subjectId,
            chapterId,
            topicId,
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

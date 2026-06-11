import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, getPagination } from "@/lib/api";
import { cleanLatexForComparison } from "@/lib/latex-utils";
import { resolveClassification } from "@/lib/resolveClassification";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("groupByChapter") === "true") {
      return getGroupedByChapter(searchParams);
    }
    if (searchParams.get("countBySubject") === "true") {
      return getCountBySubject(searchParams);
    }
    if (searchParams.get("countByChapter") === "true") {
      return getCountByChapter(searchParams);
    }

    const { skip, limit, page } = getPagination(searchParams);

    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const topicId = searchParams.get("topicId");
    const difficulty = searchParams.get("difficulty");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where = {};
    if (examId) where.examId = parseInt(examId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (chapterId) where.chapterId = parseInt(chapterId);
    if (topicId) where.topicId = parseInt(topicId);
    if (difficulty) where.difficulty = difficulty;
    if (type) where.questionType = type;
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;
    if (search) where.questionText = { contains: search, mode: "insensitive" };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          options: { orderBy: { orderIndex: "asc" } },
          exam: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true, subjectId: true } },
          topic: { select: { id: true, name: true } },
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
    return errorResponse("Failed to fetch questions", 500);
  }
}

async function getGroupedByChapter(searchParams) {
  try {
    const examId = searchParams.get("examId");
    if (!examId) return errorResponse("examId is required for groupByChapter");

    const extraExamIds = searchParams.get("extraExamIds")
      ? searchParams.get("extraExamIds").split(",").map(Number).filter(Boolean)
      : [];

    const subjects = await prisma.subject.findMany({
      where: { examId: parseInt(examId), isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    const grouped = [];

    for (const subject of subjects) {
      let subjectIds = [subject.id];

      if (extraExamIds.length > 0) {
        const matching = await prisma.subject.findMany({
          where: {
            name: { equals: subject.name.trim(), mode: "insensitive" },
            examId: { in: extraExamIds },
          },
          select: { id: true },
        });
        subjectIds = [subject.id, ...matching.map((s) => s.id)];
      }

      const chapters = await prisma.chapter.findMany({
        where: { subjectId: { in: subjectIds }, isActive: true },
        orderBy: { orderIndex: "asc" },
        include: {
          subject: {
            select: { exam: { select: { id: true, name: true } } },
          },
        },
      });

      // Count by chapterId directly (chapter is source of truth) - NOT by subjectId
      const chapterCounts = await prisma.question.groupBy({
        by: ["chapterId"],
        where: { chapterId: { in: chapters.map((c) => c.id) }, isActive: true },
        _count: { id: true },
      });

      const countMap = {};
      chapterCounts.forEach((c) => {
        countMap[c.chapterId] = c._count.id;
      });

      const chaptersWithCount = chapters
        .map((c) => ({
          chapterId: c.id,
          chapterName: c.name,
          count: countMap[c.id] || 0,
          examName: c.subject?.exam?.name || null,
          examId: c.subject?.exam?.id || null,
        }))
        .filter((c) => c.count > 0);

      if (chaptersWithCount.length > 0) {
        grouped.push({
          subjectId: subject.id,
          subjectName: subject.name,
          chapters: chaptersWithCount,
        });
      }
    }

    return successResponse(grouped);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch grouped questions", 500);
  }
}

async function getCountBySubject(searchParams) {
  try {
    const examId = searchParams.get("examId");
    if (!examId) return errorResponse("examId is required");

    const extraExamIds = searchParams.get("extraExamIds")
      ? searchParams.get("extraExamIds").split(",").map(Number).filter(Boolean)
      : [];

    const subjects = await prisma.subject.findMany({
      where: { examId: parseInt(examId), isActive: true },
      select: { id: true, name: true },
    });

    const subjectCounts = {};

    for (const subject of subjects) {
      let subjectIds = [subject.id];

      if (extraExamIds.length > 0) {
        const matching = await prisma.subject.findMany({
          where: {
            name: { equals: subject.name.trim(), mode: "insensitive" },
            examId: { in: extraExamIds },
          },
          select: { id: true },
        });
        subjectIds = [subject.id, ...matching.map((s) => s.id)];
      }

      // Count via chapters of these subjects (chapter is source of truth)
      const chapters = await prisma.chapter.findMany({
        where: { subjectId: { in: subjectIds }, isActive: true },
        select: { id: true },
      });

      const count = await prisma.question.count({
        where: { chapterId: { in: chapters.map((c) => c.id) }, isActive: true },
      });

      subjectCounts[subject.id] = count;
    }

    return successResponse({ subjectCounts });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch subject counts", 500);
  }
}

async function getCountByChapter(searchParams) {
  try {
    const subjectId = searchParams.get("subjectId");
    if (!subjectId) return errorResponse("subjectId is required");

    const extraExamIds = searchParams.get("extraExamIds")
      ? searchParams.get("extraExamIds").split(",").map(Number).filter(Boolean)
      : [];

    let subjectIds = [parseInt(subjectId)];

    if (extraExamIds.length > 0) {
      const primarySubject = await prisma.subject.findUnique({
        where: { id: parseInt(subjectId) },
        select: { name: true },
      });

      if (primarySubject) {
        const matching = await prisma.subject.findMany({
          where: {
            name: { equals: primarySubject.name.trim(), mode: "insensitive" },
            examId: { in: extraExamIds },
          },
          select: { id: true },
        });
        subjectIds = [parseInt(subjectId), ...matching.map((s) => s.id)];
      }
    }

    const chapters = await prisma.chapter.findMany({
      where: { subjectId: { in: subjectIds }, isActive: true },
      orderBy: { orderIndex: "asc" },
      include: {
        subject: {
          select: {
            id: true,
            examId: true,
            exam: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Count by chapterId directly (chapter is source of truth)
    const questionCounts = await prisma.question.groupBy({
      by: ["chapterId"],
      where: { chapterId: { in: chapters.map((c) => c.id) }, isActive: true },
      _count: { id: true },
    });

    const countMap = {};
    questionCounts.forEach((c) => {
      countMap[c.chapterId] = c._count.id;
    });

    const chapterList = [];
    const chapterCounts = {};

    for (const c of chapters) {
      const count = countMap[c.id] || 0;
      if (count > 0) {
        chapterList.push({
          id: c.id,
          name: c.name,
          subjectId: c.subjectId,
          examId: c.subject?.exam?.id || null,
          examName: c.subject?.exam?.name || null,
        });
        chapterCounts[c.id] = count;
      }
    }

    return successResponse({ chapterCounts, chapters: chapterList });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch chapter counts", 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      questionText,
      questionImageUrl,
      questionType,
      difficulty,
      chapterId,
      topicId,
      solutionText,
      solutionImageUrl,
      solutionAudioUrl,
      solutionVideoUrl,
      integerAnswer,
      isActive,
      options,
      tags,
      skipDuplicateCheck,
    } = body;

    if (!questionText || !chapterId) {
      return errorResponse("Question text and chapter are required");
    }

    // Chapter is source of truth - derive subjectId + examId from it.
    // Client examId/subjectId are ignored to prevent mismatches.
    let classification;
    try {
      classification = await resolveClassification(chapterId);
    } catch (e) {
      return errorResponse(e.message || "Invalid chapter", 400);
    }
    const { examId, subjectId } = classification;

    if (!skipDuplicateCheck) {
      const existing = await prisma.question.findFirst({
        where: {
          questionText: { equals: questionText, mode: "insensitive" },
          examId,
        },
        select: {
          id: true,
          chapter: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

      if (existing) {
        return Response.json(
          {
            success: false,
            duplicate: true,
            existing,
            error: "Similar question already exists",
          },
          { status: 409 },
        );
      }
    }

    const question = await prisma.question.create({
      data: {
        questionText,
        questionTextClean: cleanLatexForComparison(questionText),
        questionImageUrl,
        questionType: questionType || "MCQ",
        difficulty: difficulty || "MEDIUM",
        examId,
        subjectId,
        chapterId: parseInt(chapterId),
        topicId: topicId ? parseInt(topicId) : null,
        solutionText,
        solutionImageUrl,
        solutionAudioUrl,
        solutionVideoUrl,
        integerAnswer: integerAnswer || null,
        isActive: isActive !== false,
        tags: Array.isArray(tags) ? tags : [],
        options: {
          create: (options || []).map((opt, i) => ({
            label: opt.label,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect || false,
            orderIndex: i,
          })),
        },
      },
      include: {
        options: true,
        exam: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
    });

    return successResponse(question, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create question", 500);
  }
}

import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, getPagination } from "@/lib/api";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("groupByChapter") === "true") {
      return getGroupedByChapter(searchParams);
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
          chapter: { select: { id: true, name: true } },
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

    const subjects = await prisma.subject.findMany({
      where: { examId: parseInt(examId), isActive: true },
      orderBy: { orderIndex: "asc" },
      include: {
        chapters: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { questions: { where: { isActive: true } } } },
          },
        },
      },
    });

    const grouped = subjects
      .map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        chapters: subject.chapters
          .map((chapter) => ({
            chapterId: chapter.id,
            chapterName: chapter.name,
            count: chapter._count.questions,
          }))
          .filter((c) => c.count > 0),
      }))
      .filter((s) => s.chapters.length > 0);

    return successResponse(grouped);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch grouped questions", 500);
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
      examId,
      subjectId,
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

    if (!questionText || !examId || !subjectId || !chapterId) {
      return errorResponse(
        "Question text, exam, subject and chapter are required",
      );
    }

    // Duplicate check — same question text in same exam
    if (!skipDuplicateCheck) {
      const existing = await prisma.question.findFirst({
        where: {
          questionText: { equals: questionText, mode: "insensitive" },
          examId: parseInt(examId),
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
        questionImageUrl,
        questionType: questionType || "MCQ",
        difficulty: difficulty || "MEDIUM",
        examId: parseInt(examId),
        subjectId: parseInt(subjectId),
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

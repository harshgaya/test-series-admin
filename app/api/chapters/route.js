import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const examId = searchParams.get("examId");

    let where = {};
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (examId) where.subject = { examId: parseInt(examId) };

    const chapters = await prisma.chapter.findMany({
      where,
      orderBy: { orderIndex: "asc" },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            exam: { select: { id: true, name: true } },
          },
        },
        _count: { select: { topics: true, questions: true } },
      },
    });
    return successResponse(chapters);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch chapters", 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, subjectId, description } = body;

    if (!name || !subjectId)
      return errorResponse("Name and subject are required");

    // Prevent duplicate chapter name within the same subject (case-insensitive)
    const existing = await prisma.chapter.findFirst({
      where: {
        subjectId: parseInt(subjectId),
        name: { equals: name.trim(), mode: "insensitive" },
      },
      select: { id: true, name: true },
    });

    if (existing) {
      return errorResponse(
        `A chapter named "${existing.name}" already exists in this subject`,
        409,
      );
    }

    const chapter = await prisma.chapter.create({
      data: { name: name.trim(), subjectId: parseInt(subjectId), description },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            exam: { select: { id: true, name: true } },
          },
        },
        _count: { select: { topics: true, questions: true } },
      },
    });
    return successResponse(chapter, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create chapter", 500);
  }
}

import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    const subjects = await prisma.subject.findMany({
      where: examId ? { examId: parseInt(examId) } : {},
      orderBy: { orderIndex: "asc" },
      include: {
        exam: { select: { id: true, name: true } },
        _count: { select: { chapters: true, questions: true } },
      },
    });
    return successResponse(subjects);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch subjects", 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, slug, examId, iconUrl } = body;

    if (!name || !slug || !examId) {
      return errorResponse("Name, slug and exam are required");
    }

    const examIdInt = parseInt(examId);

    // Guard 1: duplicate slug within the same exam
    const existingSlug = await prisma.subject.findFirst({
      where: { slug, examId: examIdInt },
    });
    if (existingSlug)
      return errorResponse("Slug already exists for this exam", 409);

    // Guard 2: duplicate NAME within the same exam (prevents the two-Physics problem)
    const existingName = await prisma.subject.findFirst({
      where: {
        examId: examIdInt,
        name: { equals: name.trim(), mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    if (existingName) {
      return errorResponse(
        `A subject named "${existingName.name}" already exists in this exam`,
        409,
      );
    }

    const subject = await prisma.subject.create({
      data: { name: name.trim(), slug, examId: examIdInt, iconUrl },
      include: {
        exam: { select: { id: true, name: true } },
        _count: { select: { chapters: true, questions: true } },
      },
    });
    return successResponse(subject, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create subject", 500);
  }
}

import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function PUT(request, { params }) {
  try {
    const crashCourseId = parseInt(params.id);
    const dayNumber = parseInt(params.day);
    const body = await request.json();

    const day = await prisma.crashCourseTest.update({
      where: { crashCourseId_dayNumber: { crashCourseId, dayNumber } },
      data: {
        testId: body.testId ? parseInt(body.testId) : null,
        topicName: body.topicName || null,
        notesUrl: body.notesUrl || null,
        videoUrl: body.videoUrl || null,
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            testType: true,
            durationMins: true,
            totalMarks: true,
            status: true,
            _count: { select: { testQuestions: true } },
          },
        },
      },
    });

    return successResponse(day);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to update day", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const crashCourseId = parseInt(params.id);
    const dayNumber = parseInt(params.day);

    await prisma.crashCourseTest.delete({
      where: { crashCourseId_dayNumber: { crashCourseId, dayNumber } },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to remove day", 500);
  }
}

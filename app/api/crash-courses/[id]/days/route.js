import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request, { params }) {
  try {
    const crashCourseId = parseInt(params.id);

    const course = await prisma.crashCourse.findUnique({
      where: { id: crashCourseId },
    });
    if (!course) return errorResponse("Crash course not found", 404);

    const days = await prisma.crashCourseTest.findMany({
      where: { crashCourseId },
      orderBy: { dayNumber: "asc" },
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

    return successResponse({ course, days, totalDays: course.durationDays });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch days", 500);
  }
}

export async function POST(request, { params }) {
  try {
    const crashCourseId = parseInt(params.id);
    const body = await request.json();
    const { dayNumber, testId, topicName, notesUrl, videoUrl } = body;

    if (!dayNumber) return errorResponse("Day number is required");

    const course = await prisma.crashCourse.findUnique({
      where: { id: crashCourseId },
    });
    if (!course) return errorResponse("Crash course not found", 404);

    if (dayNumber < 1 || dayNumber > course.durationDays) {
      return errorResponse(`Day must be between 1 and ${course.durationDays}`);
    }

    // Upsert — create or update existing day
    const day = await prisma.crashCourseTest.upsert({
      where: { crashCourseId_dayNumber: { crashCourseId, dayNumber } },
      update: {
        testId: testId ? parseInt(testId) : null,
        topicName: topicName || null,
        notesUrl: notesUrl || null,
        videoUrl: videoUrl || null,
      },
      create: {
        crashCourseId,
        dayNumber,
        testId: testId ? parseInt(testId) : null,
        topicName: topicName || null,
        notesUrl: notesUrl || null,
        videoUrl: videoUrl || null,
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

    return successResponse(day, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to assign test to day", 500);
  }
}

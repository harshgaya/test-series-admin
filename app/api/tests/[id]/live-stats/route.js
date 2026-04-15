import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request, { params }) {
  try {
    const testId = parseInt(params.id)

    const [attempting, submitted, recentSubmissions] = await Promise.all([
      prisma.testAttempt.count({
        where: { testId, status: 'IN_PROGRESS' },
      }),
      prisma.testAttempt.count({
        where: { testId, status: 'SUBMITTED' },
      }),
      prisma.testAttempt.findMany({
        where:   { testId, status: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
        take:    10,
        include: { student: { select: { name: true } } },
      }),
    ])

    return successResponse({
      attempting,
      submitted,
      recentSubmissions: recentSubmissions.map(a => ({
        studentName: a.student?.name,
        score:       a.score,
        totalMarks:  a.totalMarks,
        submittedAt: a.submittedAt,
      })),
    })
  } catch (error) {
    return errorResponse('Failed to fetch live stats', 500)
  }
}

import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, description, examId, durationDays, price } = body
    if (!title || !examId) return errorResponse('Title and exam are required')

    const course = await prisma.crashCourse.create({
      data: { title, description, examId: parseInt(examId), durationDays: durationDays || 30, price: price || 0 },
    })
    return successResponse(course, 201)
  } catch (error) {
    return errorResponse('Failed to create crash course', 500)
  }
}

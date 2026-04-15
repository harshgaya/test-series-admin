import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request, { params }) {
  try {
    const id      = parseInt(params.id)
    const student = await prisma.student.findUnique({
      where:   { id },
      include: {
        targetExam: { select: { name: true } },
        attempts: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          include: { test: { select: { title: true, testType: true } } },
        },
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          include: { test: { select: { title: true } } },
        },
        _count: { select: { attempts: true, purchases: true } },
      },
    })
    if (!student) return errorResponse('Student not found', 404)
    return successResponse(student)
  } catch (error) {
    return errorResponse('Failed to fetch student', 500)
  }
}

export async function PUT(request, { params }) {
  try {
    const id      = parseInt(params.id)
    const body    = await request.json()
    const student = await prisma.student.update({
      where: { id },
      data:  {
        isBlocked:  body.isBlocked  !== undefined ? body.isBlocked  : undefined,
        freeAccess: body.freeAccess !== undefined ? body.freeAccess : undefined,
      },
    })
    return successResponse(student)
  } catch (error) {
    return errorResponse('Failed to update student', 500)
  }
}

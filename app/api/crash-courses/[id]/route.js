import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const c    = await prisma.crashCourse.update({
      where: { id },
      data:  {
        title:       body.title,
        description: body.description,
        durationDays: body.durationDays,
        price:       body.price,
        isActive:    body.isActive,
      },
    })
    return successResponse(c)
  } catch (error) {
    return errorResponse('Failed to update crash course', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.crashCourse.delete({ where: { id: parseInt(params.id) } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete crash course', 500)
  }
}

import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const subject = await prisma.subject.update({
      where: { id },
      data:  {
        name:       body.name,
        slug:       body.slug,
        iconUrl:    body.iconUrl,
        isActive:   body.isActive,
        orderIndex: body.orderIndex,
      },
    })
    return successResponse(subject)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to update subject', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id)
    await prisma.subject.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to delete subject', 500)
  }
}

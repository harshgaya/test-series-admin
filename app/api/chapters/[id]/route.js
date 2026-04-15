import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id      = parseInt(params.id)
    const body    = await request.json()
    const chapter = await prisma.chapter.update({
      where: { id },
      data:  { name: body.name, description: body.description, isActive: body.isActive, orderIndex: body.orderIndex },
    })
    return successResponse(chapter)
  } catch (error) {
    return errorResponse('Failed to update chapter', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.chapter.delete({ where: { id: parseInt(params.id) } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete chapter', 500)
  }
}

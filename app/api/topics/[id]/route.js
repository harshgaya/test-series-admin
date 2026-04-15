import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id    = parseInt(params.id)
    const body  = await request.json()
    const topic = await prisma.topic.update({
      where: { id },
      data:  { name: body.name, isActive: body.isActive, orderIndex: body.orderIndex },
    })
    return successResponse(topic)
  } catch { return errorResponse('Failed to update topic', 500) }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.topic.delete({ where: { id: parseInt(params.id) } })
    return successResponse({ deleted: true })
  } catch { return errorResponse('Failed to delete topic', 500) }
}

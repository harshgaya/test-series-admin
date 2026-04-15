import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const r    = await prisma.questionReport.update({
      where: { id },
      data:  { status: body.status, resolvedAt: body.status === 'resolved' ? new Date() : null },
    })
    return successResponse(r)
  } catch (error) {
    return errorResponse('Failed to update report', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.questionReport.delete({ where: { id: parseInt(params.id) } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete report', 500)
  }
}

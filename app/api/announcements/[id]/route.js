import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const a    = await prisma.announcement.update({
      where: { id },
      data:  {
        title:           body.title,
        message:         body.message,
        showOnHomepage:  body.showOnHomepage,
        showOnDashboard: body.showOnDashboard,
        isActive:        body.isActive,
        expiresAt:       body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })
    return successResponse(a)
  } catch (error) {
    return errorResponse('Failed to update announcement', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(params.id) } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete announcement', 500)
  }
}

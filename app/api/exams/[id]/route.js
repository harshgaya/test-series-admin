import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api'

// PUT /api/exams/[id]
export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const { name, slug, track, logoUrl, description, isActive, orderIndex } = body

    const exam = await prisma.exam.update({
      where: { id },
      data:  { name, slug, track, logoUrl, description, isActive, orderIndex },
    })
    return successResponse(exam)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to update exam', 500)
  }
}

// DELETE /api/exams/[id]
export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id)
    await prisma.exam.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to delete exam', 500)
  }
}

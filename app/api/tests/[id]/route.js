import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const test = await prisma.test.findUnique({
      where:   { id },
      include: {
        exam:    { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic:   { select: { id: true, name: true } },
        testQuestions: {
          orderBy:  { orderIndex: 'asc' },
          include:  { question: { include: { options: true } } },
        },
        _count: { select: { attempts: true } },
      },
    })
    if (!test) return errorResponse('Test not found', 404)
    return successResponse(test)
  } catch (error) {
    return errorResponse('Failed to fetch test', 500)
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()

    const test = await prisma.test.update({
      where: { id },
      data:  {
        title:          body.title,
        description:    body.description,
        durationMins:   body.durationMins,
        marksCorrect:   body.marksCorrect,
        negativeMarking: body.negativeMarking,
        price:          body.price,
        showSolutions:  body.showSolutions,
        showAnswers:    body.showAnswers,
        showRank:       body.showRank,
        showLeaderboard: body.showLeaderboard,
        status:         body.status,
        scheduledAt:    body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    })
    return successResponse(test)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to update test', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id)
    await prisma.test.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete test', 500)
  }
}

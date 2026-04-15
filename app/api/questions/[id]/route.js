import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request, { params }) {
  try {
    const id       = parseInt(params.id)
    const question = await prisma.question.findUnique({
      where:   { id },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        exam:    { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic:   { select: { id: true, name: true } },
      },
    })
    if (!question) return errorResponse('Question not found', 404)
    return successResponse(question)
  } catch (error) {
    return errorResponse('Failed to fetch question', 500)
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id)
    const body = await request.json()
    const {
      questionText, questionImageUrl, questionType, difficulty,
      examId, subjectId, chapterId, topicId,
      solutionText, solutionImageUrl, solutionAudioUrl, solutionVideoUrl,
      integerAnswer, isActive, options,
    } = body

    // Update question + replace options
    await prisma.questionOption.deleteMany({ where: { questionId: id } })

    const question = await prisma.question.update({
      where: { id },
      data:  {
        questionText, questionImageUrl,
        questionType: questionType || 'MCQ',
        difficulty:   difficulty   || 'MEDIUM',
        examId:       parseInt(examId),
        subjectId:    parseInt(subjectId),
        chapterId:    parseInt(chapterId),
        topicId:      topicId ? parseInt(topicId) : null,
        solutionText, solutionImageUrl, solutionAudioUrl, solutionVideoUrl,
        integerAnswer: integerAnswer || null,
        isActive:      isActive !== false,
        options: {
          create: (options || []).map((opt, i) => ({
            label:      opt.label,
            optionText: opt.optionText,
            isCorrect:  opt.isCorrect || false,
            orderIndex: i,
          })),
        },
      },
      include: {
        options: true,
        exam:    { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic:   { select: { id: true, name: true } },
      },
    })
    return successResponse(question)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to update question', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id)
    await prisma.question.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse('Failed to delete question', 500)
  }
}

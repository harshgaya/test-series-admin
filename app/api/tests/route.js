import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, getPagination } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { skip, limit, page } = getPagination(searchParams)
    const examId   = searchParams.get('examId')
    const testType = searchParams.get('type')
    const status   = searchParams.get('status')

    const where = {}
    if (examId)   where.examId   = parseInt(examId)
    if (testType) where.testType = testType
    if (status)   where.status   = status

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          exam:    { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true } },
          _count:  { select: { testQuestions: true, attempts: true } },
        },
      }),
      prisma.test.count({ where }),
    ])

    return successResponse({ tests, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch tests', 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      title, description, examId, subjectId, chapterId, topicId,
      testType, durationMins, marksCorrect, negativeMarking,
      attemptLimit, price, showSolutions, showAnswers, showRank,
      showLeaderboard, status, scheduledAt, questionIds,
    } = body

    if (!title || !examId || !testType) {
      return errorResponse('Title, exam and test type are required')
    }

    // Calculate total marks
    const totalMarks = (questionIds?.length || 0) * (marksCorrect || 4)

    const test = await prisma.test.create({
      data: {
        title, description,
        examId:         parseInt(examId),
        subjectId:      subjectId  ? parseInt(subjectId)  : null,
        chapterId:      chapterId  ? parseInt(chapterId)  : null,
        topicId:        topicId    ? parseInt(topicId)    : null,
        testType,
        durationMins:   durationMins   || 60,
        totalMarks,
        marksCorrect:   marksCorrect   || 4,
        negativeMarking: negativeMarking !== undefined ? negativeMarking : -1,
        attemptLimit:   attemptLimit   || 0,
        price:          price          || 0,
        showSolutions:  showSolutions  !== false,
        showAnswers:    showAnswers     !== false,
        showRank:       showRank        !== false,
        showLeaderboard: showLeaderboard !== false,
        status:         status         || 'DRAFT',
        scheduledAt:    scheduledAt    ? new Date(scheduledAt) : null,
        testQuestions: {
          create: (questionIds || []).map((qId, i) => ({
            questionId: parseInt(qId),
            marks:      marksCorrect || 4,
            orderIndex: i,
          })),
        },
      },
      include: {
        exam:   { select: { id: true, name: true } },
        _count: { select: { testQuestions: true, attempts: true } },
      },
    })

    // Update usage count on questions
    if (questionIds?.length) {
      await prisma.question.updateMany({
        where: { id: { in: questionIds.map(Number) } },
        data:  { usageCount: { increment: 1 } },
      })
    }

    return successResponse(test, 201)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to create test', 500)
  }
}

import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, getPagination } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { skip, limit, page } = getPagination(searchParams)

    const examId     = searchParams.get('examId')
    const subjectId  = searchParams.get('subjectId')
    const chapterId  = searchParams.get('chapterId')
    const topicId    = searchParams.get('topicId')
    const difficulty = searchParams.get('difficulty')
    const type       = searchParams.get('type')
    const status     = searchParams.get('status')
    const search     = searchParams.get('search')

    const where = {}
    if (examId)     where.examId     = parseInt(examId)
    if (subjectId)  where.subjectId  = parseInt(subjectId)
    if (chapterId)  where.chapterId  = parseInt(chapterId)
    if (topicId)    where.topicId    = parseInt(topicId)
    if (difficulty) where.difficulty = difficulty
    if (type)       where.questionType = type
    if (status === 'active')   where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (search)     where.questionText = { contains: search, mode: 'insensitive' }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options:  true,
          exam:     { select: { id: true, name: true } },
          subject:  { select: { id: true, name: true } },
          chapter:  { select: { id: true, name: true } },
          topic:    { select: { id: true, name: true } },
        },
      }),
      prisma.question.count({ where }),
    ])

    return successResponse({
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch questions', 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      questionText, questionImageUrl, questionType, difficulty,
      examId, subjectId, chapterId, topicId,
      solutionText, solutionImageUrl, solutionAudioUrl, solutionVideoUrl,
      integerAnswer, isActive, options,
    } = body

    if (!questionText || !examId || !subjectId || !chapterId) {
      return errorResponse('Question text, exam, subject and chapter are required')
    }

    const question = await prisma.question.create({
      data: {
        questionText,
        questionImageUrl,
        questionType:     questionType || 'MCQ',
        difficulty:       difficulty   || 'MEDIUM',
        examId:           parseInt(examId),
        subjectId:        parseInt(subjectId),
        chapterId:        parseInt(chapterId),
        topicId:          topicId ? parseInt(topicId) : null,
        solutionText,
        solutionImageUrl,
        solutionAudioUrl,
        solutionVideoUrl,
        integerAnswer:    integerAnswer || null,
        isActive:         isActive !== false,
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
    return successResponse(question, 201)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to create question', 500)
  }
}

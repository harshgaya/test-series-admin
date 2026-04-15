import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('examId')

    const subjects = await prisma.subject.findMany({
      where:   examId ? { examId: parseInt(examId) } : {},
      orderBy: { orderIndex: 'asc' },
      include: {
        exam: { select: { name: true } },
        _count: { select: { chapters: true, questions: true } },
      },
    })
    return successResponse(subjects)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch subjects', 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, slug, examId, iconUrl } = body

    if (!name || !slug || !examId) {
      return errorResponse('Name, slug and exam are required')
    }

    const existing = await prisma.subject.findFirst({
      where: { slug, examId: parseInt(examId) },
    })
    if (existing) return errorResponse('Slug already exists for this exam')

    const subject = await prisma.subject.create({
      data: { name, slug, examId: parseInt(examId), iconUrl },
      include: { exam: { select: { name: true } }, _count: { select: { chapters: true, questions: true } } },
    })
    return successResponse(subject, 201)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to create subject', 500)
  }
}

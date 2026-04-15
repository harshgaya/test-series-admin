import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')

    const topics = await prisma.topic.findMany({
      where:   chapterId ? { chapterId: parseInt(chapterId) } : {},
      orderBy: { orderIndex: 'asc' },
      include: {
        chapter: {
          select: { id: true, name: true, subject: { select: { id: true, name: true, exam: { select: { id: true, name: true } } } } },
        },
        _count: { select: { questions: true } },
      },
    })
    return successResponse(topics)
  } catch (error) {
    return errorResponse('Failed to fetch topics', 500)
  }
}

export async function POST(request) {
  try {
    const { name, chapterId } = await request.json()
    if (!name || !chapterId) return errorResponse('Name and chapter are required')

    const topic = await prisma.topic.create({
      data: { name, chapterId: parseInt(chapterId) },
      include: {
        chapter: { select: { id: true, name: true, subject: { select: { id: true, name: true, exam: { select: { id: true, name: true } } } } } },
        _count:  { select: { questions: true } },
      },
    })
    return successResponse(topic, 201)
  } catch (error) {
    return errorResponse('Failed to create topic', 500)
  }
}

import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

// GET /api/exams
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive  = searchParams.get('all') === 'true'

    const exams = await prisma.exam.findMany({
      where:   includeInactive ? {} : { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: { _count: { select: { subjects: true, questions: true, tests: true } } },
    })
    return successResponse(exams)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch exams', 500)
  }
}

// POST /api/exams
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, slug, track, logoUrl, description } = body

    if (!name || !slug || !track) {
      return errorResponse('Name, slug and track are required')
    }

    // Check slug uniqueness
    const existing = await prisma.exam.findUnique({ where: { slug } })
    if (existing) return errorResponse('Slug already exists')

    const exam = await prisma.exam.create({
      data: { name, slug, track, logoUrl, description },
    })
    return successResponse(exam, 201)
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to create exam', 500)
  }
}

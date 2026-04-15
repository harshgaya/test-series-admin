import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, getPagination } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { skip, limit, page } = getPagination(searchParams)
    const search = searchParams.get('search')
    const from   = searchParams.get('from')
    const to     = searchParams.get('to')

    const where = {}
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          targetExam: { select: { name: true } },
          _count:     { select: { attempts: true, purchases: true } },
        },
      }),
      prisma.student.count({ where }),
    ])

    return successResponse({ students, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch students', 500)
  }
}

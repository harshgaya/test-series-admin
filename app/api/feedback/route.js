import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, getPagination } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { skip, limit, page } = getPagination(searchParams)
    const status = searchParams.get('status')
    const type   = searchParams.get('type')

    const where = {}
    if (status) where.status     = status
    if (type)   where.reportType = type

    const [reports, total] = await Promise.all([
      prisma.questionReport.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          question: {
            select: {
              id: true, questionText: true,
              chapter: { select: { name: true } },
              subject: { select: { name: true } },
            },
          },
          student: { select: { name: true, email: true } },
        },
      }),
      prisma.questionReport.count({ where }),
    ])

    return successResponse({ reports, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return errorResponse('Failed to fetch reports', 500)
  }
}

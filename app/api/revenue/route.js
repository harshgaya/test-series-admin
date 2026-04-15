import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, getPagination } from '@/lib/api'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { skip, limit, page } = getPagination(searchParams)
    const status = searchParams.get('status')
    const from   = searchParams.get('from')
    const to     = searchParams.get('to')

    const where = {}
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart  = new Date(now.getFullYear(), 0, 1)

    const [payments, total, monthRevenue, yearRevenue, allRevenue] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, email: true, phone: true } },
          test:    { select: { title: true } },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: yearStart } },  _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    ])

    return successResponse({
      payments,
      total,
      page,
      totalPages:    Math.ceil(total / limit),
      monthRevenue:  monthRevenue._sum.amount  || 0,
      yearRevenue:   yearRevenue._sum.amount   || 0,
      totalRevenue:  allRevenue._sum.amount    || 0,
    })
  } catch (error) {
    console.error(error)
    return errorResponse('Failed to fetch revenue', 500)
  }
}

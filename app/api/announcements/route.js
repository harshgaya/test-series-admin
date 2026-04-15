import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return successResponse(announcements)
  } catch (error) {
    return errorResponse('Failed to fetch announcements', 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, message, showOnHomepage, showOnDashboard, expiresAt } = body

    if (!title || !message) return errorResponse('Title and message are required')

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        showOnHomepage:  showOnHomepage  !== false,
        showOnDashboard: showOnDashboard !== false,
        expiresAt:       expiresAt ? new Date(expiresAt) : null,
      },
    })
    return successResponse(announcement, 201)
  } catch (error) {
    return errorResponse('Failed to create announcement', 500)
  }
}

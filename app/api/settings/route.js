import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    // Convert array to key-value object
    const obj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
    return successResponse(obj)
  } catch (error) {
    return errorResponse('Failed to fetch settings', 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Upsert each setting
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
    await Promise.all(updates)
    return successResponse({ saved: true })
  } catch (error) {
    return errorResponse('Failed to save settings', 500)
  }
}

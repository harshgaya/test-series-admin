import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import AnnouncementsClient from './AnnouncementsClient'

async function getAnnouncements() {
  return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })
}

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements()
  return (
    <div>
      <Topbar title="Announcements" subtitle="Manage notices shown to students" />
      <div className="p-6">
        <AnnouncementsClient initialData={announcements} />
      </div>
    </div>
  )
}

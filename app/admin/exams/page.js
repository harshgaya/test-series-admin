import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import ExamsClient from './ExamsClient'
import { TRACKS } from '@/lib/constants'

async function getExams() {
  return prisma.exam.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { subjects: true, questions: true, tests: true } } },
  })
}

export default async function ExamsPage() {
  const exams = await getExams()
  return (
    <div>
      <Topbar title="Exams" subtitle="Manage all exams on the platform" />
      <div className="p-6">
        <ExamsClient initialExams={exams} tracks={TRACKS} />
      </div>
    </div>
  )
}

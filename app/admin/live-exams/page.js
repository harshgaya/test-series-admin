import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import LiveExamsClient from './LiveExamsClient'

async function getLiveExams() {
  return prisma.test.findMany({
    where:   { testType: 'LIVE' },
    orderBy: { scheduledAt: 'desc' },
    include: {
      exam:   { select: { name: true } },
      _count: { select: { attempts: true, testQuestions: true } },
    },
  })
}

export default async function LiveExamsPage() {
  const exams = await getLiveExams()
  return (
    <div>
      <Topbar title="Live Exams" subtitle="Monitor and manage All India Live Mock Tests" />
      <div className="p-6">
        <LiveExamsClient initialExams={exams} />
      </div>
    </div>
  )
}

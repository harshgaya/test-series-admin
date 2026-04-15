import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import TestsClient from './TestsClient'

async function getData() {
  const exams = await prisma.exam.findMany({
    where:   { isActive: true },
    orderBy: { orderIndex: 'asc' },
    select:  { id: true, name: true },
  })
  return { exams }
}

export default async function TestsPage() {
  const { exams } = await getData()
  return (
    <div>
      <Topbar title="All Tests" subtitle="Manage all test series" />
      <div className="p-6">
        <TestsClient exams={exams} />
      </div>
    </div>
  )
}

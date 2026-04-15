import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Topbar from '@/components/admin/Topbar'
import EditTestClient from './EditTestClient'

async function getTest(id) {
  return prisma.test.findUnique({
    where:   { id: parseInt(id) },
    include: {
      exam:    { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, name: true } },
      testQuestions: {
        orderBy: { orderIndex: 'asc' },
        include: { question: { select: { id: true, questionText: true, difficulty: true } } },
      },
      _count: { select: { attempts: true } },
    },
  })
}

export default async function EditTestPage({ params }) {
  const test = await getTest(params.id)
  if (!test) notFound()

  return (
    <div>
      <Topbar title="Edit Test" subtitle={test.title} />
      <div className="p-6">
        <EditTestClient test={test} />
      </div>
    </div>
  )
}

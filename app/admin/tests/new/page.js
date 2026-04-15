import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import CreateTestClient from './CreateTestClient'

async function getData() {
  const [exams, subjects, chapters, topics] = await Promise.all([
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, examId: true } }),
    prisma.chapter.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, subjectId: true } }),
    prisma.topic.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, chapterId: true } }),
  ])
  return { exams, subjects, chapters, topics }
}

export default async function CreateTestPage() {
  const data = await getData()
  return (
    <div>
      <Topbar title="Create Test" subtitle="Set up a new test series step by step" />
      <div className="p-6">
        <CreateTestClient {...data} />
      </div>
    </div>
  )
}

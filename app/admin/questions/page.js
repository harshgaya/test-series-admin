import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import QuestionsClient from './QuestionsClient'

async function getFilters() {
  const [exams, subjects, chapters] = await Promise.all([
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, examId: true } }),
    prisma.chapter.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, subjectId: true } }),
  ])
  return { exams, subjects, chapters }
}

export default async function QuestionsPage() {
  const filters = await getFilters()
  return (
    <div>
      <Topbar title="Question Bank" subtitle="View, add and manage all questions" />
      <div className="p-6">
        <QuestionsClient filters={filters} />
      </div>
    </div>
  )
}

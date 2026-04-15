import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import TopicsClient from './TopicsClient'

async function getData() {
  const [topics, exams, subjects, chapters] = await Promise.all([
    prisma.topic.findMany({
      orderBy: [{ chapterId: 'asc' }, { orderIndex: 'asc' }],
      include: {
        chapter: {
          select: {
            id: true, name: true,
            subject: { select: { id: true, name: true, exam: { select: { id: true, name: true } } } },
          },
        },
        _count: { select: { questions: true } },
      },
    }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, examId: true } }),
    prisma.chapter.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, subjectId: true } }),
  ])
  return { topics, exams, subjects, chapters }
}

export default async function TopicsPage() {
  const data = await getData()
  return (
    <div>
      <Topbar title="Topics" subtitle="Manage topics under each chapter" />
      <div className="p-6">
        <TopicsClient {...data} />
      </div>
    </div>
  )
}

import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import ChaptersClient from './ChaptersClient'

async function getData() {
  const [chapters, exams, subjects] = await Promise.all([
    prisma.chapter.findMany({
      orderBy: [{ subjectId: 'asc' }, { orderIndex: 'asc' }],
      include: {
        subject: { select: { id: true, name: true, exam: { select: { id: true, name: true } } } },
        _count:  { select: { topics: true, questions: true } },
      },
    }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, examId: true } }),
  ])
  return { chapters, exams, subjects }
}

export default async function ChaptersPage() {
  const data = await getData()
  return (
    <div>
      <Topbar title="Chapters" subtitle="Manage chapters under each subject" />
      <div className="p-6">
        <ChaptersClient {...data} />
      </div>
    </div>
  )
}

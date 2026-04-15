import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import SubjectsClient from './SubjectsClient'

async function getData() {
  const [subjects, exams] = await Promise.all([
    prisma.subject.findMany({
      orderBy: [{ examId: 'asc' }, { orderIndex: 'asc' }],
      include: {
        exam: { select: { id: true, name: true } },
        _count: { select: { chapters: true, questions: true } },
      },
    }),
    prisma.exam.findMany({
      where:   { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select:  { id: true, name: true },
    }),
  ])
  return { subjects, exams }
}

export default async function SubjectsPage() {
  const { subjects, exams } = await getData()
  return (
    <div>
      <Topbar title="Subjects" subtitle="Manage subjects under each exam" />
      <div className="p-6">
        <SubjectsClient initialSubjects={subjects} exams={exams} />
      </div>
    </div>
  )
}

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Topbar from '@/components/admin/Topbar'
import QuestionForm from '@/components/admin/QuestionForm'

async function getData(id) {
  const [question, exams, subjects, chapters, topics] = await Promise.all([
    prisma.question.findUnique({
      where:   { id: parseInt(id) },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, examId: true } }),
    prisma.chapter.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, subjectId: true } }),
    prisma.topic.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, chapterId: true } }),
  ])
  return { question, exams, subjects, chapters, topics }
}

export default async function EditQuestionPage({ params }) {
  const { question, ...formData } = await getData(params.id)
  if (!question) notFound()

  return (
    <div>
      <Topbar title="Edit Question" subtitle={`Editing question #${question.id}`} />
      <div className="p-6">
        <QuestionForm question={question} {...formData} />
      </div>
    </div>
  )
}

import { prisma } from "@/lib/prisma";
import Topbar from "@/components/admin/Topbar";
import QuestionForm from "@/components/admin/QuestionForm";

async function getFormData() {
  const [exams, subjects, chapters, topics] = await Promise.all([
    prisma.exam.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true, examId: true },
    }),
    prisma.chapter.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true, subjectId: true },
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true, chapterId: true },
    }),
  ]);
  return { exams, subjects, chapters, topics };
}

export default async function NewQuestionPage() {
  const formData = await getFormData();
  return (
    <div>
      <Topbar
        title="Add Question"
        subtitle="Create a new question in the question bank"
      />
      <div className="p-6">
        <QuestionForm {...formData} />
      </div>
    </div>
  );
}

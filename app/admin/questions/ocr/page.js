import { prisma } from "@/lib/prisma";
import Topbar from "@/components/admin/Topbar";
import OcrPage from "@/components/admin/question/ocrPage";

async function getFormData() {
  const [exams, subjects, chapters] = await Promise.all([
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
  ]);
  return { exams, subjects, chapters };
}

export default async function OcrQuestionPage() {
  const { exams, subjects, chapters } = await getFormData();
  return (
    <div>
      <Topbar
        title="Extract Questions from Image"
        subtitle="Upload a textbook photo - AI extracts all questions automatically"
      />
      <OcrPage exams={exams} subjects={subjects} chapters={chapters} />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import Topbar from "@/components/admin/Topbar";
import PaperGenerator from "@/components/admin/test/offline-test/PaperGenerator";

async function getData() {
  const [exams, subjects, chapters, papers] = await Promise.all([
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
    prisma.paperTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          include: { _count: { select: { questions: true } } },
        },
      },
    }),
  ]);
  return { exams, subjects, chapters, papers };
}

export default async function PaperGeneratorPage() {
  const data = await getData();
  return (
    <div>
      <Topbar
        title="Offline Test Paper Generator"
        subtitle="Build and print A4 question papers from your question bank"
      />
      <div className="p-6">
        <PaperGenerator {...data} />
      </div>
    </div>
  );
}

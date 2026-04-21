import { prisma } from "@/lib/prisma";
import Topbar from "@/components/admin/Topbar";
import DuplicatesClient from "./DuplicatesClient";

export default async function DuplicatesPage() {
  const exams = await prisma.exam.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: "asc" },
    select: { id: true, name: true },
  });
  return (
    <div>
      <Topbar
        title="Duplicate Questions"
        subtitle="Find and remove duplicate questions from your question bank"
      />
      <div className="p-6">
        <DuplicatesClient exams={exams} />
      </div>
    </div>
  );
}

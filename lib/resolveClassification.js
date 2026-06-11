import { prisma } from "@/lib/prisma";
export async function resolveClassification(chapterId) {
  if (!chapterId) throw new Error("chapterId is required");

  const chapter = await prisma.chapter.findUnique({
    where: { id: parseInt(chapterId) },
    select: {
      id: true,
      subjectId: true,
      subject: { select: { id: true, examId: true } },
    },
  });

  if (!chapter) throw new Error(`Chapter ${chapterId} not found`);

  return {
    chapterId: chapter.id,
    subjectId: chapter.subjectId,
    examId: chapter.subject.examId,
  };
}

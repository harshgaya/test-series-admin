export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TestPreviewClient from "./TestPreviewClient";

async function getTest(id) {
  return prisma.test.findUnique({
    where: { id: parseInt(id) },
    include: {
      exam: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      testQuestions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              options: { orderBy: { orderIndex: "asc" } },
              subject: { select: { id: true, name: true } },
              chapter: { select: { id: true, name: true } },
              topic: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export default async function TestPreviewPage({ params }) {
  const test = await getTest(params.id);
  if (!test) notFound();

  return <TestPreviewClient test={test} />;
}

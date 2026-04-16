import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Topbar from "@/components/admin/Topbar";
import CrashCourseDetail from "./CrashCourseDetail";

async function getData(id) {
  const [course, tests] = await Promise.all([
    prisma.crashCourse.findUnique({
      where: { id: parseInt(id) },
      include: {
        exam: { select: { id: true, name: true } },
        courseTests: {
          orderBy: { dayNumber: "asc" },
          include: {
            test: {
              select: {
                id: true,
                title: true,
                testType: true,
                durationMins: true,
                totalMarks: true,
                status: true,
                _count: { select: { testQuestions: true } },
              },
            },
          },
        },
      },
    }),
    prisma.test.findMany({
      where: { status: { in: ["PUBLISHED", "CRASH_ONLY", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        testType: true,
        durationMins: true,
        totalMarks: true,
        status: true,
        exam: { select: { name: true } },
        _count: { select: { testQuestions: true } },
      },
    }),
  ]);

  if (!course) return null;
  return { course, tests };
}

export default async function CrashCourseDetailPage({ params }) {
  const data = await getData(params.id);
  if (!data) notFound();

  const { course, tests } = data;

  return (
    <div>
      <Topbar
        title={course.title}
        subtitle={`${course.exam?.name} · ${course.durationDays} Day Course`}
      />
      <div className="p-6">
        <CrashCourseDetail course={course} allTests={tests} />
      </div>
    </div>
  );
}

import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import CrashCoursesClient from './CrashCoursesClient'

async function getData() {
  const [courses, exams] = await Promise.all([
    prisma.crashCourse.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        exam:    { select: { name: true } },
        _count:  { select: { courseTests: true, enrollments: true } },
      },
    }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
  ])
  return { courses, exams }
}

export default async function CrashCoursesPage() {
  const { courses, exams } = await getData()
  return (
    <div>
      <Topbar title="Crash Courses" subtitle="Manage day-by-day structured test series" />
      <div className="p-6">
        <CrashCoursesClient initialCourses={courses} exams={exams} />
      </div>
    </div>
  )
}

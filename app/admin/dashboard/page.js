import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import StatsCard from '@/components/admin/StatsCard'
import {
  MdPeople, MdAssignment, MdAttachMoney,
  MdPersonAdd, MdQuiz, MdLiveTv,
} from 'react-icons/md'

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Get stats from DB
async function getStats() {
  const now       = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalStudents,
    newSignupsToday,
    attemptsToday,
    revenueMonth,
    totalQuestions,
    publishedTests,
    recentStudents,
    topTests,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.testAttempt.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.test.count({ where: { status: 'PUBLISHED' } }),
    prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    }),
    prisma.test.findMany({
      orderBy: { attemptCount: 'desc' },
      take: 5,
      select: { id: true, title: true, testType: true, attemptCount: true },
    }),
  ])

  return {
    totalStudents,
    newSignupsToday,
    attemptsToday,
    revenueMonth: revenueMonth._sum.amount || 0,
    totalQuestions,
    publishedTests,
    recentStudents,
    topTests,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Welcome back! Here's what's happening today." />

      <div className="p-6 space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Total Students"
            value={stats.totalStudents.toLocaleString('en-IN')}
            icon={MdPeople}
            color="blue"
          />
          <StatsCard
            title="New Today"
            value={stats.newSignupsToday}
            icon={MdPersonAdd}
            color="green"
          />
          <StatsCard
            title="Tests Today"
            value={stats.attemptsToday}
            icon={MdAssignment}
            color="purple"
          />
          <StatsCard
            title="Revenue (Month)"
            value={formatCurrency(stats.revenueMonth)}
            icon={MdAttachMoney}
            color="orange"
          />
          <StatsCard
            title="Questions"
            value={stats.totalQuestions.toLocaleString('en-IN')}
            icon={MdQuiz}
            color="blue"
          />
          <StatsCard
            title="Live Tests"
            value={stats.publishedTests}
            icon={MdLiveTv}
            color="red"
          />
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Students */}
          <div className="card">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Recent Students</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest registrations</p>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.recentStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No students yet</p>
              ) : (
                stats.recentStudents.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-bold">
                        {s.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email || s.phone}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Tests */}
          <div className="card">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Most Attempted Tests</h2>
              <p className="text-xs text-gray-500 mt-0.5">By attempt count</p>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.topTests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No tests yet</p>
              ) : (
                stats.topTests.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.testType}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {t.attemptCount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

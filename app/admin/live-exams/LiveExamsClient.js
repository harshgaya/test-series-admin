'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MdLiveTv, MdPeople, MdTimer, MdCancel, MdAdd, MdRadioButtonChecked } from 'react-icons/md'
import Badge from '@/components/ui/Badge'
import AlertDialog from '@/components/ui/AlertDialog'
import EmptyState from '@/components/ui/EmptyState'

function getExamStatus(exam) {
  if (!exam.scheduledAt) return 'unscheduled'
  const now  = new Date()
  const start = new Date(exam.scheduledAt)
  const end   = exam.endedAt ? new Date(exam.endedAt) : null
  if (end && now > end) return 'ended'
  if (now >= start) return 'live'
  return 'upcoming'
}

export default function LiveExamsClient({ initialExams }) {
  const [exams, setExams]           = useState(initialExams)
  const [showCancel, setShowCancel] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [liveStats, setLiveStats]   = useState({})

  // Poll live stats for currently live exams
  useEffect(() => {
    const liveExams = exams.filter(e => getExamStatus(e) === 'live')
    if (liveExams.length === 0) return

    async function fetchStats() {
      for (const exam of liveExams) {
        try {
          const res  = await fetch(`/api/tests/${exam.id}/live-stats`)
          const data = await res.json()
          if (data.success) {
            setLiveStats(prev => ({ ...prev, [exam.id]: data.data }))
          }
        } catch {}
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 15000) // refresh every 15s
    return () => clearInterval(interval)
  }, [exams])

  async function handleCancel() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/tests/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selected, status: 'CANCELLED' }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setExams(exams.map(e => e.id === selected.id ? { ...e, status: 'CANCELLED' } : e))
      toast.success('Exam cancelled!')
      setShowCancel(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  const statusColors = { live: 'red', upcoming: 'blue', ended: 'gray', unscheduled: 'gray' }
  const statusLabels = { live: '🔴 Live Now', upcoming: 'Upcoming', ended: 'Ended', unscheduled: 'Not Scheduled' }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Live Exams ({exams.length})</p>
          <p className="page-subtitle">All India Mock Tests with real-time monitoring</p>
        </div>
        <Link href="/admin/tests/new" className="btn-primary">
          <MdAdd className="text-lg" /> Schedule Live Exam
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="card">
          <EmptyState title="No live exams yet"
            message="Schedule an All India Mock Test to get started"
            action={<Link href="/admin/tests/new" className="btn-primary"><MdAdd />Schedule Now</Link>} />
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map(exam => {
            const status = getExamStatus(exam)
            const stats  = liveStats[exam.id]

            return (
              <div key={exam.id} className={`card p-5 ${status === 'live' ? 'border-2 border-red-200 bg-red-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      status === 'live' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {status === 'live'
                        ? <MdRadioButtonChecked className="text-red-600 text-xl animate-pulse" />
                        : <MdLiveTv className="text-gray-500 text-xl" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{exam.title}</h3>
                        <Badge label={statusLabels[status]} color={statusColors[status]} />
                        <Badge label={exam.status} color={exam.status === 'PUBLISHED' ? 'green' : 'gray'} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{exam.exam?.name}</span>
                        <span>{exam._count.testQuestions} questions</span>
                        <span>{exam.durationMins} minutes</span>
                        {exam.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <MdTimer className="text-sm" />
                            {new Date(exam.scheduledAt).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(status === 'live' || status === 'upcoming') && exam.status !== 'CANCELLED' && (
                      <button onClick={() => { setSelected(exam); setShowCancel(true) }}
                        className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                        <MdCancel className="text-lg" /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Stats */}
                {status === 'live' && (
                  <div className="mt-4 pt-4 border-t border-red-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Live Monitor</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 text-center border border-red-100">
                        <p className="text-2xl font-bold text-blue-600">{stats?.attempting || 0}</p>
                        <p className="text-xs text-gray-500">Currently Attempting</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-red-100">
                        <p className="text-2xl font-bold text-green-600">{stats?.submitted || 0}</p>
                        <p className="text-xs text-gray-500">Submitted</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-red-100">
                        <p className="text-2xl font-bold text-gray-600">{exam._count.attempts}</p>
                        <p className="text-xs text-gray-500">Total Started</p>
                      </div>
                    </div>
                    {stats?.recentSubmissions?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Recent Submissions</p>
                        <div className="space-y-1">
                          {stats.recentSubmissions.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-red-100">
                              <span className="text-gray-700">{s.studentName}</span>
                              <span className="font-medium text-blue-600">{s.score}/{s.totalMarks}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog isOpen={showCancel} title="Cancel Live Exam?"
        message={`Cancel "${selected?.title}"? Students currently attempting will lose their progress.`}
        confirmText="Cancel Exam" confirmColor="red"
        onConfirm={handleCancel} onCancel={() => setShowCancel(false)} loading={loading} />
    </>
  )
}

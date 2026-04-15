'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MdSave, MdArrowBack } from 'react-icons/md'
import { TEST_TYPES, TEST_STATUSES } from '@/lib/constants'

export default function EditTestClient({ test }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title:           test.title,
    description:     test.description || '',
    durationMins:    test.durationMins,
    marksCorrect:    test.marksCorrect,
    negativeMarking: Number(test.negativeMarking),
    price:           Number(test.price),
    showSolutions:   test.showSolutions,
    showAnswers:     test.showAnswers,
    showRank:        test.showRank,
    showLeaderboard: test.showLeaderboard,
    status:          test.status,
    scheduledAt:     test.scheduledAt
      ? new Date(test.scheduledAt).toISOString().slice(0, 16)
      : '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!form.title) { toast.error('Title is required'); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/tests/${test.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Test updated!')
      router.push('/admin/tests')
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  const testTypeLabel = TEST_TYPES.find(t => t.value === test.testType)?.label || test.testType

  return (
    <div className="max-w-3xl space-y-6">

      {/* Info */}
      <div className="card p-5 bg-blue-50 border border-blue-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">Type:</span> <span className="font-medium">{testTypeLabel}</span></div>
          <div><span className="text-gray-500">Exam:</span> <span className="font-medium">{test.exam?.name}</span></div>
          <div><span className="text-gray-500">Questions:</span> <span className="font-medium text-blue-600">{test.testQuestions.length}</span></div>
          <div><span className="text-gray-500">Attempts:</span> <span className="font-medium">{test._count.attempts}</span></div>
          <div><span className="text-gray-500">Total Marks:</span> <span className="font-medium">{test.totalMarks}</span></div>
        </div>
      </div>

      {/* Basic Details */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Basic Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test Title *</label>
          <input className="input-field" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input type="number" className="input-field" value={form.durationMins}
              onChange={e => setForm(f => ({ ...f, durationMins: parseInt(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹0 = Free)</label>
            <input type="number" className="input-field" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marks per Correct</label>
            <input type="number" className="input-field" value={form.marksCorrect}
              onChange={e => setForm(f => ({ ...f, marksCorrect: parseInt(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marking</label>
            <input type="number" step="0.5" className="input-field" value={form.negativeMarking}
              onChange={e => setForm(f => ({ ...f, negativeMarking: parseFloat(e.target.value) }))} />
          </div>
        </div>
        {test.testType === 'LIVE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled At</label>
            <input type="datetime-local" className="input-field w-64" value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
        )}
      </div>

      {/* Visibility */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Visibility Settings</h2>
        <div className="space-y-3">
          {[
            { key: 'showSolutions',  label: 'Show Solutions after test' },
            { key: 'showAnswers',    label: 'Show Correct Answers' },
            { key: 'showRank',       label: 'Show Rank to students' },
            { key: 'showLeaderboard', label: 'Show Leaderboard' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Status</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {TEST_STATUSES.map(s => (
            <button key={s.value}
              onClick={() => setForm(f => ({ ...f, status: s.value }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                form.status === s.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Preview */}
      {test.testQuestions.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">
            Questions ({test.testQuestions.length})
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {test.testQuestions.map((tq, i) => (
              <div key={tq.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-400 w-5 text-xs">{i + 1}</span>
                <span className="flex-1 text-gray-700 truncate">
                  {tq.question?.questionText?.replace(/\$[^$]*\$/g, '[math]').substring(0, 80)}...
                </span>
                <span className={`badge text-xs ${
                  tq.question?.difficulty === 'EASY'   ? 'bg-green-100 text-green-700' :
                  tq.question?.difficulty === 'HARD'   ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{tq.question?.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/tests')} className="btn-secondary">
          <MdArrowBack /> Back to Tests
        </button>
        <button onClick={handleSave} disabled={loading} className="btn-primary px-8">
          <MdSave className="text-lg" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

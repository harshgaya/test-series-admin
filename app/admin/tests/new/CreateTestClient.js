'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MdSearch, MdAdd, MdRemove, MdCheck } from 'react-icons/md'
import { TEST_TYPES, DEFAULT_MARKS_CORRECT, DEFAULT_NEGATIVE_MARKS, DEFAULT_DURATION_MINS } from '@/lib/constants'

const STEPS = ['Test Type', 'Basic Details', 'Add Questions', 'Settings', 'Publish']

export default function CreateTestClient({ exams, subjects, chapters, topics }) {
  const router = useRouter()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 1 - type
  const [testType, setTestType] = useState('')

  // Step 2 - details
  const [details, setDetails] = useState({
    title: '', description: '', examId: '', subjectId: '', chapterId: '', topicId: '',
    durationMins: DEFAULT_DURATION_MINS, marksCorrect: DEFAULT_MARKS_CORRECT,
    negativeMarking: DEFAULT_NEGATIVE_MARKS, attemptLimit: 0, price: 0,
    scheduledAt: '',
  })

  // Step 3 - questions
  const [questionSearch, setQuestionSearch] = useState('')
  const [searchResults, setSearchResults]   = useState([])
  const [selectedQIds, setSelectedQIds]     = useState([])
  const [searching, setSearching]           = useState(false)

  // Step 4 - settings
  const [settings, setSettings] = useState({
    showSolutions: true, showAnswers: true, showRank: true,
    showLeaderboard: true, status: 'DRAFT',
  })

  const filteredSubjects = details.examId  ? subjects.filter(s => s.examId    === parseInt(details.examId))  : subjects
  const filteredChapters = details.subjectId ? chapters.filter(c => c.subjectId === parseInt(details.subjectId)) : chapters
  const filteredTopics   = details.chapterId ? topics.filter(t => t.chapterId  === parseInt(details.chapterId))  : topics

  async function searchQuestions() {
    if (!details.examId) { toast.error('Please select an exam first'); return }
    setSearching(true)
    try {
      const params = new URLSearchParams({ limit: 50 })
      if (details.examId)    params.set('examId',    details.examId)
      if (details.subjectId) params.set('subjectId', details.subjectId)
      if (details.chapterId) params.set('chapterId', details.chapterId)
      if (questionSearch)    params.set('search',    questionSearch)
      params.set('status', 'active')

      const res  = await fetch(`/api/questions?${params}`)
      const data = await res.json()
      if (data.success) setSearchResults(data.data.questions)
    } catch { toast.error('Failed to search questions') }
    finally { setSearching(false) }
  }

  function toggleQuestion(id) {
    setSelectedQIds(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  function truncate(text, len = 70) {
    if (!text) return ''
    const plain = text.replace(/\$[^$]*\$/g, '[math]')
    return plain.length > len ? plain.substring(0, len) + '...' : plain
  }

  async function handleCreate(publishNow = false) {
    if (!testType) { toast.error('Select a test type'); return }
    if (!details.title) { toast.error('Test title is required'); return }
    if (!details.examId) { toast.error('Select an exam'); return }
    if (selectedQIds.length === 0) { toast.error('Add at least one question'); return }

    setLoading(true)
    try {
      const finalStatus = publishNow ? 'PUBLISHED' : settings.status
      const res  = await fetch('/api/tests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...details, testType,
          examId:    parseInt(details.examId),
          subjectId: details.subjectId ? parseInt(details.subjectId) : null,
          chapterId: details.chapterId ? parseInt(details.chapterId) : null,
          topicId:   details.topicId   ? parseInt(details.topicId)   : null,
          ...settings,
          status:      finalStatus,
          questionIds: selectedQIds,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Test created successfully!')
      router.push('/admin/tests')
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl">
      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <MdCheck /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Test Type */}
      {step === 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-1">Select Test Type</h2>
          <p className="text-sm text-gray-500 mb-5">What kind of test do you want to create?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEST_TYPES.map(t => (
              <button key={t.value} onClick={() => setTestType(t.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  testType === t.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}>
                <p className="font-medium text-sm">{t.label}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={() => { if (!testType) { toast.error('Select a type'); return } setStep(1) }}
              className="btn-primary">Next →</button>
          </div>
        </div>
      )}

      {/* Step 1 — Basic Details */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Basic Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Title *</label>
            <input className="input-field" placeholder="e.g. Thermodynamics Chapter Test"
              value={details.title} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
              <select className="input-field" value={details.examId}
                onChange={e => setDetails(d => ({ ...d, examId: e.target.value, subjectId: '', chapterId: '' }))}>
                <option value="">Select Exam</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select className="input-field" value={details.subjectId}
                onChange={e => setDetails(d => ({ ...d, subjectId: e.target.value, chapterId: '' }))}>
                <option value="">Select Subject</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
              <select className="input-field" value={details.chapterId}
                onChange={e => setDetails(d => ({ ...d, chapterId: e.target.value }))}>
                <option value="">Select Chapter</option>
                {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" className="input-field" value={details.durationMins}
                onChange={e => setDetails(d => ({ ...d, durationMins: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marks per Correct Answer</label>
              <input type="number" className="input-field" value={details.marksCorrect}
                onChange={e => setDetails(d => ({ ...d, marksCorrect: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marking</label>
              <input type="number" className="input-field" step="0.5" value={details.negativeMarking}
                onChange={e => setDetails(d => ({ ...d, negativeMarking: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹0 = Free)</label>
              <input type="number" className="input-field" value={details.price}
                onChange={e => setDetails(d => ({ ...d, price: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attempt Limit (0 = unlimited)</label>
              <input type="number" className="input-field" value={details.attemptLimit}
                onChange={e => setDetails(d => ({ ...d, attemptLimit: parseInt(e.target.value) }))} />
            </div>
          </div>
          {testType === 'LIVE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
              <input type="datetime-local" className="input-field w-64" value={details.scheduledAt}
                onChange={e => setDetails(d => ({ ...d, scheduledAt: e.target.value }))} />
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(0)} className="btn-secondary">← Back</button>
            <button onClick={() => {
              if (!details.title || !details.examId) { toast.error('Title and exam required'); return }
              setStep(2)
            }} className="btn-primary">Next →</button>
          </div>
        </div>
      )}

      {/* Step 2 — Questions */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">
              Add Questions <span className="text-blue-600">({selectedQIds.length} selected)</span>
            </h2>
            <div className="flex items-center gap-2">
              <input className="input-field flex-1" placeholder="Search questions..."
                value={questionSearch} onChange={e => setQuestionSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchQuestions()} />
              <button onClick={searchQuestions} disabled={searching} className="btn-primary py-2">
                <MdSearch />  {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="card overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Question</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Chapter</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.map(q => (
                    <tr key={q.id} onClick={() => toggleQuestion(q.id)}
                      className={`cursor-pointer transition-colors ${selectedQIds.includes(q.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" readOnly checked={selectedQIds.includes(q.id)}
                          className="w-4 h-4 text-blue-600 rounded" />
                      </td>
                      <td className="px-3 py-2 text-gray-700">{truncate(q.questionText)}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{q.chapter?.name}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`badge ${q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' : q.difficulty === 'HARD' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {q.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedQIds.length > 0 && (
            <div className="card p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                ✓ {selectedQIds.length} questions selected •
                Total marks: {selectedQIds.length * details.marksCorrect}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            <button onClick={() => {
              if (selectedQIds.length === 0) { toast.error('Add at least one question'); return }
              setStep(3)
            }} className="btn-primary">Next →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Settings */}
      {step === 3 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">Visibility Settings</h2>
          <div className="space-y-4">
            {[
              { key: 'showSolutions',  label: 'Show Solutions after test' },
              { key: 'showAnswers',    label: 'Show Correct Answers after test' },
              { key: 'showRank',       label: 'Show Rank to students' },
              { key: 'showLeaderboard', label: 'Show Leaderboard' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings[key]}
                  onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">Next →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Review & Publish */}
      {step === 4 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">Review & Publish</h2>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium">{details.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{TEST_TYPES.find(t => t.value === testType)?.label}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Questions</span><span className="font-medium text-blue-600">{selectedQIds.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{details.durationMins} minutes</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Marks</span><span className="font-medium">{selectedQIds.length * details.marksCorrect}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-medium">{Number(details.price) === 0 ? 'Free' : `₹${details.price}`}</span></div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-secondary">← Back</button>
            <div className="flex gap-3">
              <button onClick={() => handleCreate(false)} disabled={loading} className="btn-secondary">
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button onClick={() => handleCreate(true)} disabled={loading} className="btn-primary">
                {loading ? 'Publishing...' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

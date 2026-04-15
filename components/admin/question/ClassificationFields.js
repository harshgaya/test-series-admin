'use client'

import { DIFFICULTIES, QUESTION_TYPES } from '@/lib/constants'

export default function ClassificationFields({
  exams, subjects, chapters, topics,
  form, setForm,
  filterExam, setFilterExam,
  filterSub,  setFilterSub,
  filterCh,   setFilterCh,
}) {
  const filteredSubjects = filterExam
    ? subjects.filter(s => s.examId === parseInt(filterExam))
    : subjects

  const filteredChapters = filterSub
    ? chapters.filter(c => c.subjectId === parseInt(filterSub))
    : chapters

  const filteredTopics = filterCh
    ? topics.filter(t => t.chapterId === parseInt(filterCh))
    : topics

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Classification</h2>
      <div className="grid grid-cols-2 gap-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
          <select
            className="input-field"
            value={filterExam}
            onChange={e => {
              setFilterExam(e.target.value)
              setFilterSub('')
              setFilterCh('')
              setForm(f => ({ ...f, examId: e.target.value, subjectId: '', chapterId: '', topicId: '' }))
            }}
          >
            <option value="">Select Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <select
            className="input-field"
            value={filterSub}
            onChange={e => {
              setFilterSub(e.target.value)
              setFilterCh('')
              setForm(f => ({ ...f, subjectId: e.target.value, chapterId: '', topicId: '' }))
            }}
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter *</label>
          <select
            className="input-field"
            value={filterCh}
            onChange={e => {
              setFilterCh(e.target.value)
              setForm(f => ({ ...f, chapterId: e.target.value, topicId: '' }))
            }}
          >
            <option value="">Select Chapter</option>
            {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic <span className="text-gray-400">(optional)</span></label>
          <select
            className="input-field"
            value={form.topicId}
            onChange={e => setForm(f => ({ ...f, topicId: e.target.value }))}
          >
            <option value="">Select Topic</option>
            {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
          <select
            className="input-field"
            value={form.questionType}
            onChange={e => setForm(f => ({ ...f, questionType: e.target.value }))}
          >
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty *</label>
          <select
            className="input-field"
            value={form.difficulty}
            onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
          >
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

      </div>
    </div>
  )
}

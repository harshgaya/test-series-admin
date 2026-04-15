'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff } from 'react-icons/md'
import Modal from '@/components/ui/Modal'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

export default function TopicsClient({ topics: init, exams, subjects, chapters }) {
  const [topics, setTopics]         = useState(init)
  const [filterExam, setFilterExam] = useState('')
  const [filterSub, setFilterSub]   = useState('')
  const [filterCh, setFilterCh]     = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState({ name: '', chapterId: '' })
  const [loading, setLoading]       = useState(false)

  const filteredSubjects  = filterExam ? subjects.filter(s => s.examId === parseInt(filterExam)) : subjects
  const filteredChapters  = filterSub  ? chapters.filter(c => c.subjectId === parseInt(filterSub)) : chapters

  const filtered = topics.filter(t => {
    const exam = t.chapter?.subject?.exam
    const sub  = t.chapter?.subject
    if (filterExam && exam?.id !== parseInt(filterExam)) return false
    if (filterSub  && sub?.id  !== parseInt(filterSub))  return false
    if (filterCh   && t.chapterId !== parseInt(filterCh)) return false
    return true
  })

  async function handleSave() {
    if (!form.name || !form.chapterId) { toast.error('Name and chapter are required'); return }
    setLoading(true)
    try {
      const isEdit = !!selected
      const res    = await fetch(isEdit ? `/api/topics/${selected.id}` : '/api/topics', {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, chapterId: parseInt(form.chapterId) }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }

      const ch  = chapters.find(c => c.id === parseInt(form.chapterId))
      const sub = subjects.find(s => s.id === ch?.subjectId)
      const exam = exams.find(e => e.id === sub?.examId)
      const enriched = {
        ...data.data,
        chapter: { id: ch?.id, name: ch?.name, subject: { id: sub?.id, name: sub?.name, exam: { id: exam?.id, name: exam?.name } } },
        _count: { questions: selected?._count?.questions || 0 },
      }
      if (isEdit) {
        setTopics(topics.map(t => t.id === selected.id ? { ...t, ...enriched } : t))
        toast.success('Topic updated!')
      } else {
        setTopics([...topics, enriched])
        toast.success('Topic created!')
      }
      setShowModal(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/topics/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setTopics(topics.filter(t => t.id !== selected.id))
      toast.success('Topic deleted!')
      setShowDelete(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function toggleActive(topic) {
    try {
      const res  = await fetch(`/api/topics/${topic.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...topic, isActive: !topic.isActive }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setTopics(topics.map(t => t.id === topic.id ? { ...t, isActive: !t.isActive } : t))
    } catch { toast.error('Something went wrong') }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Topics ({filtered.length})</p>
          <p className="page-subtitle">Specific topics inside each chapter</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-field w-32 py-2" value={filterExam}
            onChange={e => { setFilterExam(e.target.value); setFilterSub(''); setFilterCh('') }}>
            <option value="">All Exams</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="input-field w-32 py-2" value={filterSub}
            onChange={e => { setFilterSub(e.target.value); setFilterCh('') }}>
            <option value="">All Subjects</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input-field w-36 py-2" value={filterCh}
            onChange={e => setFilterCh(e.target.value)}>
            <option value="">All Chapters</option>
            {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => { setSelected(null); setForm({ name: '', chapterId: filterCh || '' }); setShowModal(true) }}
            className="btn-primary">
            <MdAdd className="text-lg" /> Add Topic
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No topics found" message="Add topics inside chapters" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Topic', 'Chapter', 'Subject', 'Exam', 'Questions', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.chapter?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.chapter?.subject?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{t.chapter?.subject?.exam?.name}</td>
                  <td className="px-4 py-3 text-gray-700">{t._count.questions}</td>
                  <td className="px-4 py-3">
                    <Badge label={t.isActive ? 'Active' : 'Inactive'} color={t.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(t)} className="p-1 text-gray-400 hover:text-blue-600">
                        {t.isActive ? <MdToggleOn className="text-2xl text-green-500" /> : <MdToggleOff className="text-2xl" />}
                      </button>
                      <button onClick={() => { setSelected(t); setForm({ name: t.name, chapterId: t.chapterId }); setShowModal(true) }}
                        className="p-1 text-gray-400 hover:text-blue-600"><MdEdit className="text-lg" /></button>
                      <button onClick={() => { setSelected(t); setShowDelete(true) }}
                        className="p-1 text-gray-400 hover:text-red-600"><MdDelete className="text-lg" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selected ? 'Edit Topic' : 'Add Topic'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter *</label>
            <select className="input-field" value={form.chapterId}
              onChange={e => setForm({ ...form, chapterId: e.target.value })}>
              <option value="">Select Chapter</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name *</label>
            <input className="input-field" placeholder="e.g. First Law of Thermodynamics"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : selected ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog isOpen={showDelete} title="Delete Topic?"
        message={`Delete "${selected?.name}"?`}
        confirmText="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={loading} />
    </>
  )
}

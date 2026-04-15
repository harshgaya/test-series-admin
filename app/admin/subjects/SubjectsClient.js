'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff, MdFilterList } from 'react-icons/md'
import Modal from '@/components/ui/Modal'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

const EMPTY_FORM = { name: '', slug: '', examId: '', iconUrl: '' }

export default function SubjectsClient({ initialSubjects, exams }) {
  const [subjects, setSubjects]     = useState(initialSubjects)
  const [filterExam, setFilterExam] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [loading, setLoading]       = useState(false)

  const filtered = filterExam
    ? subjects.filter(s => s.examId === parseInt(filterExam))
    : subjects

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  function openAdd() {
    setSelected(null)
    setForm({ ...EMPTY_FORM, examId: filterExam || '' })
    setShowModal(true)
  }

  function openEdit(subject) {
    setSelected(subject)
    setForm({ name: subject.name, slug: subject.slug, examId: subject.examId, iconUrl: subject.iconUrl || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.examId) {
      toast.error('Name, slug and exam are required')
      return
    }
    setLoading(true)
    try {
      const isEdit = !!selected
      const url    = isEdit ? `/api/subjects/${selected.id}` : '/api/subjects'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, examId: parseInt(form.examId) }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      const exam = exams.find(e => e.id === parseInt(form.examId))
      const enriched = { ...data.data, exam: { id: exam.id, name: exam.name }, _count: selected?._count || { chapters: 0, questions: 0 } }

      if (isEdit) {
        setSubjects(subjects.map(s => s.id === selected.id ? { ...s, ...enriched } : s))
        toast.success('Subject updated!')
      } else {
        setSubjects([...subjects, enriched])
        toast.success('Subject created!')
      }
      setShowModal(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/subjects/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setSubjects(subjects.filter(s => s.id !== selected.id))
      toast.success('Subject deleted!')
      setShowDelete(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function toggleActive(subject) {
    try {
      const res  = await fetch(`/api/subjects/${subject.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subject, isActive: !subject.isActive }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setSubjects(subjects.map(s => s.id === subject.id ? { ...s, isActive: !s.isActive } : s))
      toast.success(subject.isActive ? 'Deactivated' : 'Activated')
    } catch { toast.error('Something went wrong') }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Subjects ({filtered.length})</p>
          <p className="page-subtitle">Subjects like Physics, Chemistry, Maths per exam</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-400" />
            <select
              className="input-field w-40 py-2"
              value={filterExam}
              onChange={e => setFilterExam(e.target.value)}
            >
              <option value="">All Exams</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <MdAdd className="text-lg" /> Add Subject
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No subjects found" message="Add subjects to your exams"
            action={<button onClick={openAdd} className="btn-primary"><MdAdd />Add Subject</button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Subject', 'Exam', 'Chapters', 'Questions', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">/{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.exam?.name}</td>
                  <td className="px-4 py-3 text-gray-700">{s._count.chapters}</td>
                  <td className="px-4 py-3 text-gray-700">{s._count.questions}</td>
                  <td className="px-4 py-3">
                    <Badge label={s.isActive ? 'Active' : 'Inactive'} color={s.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(s)} className="text-gray-400 hover:text-blue-600 p-1">
                        {s.isActive ? <MdToggleOn className="text-2xl text-green-500" /> : <MdToggleOff className="text-2xl" />}
                      </button>
                      <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600 p-1">
                        <MdEdit className="text-lg" />
                      </button>
                      <button onClick={() => { setSelected(s); setShowDelete(true) }} className="text-gray-400 hover:text-red-600 p-1">
                        <MdDelete className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={selected ? 'Edit Subject' : 'Add Subject'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
            <select className="input-field" value={form.examId} onChange={e => setForm({ ...form, examId: e.target.value })}>
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input className="input-field" placeholder="e.g. Physics, Chemistry" value={form.name}
              onChange={e => handleNameChange(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input className="input-field" placeholder="e.g. physics" value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : selected ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog isOpen={showDelete} title="Delete Subject?"
        message={`Delete "${selected?.name}"? All chapters and topics will also be deleted.`}
        confirmText="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={loading} />
    </>
  )
}

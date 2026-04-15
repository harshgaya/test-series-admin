'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff, MdSchool } from 'react-icons/md'
import Modal from '@/components/ui/Modal'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

const EMPTY_FORM = { name: '', slug: '', track: 'medical', description: '', logoUrl: '' }

export default function ExamsClient({ initialExams, tracks }) {
  const [exams, setExams]           = useState(initialExams)
  const [showModal, setShowModal]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [loading, setLoading]       = useState(false)

  // Auto-generate slug from name
  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  function openAdd() {
    setSelected(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(exam) {
    setSelected(exam)
    setForm({
      name:        exam.name,
      slug:        exam.slug,
      track:       exam.track,
      description: exam.description || '',
      logoUrl:     exam.logoUrl || '',
    })
    setShowModal(true)
  }

  function openDelete(exam) {
    setSelected(exam)
    setShowDelete(true)
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.track) {
      toast.error('Name, slug and track are required')
      return
    }
    setLoading(true)
    try {
      const isEdit = !!selected
      const url    = isEdit ? `/api/exams/${selected.id}` : '/api/exams'
      const method = isEdit ? 'PUT' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()

      if (!data.success) { toast.error(data.error); return }

      if (isEdit) {
        setExams(exams.map(e => e.id === selected.id ? { ...e, ...data.data } : e))
        toast.success('Exam updated!')
      } else {
        setExams([...exams, { ...data.data, _count: { subjects: 0, questions: 0, tests: 0 } }])
        toast.success('Exam created!')
      }
      setShowModal(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/exams/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setExams(exams.filter(e => e.id !== selected.id))
      toast.success('Exam deleted!')
      setShowDelete(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(exam) {
    try {
      const res  = await fetch(`/api/exams/${exam.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...exam, isActive: !exam.isActive }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setExams(exams.map(e => e.id === exam.id ? { ...e, isActive: !e.isActive } : e))
      toast.success(exam.isActive ? 'Exam deactivated' : 'Exam activated')
    } catch {
      toast.error('Something went wrong')
    }
  }

  const trackLabel = (val) => tracks.find(t => t.value === val)?.label || val

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-title">Exams ({exams.length})</p>
          <p className="page-subtitle">Add and manage exams like NEET, JEE, EAMCET</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <MdAdd className="text-lg" /> Add Exam
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {exams.length === 0 ? (
          <EmptyState
            title="No exams yet"
            message="Add your first exam to get started"
            action={<button onClick={openAdd} className="btn-primary"><MdAdd />Add Exam</button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Track</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subjects</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tests</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map(exam => (
                <tr key={exam.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MdSchool className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{exam.name}</p>
                        <p className="text-xs text-gray-400">/{exam.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={trackLabel(exam.track)}
                      color={exam.track === 'medical' ? 'green' : exam.track === 'engineering' ? 'blue' : 'purple'}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{exam._count.subjects}</td>
                  <td className="px-4 py-3 text-gray-700">{exam._count.questions}</td>
                  <td className="px-4 py-3 text-gray-700">{exam._count.tests}</td>
                  <td className="px-4 py-3">
                    <Badge label={exam.isActive ? 'Active' : 'Inactive'} color={exam.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(exam)} title={exam.isActive ? 'Deactivate' : 'Activate'}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                        {exam.isActive ? <MdToggleOn className="text-2xl text-green-500" /> : <MdToggleOff className="text-2xl" />}
                      </button>
                      <button onClick={() => openEdit(exam)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                        <MdEdit className="text-lg" />
                      </button>
                      <button onClick={() => openDelete(exam)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1">
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selected ? 'Edit Exam' : 'Add New Exam'}
        subtitle={selected ? `Editing ${selected.name}` : 'Fill in the details below'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name *</label>
            <input
              className="input-field"
              placeholder="e.g. NEET UG, JEE Main"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              className="input-field"
              placeholder="e.g. neet, jee-main"
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">URL: /exam/{form.slug || 'slug'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Track *</label>
            <select
              className="input-field"
              value={form.track}
              onChange={e => setForm({ ...form, track: e.target.value })}
            >
              {tracks.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Short description about this exam"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              className="input-field"
              placeholder="https://..."
              value={form.logoUrl}
              onChange={e => setForm({ ...form, logoUrl: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : selected ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <AlertDialog
        isOpen={showDelete}
        title="Delete Exam?"
        message={`Are you sure you want to delete "${selected?.name}"? All subjects, chapters, topics and questions under this exam will also be deleted.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
    </>
  )
}

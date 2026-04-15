'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdBolt, MdToggleOn, MdToggleOff } from 'react-icons/md'
import Modal from '@/components/ui/Modal'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

const EMPTY = { title: '', description: '', examId: '', durationDays: 30, price: 0 }

export default function CrashCoursesClient({ initialCourses, exams }) {
  const [courses, setCourses]       = useState(initialCourses)
  const [showModal, setShowModal]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [loading, setLoading]       = useState(false)

  async function handleSave() {
    if (!form.title || !form.examId) { toast.error('Title and exam are required'); return }
    setLoading(true)
    try {
      const isEdit = !!selected
      const res    = await fetch(isEdit ? `/api/crash-courses/${selected.id}` : '/api/crash-courses', {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, examId: parseInt(form.examId) }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      const exam = exams.find(e => e.id === parseInt(form.examId))
      const enriched = { ...data.data, exam: { name: exam?.name }, _count: selected?._count || { courseTests: 0, enrollments: 0 } }
      if (isEdit) {
        setCourses(courses.map(c => c.id === selected.id ? { ...c, ...enriched } : c))
        toast.success('Course updated!')
      } else {
        setCourses([enriched, ...courses])
        toast.success('Crash course created!')
      }
      setShowModal(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/crash-courses/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setCourses(courses.filter(c => c.id !== selected.id))
      toast.success('Course deleted!')
      setShowDelete(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function toggleActive(course) {
    try {
      const res  = await fetch(`/api/crash-courses/${course.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !course.isActive }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setCourses(courses.map(c => c.id === course.id ? { ...c, isActive: !c.isActive } : c))
      toast.success(course.isActive ? 'Deactivated' : 'Activated')
    } catch { toast.error('Something went wrong') }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Crash Courses ({courses.length})</p>
          <p className="page-subtitle">30/60/90 day structured test series for exam preparation</p>
        </div>
        <button onClick={() => { setSelected(null); setForm(EMPTY); setShowModal(true) }} className="btn-primary">
          <MdAdd className="text-lg" /> Create Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState title="No crash courses yet"
            message="Create a structured day-by-day test series for students"
            action={<button onClick={() => { setSelected(null); setForm(EMPTY); setShowModal(true) }}
              className="btn-primary"><MdAdd />Create Course</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map(course => (
            <div key={course.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MdBolt className="text-orange-600 text-lg" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(course)} className="p-1 text-gray-400 hover:text-blue-600">
                    {course.isActive ? <MdToggleOn className="text-2xl text-green-500" /> : <MdToggleOff className="text-2xl" />}
                  </button>
                  <button onClick={() => { setSelected(course); setForm({ title: course.title, description: course.description || '', examId: course.examId, durationDays: course.durationDays, price: course.price }); setShowModal(true) }}
                    className="p-1 text-gray-400 hover:text-blue-600">
                    <MdEdit className="text-lg" />
                  </button>
                  <button onClick={() => { setSelected(course); setShowDelete(true) }}
                    className="p-1 text-gray-400 hover:text-red-600">
                    <MdDelete className="text-lg" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
              {course.description && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{course.description}</p>}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge label={course.exam?.name} color="blue" />
                <Badge label={`${course.durationDays} Days`} color="orange" />
                <Badge label={Number(course.price) === 0 ? 'Free' : `₹${course.price}`} color={Number(course.price) === 0 ? 'green' : 'purple'} />
                <Badge label={course.isActive ? 'Active' : 'Inactive'} color={course.isActive ? 'green' : 'gray'} />
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <span>{course._count.courseTests} tests</span>
                <span>{course._count.enrollments} enrolled</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={selected ? 'Edit Crash Course' : 'Create Crash Course'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
            <select className="input-field" value={form.examId}
              onChange={e => setForm({ ...form, examId: e.target.value })}>
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
            <input className="input-field" placeholder="e.g. NEET 2026 — 30 Day Crash Course"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field resize-none" rows={3}
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <select className="input-field" value={form.durationDays}
                onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) })}>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹0 = Free)</label>
              <input type="number" className="input-field" value={form.price}
                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : selected ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog isOpen={showDelete} title="Delete Crash Course?"
        message={`Delete "${selected?.title}"? All enrolled students will lose access.`}
        confirmText="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={loading} />
    </>
  )
}

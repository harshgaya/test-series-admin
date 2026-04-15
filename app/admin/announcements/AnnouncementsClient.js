'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff, MdCampaign } from 'react-icons/md'
import Modal from '@/components/ui/Modal'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

const EMPTY = { title: '', message: '', showOnHomepage: true, showOnDashboard: true, expiresAt: '' }

export default function AnnouncementsClient({ initialData }) {
  const [items, setItems]           = useState(initialData)
  const [showModal, setShowModal]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [loading, setLoading]       = useState(false)

  function openAdd() {
    setSelected(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function openEdit(item) {
    setSelected(item)
    setForm({
      title:           item.title,
      message:         item.message,
      showOnHomepage:  item.showOnHomepage,
      showOnDashboard: item.showOnDashboard,
      expiresAt:       item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title || !form.message) { toast.error('Title and message are required'); return }
    setLoading(true)
    try {
      const isEdit = !!selected
      const res    = await fetch(isEdit ? `/api/announcements/${selected.id}` : '/api/announcements', {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }

      if (isEdit) {
        setItems(items.map(i => i.id === selected.id ? { ...i, ...data.data } : i))
        toast.success('Announcement updated!')
      } else {
        setItems([data.data, ...items])
        toast.success('Announcement created!')
      }
      setShowModal(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/announcements/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setItems(items.filter(i => i.id !== selected.id))
      toast.success('Announcement deleted!')
      setShowDelete(false)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function toggleActive(item) {
    try {
      const res  = await fetch(`/api/announcements/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setItems(items.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i))
      toast.success(item.isActive ? 'Deactivated' : 'Activated')
    } catch { toast.error('Something went wrong') }
  }

  const isExpired = (item) => item.expiresAt && new Date(item.expiresAt) < new Date()

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Announcements ({items.length})</p>
          <p className="page-subtitle">Notices shown on homepage and student dashboard</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <MdAdd className="text-lg" /> Add Announcement
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card">
            <EmptyState title="No announcements" message="Add announcements to inform students about upcoming tests and events"
              action={<button onClick={openAdd} className="btn-primary"><MdAdd />Add Announcement</button>} />
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className={`card p-5 ${!item.isActive || isExpired(item) ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MdCampaign className="text-orange-600 text-lg" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <Badge label={item.isActive ? 'Active' : 'Inactive'} color={item.isActive ? 'green' : 'gray'} />
                      {isExpired(item) && <Badge label="Expired" color="red" />}
                      {item.showOnHomepage  && <Badge label="Homepage" color="blue" />}
                      {item.showOnDashboard && <Badge label="Dashboard" color="purple" />}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Created: {new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                      {item.expiresAt && (
                        <span>Expires: {new Date(item.expiresAt).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(item)} className="p-1.5 text-gray-400 hover:text-blue-600">
                    {item.isActive ? <MdToggleOn className="text-2xl text-green-500" /> : <MdToggleOff className="text-2xl" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600">
                    <MdEdit className="text-lg" />
                  </button>
                  <button onClick={() => { setSelected(item); setShowDelete(true) }}
                    className="p-1.5 text-gray-400 hover:text-red-600">
                    <MdDelete className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={selected ? 'Edit Announcement' : 'Add Announcement'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="input-field" placeholder="e.g. NEET Full Mock this Sunday 10am"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea className="input-field resize-none" rows={4}
              placeholder="Full announcement message here..."
              value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires On (optional)</label>
            <input type="date" className="input-field w-48"
              value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showOnHomepage}
                onChange={e => setForm({ ...form, showOnHomepage: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Show on Homepage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showOnDashboard}
                onChange={e => setForm({ ...form, showOnDashboard: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Show on Student Dashboard</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : selected ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog isOpen={showDelete} title="Delete Announcement?"
        message={`Delete "${selected?.title}"?`}
        confirmText="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={loading} />
    </>
  )
}

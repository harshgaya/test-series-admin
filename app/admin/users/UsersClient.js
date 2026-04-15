'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { MdSearch, MdBlock, MdCheckCircle, MdPerson, MdDownload } from 'react-icons/md'
import Badge from '@/components/ui/Badge'
import AlertDialog from '@/components/ui/AlertDialog'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'

export default function UsersClient() {
  const [students, setStudents]     = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selected, setSelected]     = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showBlock, setShowBlock]   = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (search) params.set('search', search)
      const res  = await fetch(`/api/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setStudents(data.data.students)
        setTotal(data.data.total)
        setTotalPages(data.data.totalPages)
      }
    } catch { toast.error('Failed to load students') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  async function openDetail(student) {
    try {
      const res  = await fetch(`/api/users/${student.id}`)
      const data = await res.json()
      if (data.success) { setSelected(data.data); setShowDetail(true) }
    } catch { toast.error('Failed to load student details') }
  }

  async function handleBlock() {
    setActionLoading(true)
    try {
      const res  = await fetch(`/api/users/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !selected.isBlocked }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      const msg = selected.isBlocked ? 'Student unblocked!' : 'Student blocked!'
      toast.success(msg)
      setStudents(students.map(s => s.id === selected.id ? { ...s, isBlocked: !s.isBlocked } : s))
      setShowBlock(false)
    } catch { toast.error('Something went wrong') }
    finally { setActionLoading(false) }
  }

  async function toggleFreeAccess(student) {
    try {
      const res  = await fetch(`/api/users/${student.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeAccess: !student.freeAccess }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setStudents(students.map(s => s.id === student.id ? { ...s, freeAccess: !s.freeAccess } : s))
      toast.success(student.freeAccess ? 'Free access removed' : 'Free access granted!')
    } catch { toast.error('Something went wrong') }
  }

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Students ({total.toLocaleString('en-IN')})</p>
          <p className="page-subtitle">All registered students</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9 w-64" placeholder="Search by name, email, phone..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState title="No students found" message="Students will appear here after registration" />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Student', 'Contact', 'Target Exam', 'Tests', 'Purchases', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-sm font-bold">{s.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <button onClick={() => openDetail(s)} className="font-medium text-blue-600 hover:underline text-left">
                          {s.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 text-xs">{s.email || '—'}</p>
                      <p className="text-gray-500 text-xs">{s.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.targetExam?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{s._count.attempts}</td>
                    <td className="px-4 py-3 text-gray-700">{s._count.purchases}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {s.isBlocked && <Badge label="Blocked" color="red" />}
                        {s.freeAccess && <Badge label="Free Access" color="purple" />}
                        {!s.isBlocked && !s.freeAccess && <Badge label="Normal" color="gray" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleFreeAccess(s)} title={s.freeAccess ? 'Remove free access' : 'Give free access'}
                          className={`text-xs px-2 py-1 rounded font-medium ${s.freeAccess ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                          {s.freeAccess ? 'Remove Free' : 'Free Access'}
                        </button>
                        <button onClick={() => { setSelected(s); setShowBlock(true) }}
                          className={`p-1.5 transition-colors ${s.isBlocked ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-red-600'}`}>
                          {s.isBlocked ? <MdCheckCircle className="text-lg" /> : <MdBlock className="text-lg" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)}
        title={selected?.name} subtitle="Student profile and activity" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">Email</p><p className="font-medium">{selected.email || '—'}</p></div>
              <div><p className="text-gray-400">Phone</p><p className="font-medium">{selected.phone || '—'}</p></div>
              <div><p className="text-gray-400">Target Exam</p><p className="font-medium">{selected.targetExam?.name || '—'}</p></div>
              <div><p className="text-gray-400">Joined</p><p className="font-medium">{new Date(selected.createdAt).toLocaleDateString('en-IN')}</p></div>
              <div><p className="text-gray-400">Total Tests</p><p className="font-medium text-blue-600">{selected._count?.attempts}</p></div>
              <div><p className="text-gray-400">Purchases</p><p className="font-medium text-green-600">{selected._count?.purchases}</p></div>
            </div>

            {selected.attempts?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Recent Attempts</h3>
                <div className="space-y-2">
                  {selected.attempts.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-700">{a.test?.title}</span>
                      <span className="font-medium text-blue-600">{a.score}/{a.totalMarks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Block Dialog */}
      <AlertDialog isOpen={showBlock}
        title={selected?.isBlocked ? 'Unblock Student?' : 'Block Student?'}
        message={selected?.isBlocked
          ? `Unblocking ${selected?.name} will restore their access.`
          : `Blocking ${selected?.name} will prevent them from accessing the platform.`}
        confirmText={selected?.isBlocked ? 'Unblock' : 'Block'}
        confirmColor={selected?.isBlocked ? 'green' : 'red'}
        onConfirm={handleBlock} onCancel={() => setShowBlock(false)} loading={actionLoading} />
    </>
  )
}

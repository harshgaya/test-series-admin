'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MdCheckCircle, MdDelete, MdOpenInNew } from 'react-icons/md'
import Badge from '@/components/ui/Badge'
import AlertDialog from '@/components/ui/AlertDialog'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { REPORT_TYPES } from '@/lib/constants'

export default function FeedbackClient() {
  const [reports, setReports]       = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterType, setFilterType]     = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (filterStatus) params.set('status', filterStatus)
      if (filterType)   params.set('type',   filterType)

      const res  = await fetch(`/api/feedback?${params}`)
      const data = await res.json()
      if (data.success) {
        setReports(data.data.reports)
        setTotal(data.data.total)
        setTotalPages(data.data.totalPages)
      }
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }, [page, filterStatus, filterType])

  useEffect(() => { fetchReports() }, [fetchReports])

  async function handleResolve(report) {
    try {
      const newStatus = report.status === 'resolved' ? 'pending' : 'resolved'
      const res  = await fetch(`/api/feedback/${report.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setReports(reports.map(r => r.id === report.id ? { ...r, status: newStatus } : r))
      toast.success(newStatus === 'resolved' ? 'Marked as resolved!' : 'Marked as pending')
    } catch { toast.error('Something went wrong') }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      const res  = await fetch(`/api/feedback/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      setReports(reports.filter(r => r.id !== selected.id))
      toast.success('Report deleted!')
      setShowDelete(false)
    } catch { toast.error('Something went wrong') }
    finally { setActionLoading(false) }
  }

  const typeLabel = (val) => REPORT_TYPES.find(t => t.value === val)?.label || val

  function truncate(text, len = 100) {
    if (!text) return ''
    const plain = text.replace(/\$[^$]*\$/g, '[math]')
    return plain.length > len ? plain.substring(0, len) + '...' : plain
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Reports ({total})</p>
          <p className="page-subtitle">Questions reported as incorrect or having errors</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field w-32 py-2" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className="input-field w-44 py-2" value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState title="No reports found"
            message={filterStatus === 'pending' ? 'No pending reports. All clear!' : 'No reports match the filter'} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Question', 'Reported By', 'Type', 'Description', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700 text-xs leading-snug">{truncate(r.question?.questionText)}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{r.question?.chapter?.name} · {r.question?.subject?.name}</p>
                      <Link href={`/admin/questions/${r.question?.id}`}
                        className="text-blue-500 text-xs flex items-center gap-1 mt-0.5 hover:underline">
                        <MdOpenInNew className="text-xs" /> View Question
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs">{r.student?.name}</p>
                      <p className="text-gray-400 text-xs">{r.student?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={typeLabel(r.reportType)} color="orange" />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                      {r.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={r.status === 'resolved' ? 'Resolved' : 'Pending'}
                        color={r.status === 'resolved' ? 'green' : 'yellow'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleResolve(r)} title={r.status === 'resolved' ? 'Mark pending' : 'Mark resolved'}
                          className={`p-1.5 transition-colors ${r.status === 'resolved' ? 'text-gray-400 hover:text-yellow-500' : 'text-gray-400 hover:text-green-600'}`}>
                          <MdCheckCircle className="text-lg" />
                        </button>
                        <button onClick={() => { setSelected(r); setShowDelete(true) }}
                          className="p-1.5 text-gray-400 hover:text-red-600">
                          <MdDelete className="text-lg" />
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

      <AlertDialog isOpen={showDelete} title="Delete Report?"
        message="This report will be permanently deleted."
        confirmText="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={actionLoading} />
    </>
  )
}

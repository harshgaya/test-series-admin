'use client'

import { MdChevronLeft, MdChevronRight } from 'react-icons/md'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-secondary py-1.5 px-2 disabled:opacity-40"
        >
          <MdChevronLeft className="text-lg" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-secondary py-1.5 px-2 disabled:opacity-40"
        >
          <MdChevronRight className="text-lg" />
        </button>
      </div>
    </div>
  )
}

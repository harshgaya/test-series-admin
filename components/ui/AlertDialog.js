'use client'

import { MdWarning, MdClose } from 'react-icons/md'

export default function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  confirmColor = 'red',   // red | blue | green
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null

  const btnColors = {
    red:   'bg-red-600 hover:bg-red-700 text-white',
    blue:  'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-150">

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MdClose className="text-xl" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MdWarning className="text-red-600 text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${btnColors[confirmColor]} disabled:opacity-50`}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

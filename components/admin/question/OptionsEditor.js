'use client'

import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md'
import MathEditor from './MathEditor'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export function getEmptyOptions() {
  return OPTION_LABELS.map(label => ({ label, optionText: '', isCorrect: false }))
}

export default function OptionsEditor({ questionType, options, setOptions }) {
  function toggleCorrect(label) {
    if (questionType === 'MULTI_CORRECT') {
      setOptions(options.map(o =>
        o.label === label ? { ...o, isCorrect: !o.isCorrect } : o
      ))
    } else {
      setOptions(options.map(o => ({ ...o, isCorrect: o.label === label })))
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Answer Options</h2>
      <p className="text-xs text-gray-400 mb-4">
        {questionType === 'MULTI_CORRECT'
          ? 'Click the circle to mark multiple correct answers'
          : 'Click the circle to mark the correct answer'}
      </p>
      <div className="space-y-3">
        {options.map(opt => (
          <div
            key={opt.label}
            className="flex items-start gap-3 p-3 rounded-lg border-2 transition-colors"
            style={{
              borderColor: opt.isCorrect ? '#6EE7B7' : '#E5E7EB',
              background:  opt.isCorrect ? '#F0FDF4' : '#F9FAFB',
            }}
          >
            {/* Correct toggle */}
            <button
              type="button"
              onClick={() => toggleCorrect(opt.label)}
              className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
              title={opt.isCorrect ? 'Mark as incorrect' : 'Mark as correct'}
            >
              {opt.isCorrect
                ? <MdCheckCircle className="text-2xl text-green-500" />
                : <MdRadioButtonUnchecked className="text-2xl text-gray-300" />}
            </button>

            {/* Option label badge */}
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-1"
              style={{
                background: opt.isCorrect ? '#D1FAE5' : '#E5E7EB',
                color:      opt.isCorrect ? '#065F46' : '#6B7280',
              }}
            >
              {opt.label}
            </div>

            {/* Math editor for option text */}
            <div className="flex-1">
              <MathEditor
                value={opt.optionText}
                onChange={val => setOptions(options.map(o =>
                  o.label === opt.label ? { ...o, optionText: val } : o
                ))}
                placeholder={`Option ${opt.label}...`}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import MathEditor from './MathEditor'
import FileUpload from './FileUpload'

export default function SolutionFields({ form, setForm }) {
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Solution / Explanation</h2>
      <p className="text-xs text-gray-400 mb-5">
        All fields are optional. Add text explanation, image, audio or video — any combination.
      </p>

      <div className="space-y-5">

        {/* Solution text */}
        <MathEditor
          label="Solution Text"
          hint="(LaTeX supported — optional)"
          value={form.solutionText}
          onChange={val => setForm(f => ({ ...f, solutionText: val }))}
          placeholder="Explain the solution step by step..."
          rows={4}
        />

        {/* Divider */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Media Solution — upload any combination
          </p>
          <div className="grid grid-cols-1 gap-4">

            {/* Solution Image */}
            <FileUpload
              type="image"
              label="Solution Image"
              value={form.solutionImageUrl}
              onChange={val => setForm(f => ({ ...f, solutionImageUrl: val }))}
            />

            {/* Solution Audio */}
            <FileUpload
              type="audio"
              label="Audio Explanation"
              value={form.solutionAudioUrl}
              onChange={val => setForm(f => ({ ...f, solutionAudioUrl: val }))}
            />

            {/* Solution Video */}
            <FileUpload
              type="video"
              label="Video Explanation"
              value={form.solutionVideoUrl}
              onChange={val => setForm(f => ({ ...f, solutionVideoUrl: val }))}
            />

          </div>
        </div>

      </div>
    </div>
  )
}

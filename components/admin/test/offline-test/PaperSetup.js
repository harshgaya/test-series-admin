"use client";

export default function PaperSetup({ paper, setPaper }) {
  function update(key, val) {
    setPaper((p) => ({ ...p, [key]: val }));
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Paper Header</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Institute Name
            </label>
            <input
              className="input-field"
              placeholder="e.g. Sri Chaitanya Institute"
              value={paper.instituteName || ""}
              onChange={(e) => update("instituteName", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Exam Title *
            </label>
            <input
              className="input-field"
              placeholder="e.g. NEET Mock Test - 2024"
              value={paper.examTitle || ""}
              onChange={(e) => update("examTitle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject / Stream
            </label>
            <input
              className="input-field"
              placeholder="e.g. Physics & Chemistry"
              value={paper.subject || ""}
              onChange={(e) => update("subject", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date
            </label>
            <input
              type="date"
              className="input-field"
              value={paper.date || ""}
              onChange={(e) => update("date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Duration
            </label>
            <input
              className="input-field"
              placeholder="e.g. 3 Hours"
              value={paper.duration || ""}
              onChange={(e) => update("duration", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Maximum Marks
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 180"
              value={paper.maxMarks || ""}
              onChange={(e) => update("maxMarks", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Instructions</h3>
        <textarea
          className="input-field resize-none text-sm"
          rows={6}
          placeholder="Enter instructions for students..."
          value={paper.instructions || ""}
          onChange={(e) => update("instructions", e.target.value)}
        />
      </div>

      {/* Print settings */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Print Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Font Size
            </label>
            <div className="flex gap-2">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  onClick={() => update("fontSize", size)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-all"
                  style={{
                    background: paper.fontSize === size ? "#0D9488" : "white",
                    borderColor:
                      paper.fontSize === size ? "#0D9488" : "#D1D5DB",
                    color: paper.fontSize === size ? "white" : "#6B7280",
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Layout
            </label>
            <div className="flex gap-2">
              {[
                { key: false, label: "Single Column" },
                { key: true, label: "Two Column" },
              ].map((opt) => (
                <button
                  key={String(opt.key)}
                  onClick={() => update("twoColumn", opt.key)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all"
                  style={{
                    background:
                      paper.twoColumn === opt.key ? "#0D9488" : "white",
                    borderColor:
                      paper.twoColumn === opt.key ? "#0D9488" : "#D1D5DB",
                    color: paper.twoColumn === opt.key ? "white" : "#6B7280",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6 mt-4">
          {[
            { key: "shuffleQ", label: "Shuffle Questions" },
            { key: "shuffleOpts", label: "Shuffle Options" },
          ].map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={!!paper[toggle.key]}
                onChange={(e) => update(toggle.key, e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#0D9488" }}
              />
              <span className="text-sm text-gray-700">{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import toast from "react-hot-toast";
import AutoBuild from "./addquestions/AutoBuild";
import BulkPick from "./addquestions/BulkPick";
import ManualSearch from "./addquestions/ManualSearch";
import SelectedPanel from "./addquestions/SelectedPanel";

export default function StepAddQuestions({
  details,
  marksCorrect,
  subjects,
  chapters,
  selectedQuestions,
  setSelectedQuestions,
  onNext,
  onBack,
}) {
  function handleAdd(newQuestions) {
    setSelectedQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const unique = newQuestions.filter((q) => !existingIds.has(q.id));
      return [...prev, ...unique];
    });
  }

  function handleRemove(id) {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function handleNext() {
    if (selectedQuestions.length === 0) {
      toast.error("Add at least one question");
      return;
    }
    onNext();
  }

  return (
    <div>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}
      >
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#F0FDFA" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0D9488">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Auto Build
                </p>
                <p className="text-xs text-gray-400">
                  Define rules — system picks questions instantly
                </p>
              </div>
            </div>
            <AutoBuild
              examId={details.examId}
              subjects={subjects}
              chapters={chapters}
              selectedQuestions={selectedQuestions}
              onAdd={handleAdd}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#EFF6FF" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#2563EB">
                  <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.54 15.46 0 12 0S6 2.54 6 4.64c0 .48.11.92.18 1.36H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Bulk Pick</p>
                <p className="text-xs text-gray-400">
                  Click +10, +20, +30 to add from any chapter instantly
                </p>
              </div>
            </div>
            <BulkPick
              examId={details.examId}
              selectedQuestions={selectedQuestions}
              onAdd={handleAdd}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#F5F3FF" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7C3AED">
                  <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Manual Search
                </p>
                <p className="text-xs text-gray-400">
                  Search and handpick specific questions
                </p>
              </div>
            </div>
            <ManualSearch
              examId={details.examId}
              subjects={subjects}
              chapters={chapters}
              selectedQuestions={selectedQuestions}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            top: 24,
            maxHeight: "calc(100vh - 200px)",
          }}
        >
          <SelectedPanel
            selectedQuestions={selectedQuestions}
            onRemove={handleRemove}
            marksCorrect={marksCorrect}
          />
        </div>
      </div>

      <div className="flex justify-between mt-5">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleNext} className="btn-primary">
          Next →
        </button>
      </div>
    </div>
  );
}

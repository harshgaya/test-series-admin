"use client";

import { TEST_TYPES } from "@/lib/constants";

export default function StepReview({
  testType,
  details,
  selectedQIds,
  settings,
  onBack,
  onCreate,
  loading,
}) {
  const testTypeLabel =
    TEST_TYPES.find((t) => t.value === testType)?.label || testType;
  const totalMarks = selectedQIds.length * details.marksCorrect;

  const rows = [
    { label: "Title", value: details.title },
    { label: "Test Type", value: testTypeLabel },
    { label: "Exam", value: details.examId },
    {
      label: "Questions",
      value: `${selectedQIds.length} questions`,
      highlight: true,
    },
    { label: "Duration", value: `${details.durationMins} minutes` },
    { label: "Total Marks", value: totalMarks, highlight: true },
    {
      label: "Marking",
      value: `+${details.marksCorrect} correct / ${details.negativeMarking} wrong`,
    },
    {
      label: "Price",
      value: Number(details.price) === 0 ? "Free" : `₹${details.price}`,
    },
    {
      label: "Solutions",
      value: settings.showSolutions ? "Visible to students" : "Hidden",
    },
    {
      label: "Leaderboard",
      value: settings.showLeaderboard ? "Visible to students" : "Hidden",
    },
  ];

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-5">Review & Publish</h2>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-6">
        {rows.map(({ label, value, highlight }) => (
          <div key={label} className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{label}</span>
            <span
              className="text-sm font-medium"
              style={{ color: highlight ? "#0D9488" : "#0F172A" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onCreate(false)}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => onCreate(true)}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Publishing..." : "Publish Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import toast from "react-hot-toast";

export default function StepBasicDetails({
  details,
  setDetails,
  testType,
  exams,
  subjects,
  chapters,
  topics,
  onNext,
  onBack,
}) {
  const filteredSubjects = details.examId
    ? subjects.filter((s) => s.examId === parseInt(details.examId))
    : subjects;

  const filteredChapters = details.subjectId
    ? chapters.filter((c) => c.subjectId === parseInt(details.subjectId))
    : chapters;

  const filteredTopics = details.chapterId
    ? topics.filter((t) => t.chapterId === parseInt(details.chapterId))
    : topics;

  function handleNext() {
    if (!details.title) {
      toast.error("Test title is required");
      return;
    }
    if (!details.examId) {
      toast.error("Please select an exam");
      return;
    }
    onNext();
  }

  function set(key, value) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Basic Details</h2>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Title *
        </label>
        <input
          className="input-field"
          placeholder="e.g. Thermodynamics Chapter Test"
          value={details.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Short description about this test"
          value={details.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Exam */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exam *
          </label>
          <select
            className="input-field"
            value={details.examId}
            onChange={(e) => set("examId", e.target.value)}
          >
            <option value="">Select Exam</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <select
            className="input-field"
            value={details.subjectId}
            onChange={(e) => set("subjectId", e.target.value)}
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chapter
          </label>
          <select
            className="input-field"
            value={details.chapterId}
            onChange={(e) => set("chapterId", e.target.value)}
          >
            <option value="">Select Chapter</option>
            {filteredChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic
          </label>
          <select
            className="input-field"
            value={details.topicId}
            onChange={(e) => set("topicId", e.target.value)}
          >
            <option value="">Select Topic</option>
            {filteredTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            className="input-field"
            value={details.durationMins}
            onChange={(e) => set("durationMins", parseInt(e.target.value))}
          />
        </div>

        {/* Marks correct */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marks per Correct
          </label>
          <input
            type="number"
            className="input-field"
            value={details.marksCorrect}
            onChange={(e) => set("marksCorrect", parseInt(e.target.value))}
          />
        </div>

        {/* Negative marking */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Negative Marking
          </label>
          <input
            type="number"
            step="0.5"
            className="input-field"
            value={details.negativeMarking}
            onChange={(e) => set("negativeMarking", parseFloat(e.target.value))}
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (₹0 = Free)
          </label>
          <input
            type="number"
            className="input-field"
            value={details.price}
            onChange={(e) => set("price", parseFloat(e.target.value))}
          />
        </div>

        {/* Attempt limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attempt Limit (0 = unlimited)
          </label>
          <input
            type="number"
            className="input-field"
            value={details.attemptLimit}
            onChange={(e) => set("attemptLimit", parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Schedule (live only) */}
      {testType === "LIVE" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schedule Date & Time
          </label>
          <input
            type="datetime-local"
            className="input-field w-64"
            value={details.scheduledAt}
            onChange={(e) => set("scheduledAt", e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-between pt-2">
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

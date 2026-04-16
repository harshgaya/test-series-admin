"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdVideoLibrary,
  MdPictureAsPdf,
  MdBook,
  MdAssignment,
  MdArrowBack,
} from "react-icons/md";
import Modal from "@/components/ui/Modal";
import AlertDialog from "@/components/ui/AlertDialog";
import FileUpload from "@/components/admin/question/FileUpload";
import Badge from "@/components/ui/Badge";

const ACCENT = "#0D9488";
const ACCENT_LIGHT = "#F0FDFA";
const ACCENT_TEXT = "#0F766E";

const STATUS_COLORS = {
  PUBLISHED: "green",
  CRASH_ONLY: "purple",
  DRAFT: "gray",
  SCHEDULED: "blue",
  CANCELLED: "red",
};

const TEST_TYPE_LABELS = {
  TOPIC: "Topic",
  CHAPTER: "Chapter",
  SECTIONAL: "Sectional",
  SUBJECT: "Subject",
  FULL_MOCK: "Full Mock",
  PYP: "PYP",
  LIVE: "Live",
  FREE: "Free",
  SCHOLARSHIP: "Scholarship",
  SPEED: "Speed",
  DPT: "DPT",
  MICRO: "Micro",
  CONCEPT: "Concept",
  DIFFICULTY_LADDER: "Difficulty Ladder",
  NTA_SIMULATOR: "NTA Simulator",
};

const EMPTY_FORM = {
  testId: "",
  topicName: "",
  notesUrl: "",
  videoUrl: "",
};

export default function CrashCourseDetail({ course, allTests }) {
  // Build days map from existing assignments
  const initialDays = {};
  for (const ct of course.courseTests) {
    initialDays[ct.dayNumber] = ct;
  }

  const [days, setDays] = useState(initialDays);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [searchTest, setSearchTest] = useState("");

  const totalDays = course.durationDays;
  const assignedDays = Object.keys(days).length;

  // Filter tests by search
  const filteredTests = allTests.filter(
    (t) =>
      !searchTest || t.title.toLowerCase().includes(searchTest.toLowerCase()),
  );

  function openAssign(dayNumber) {
    setSelectedDay(dayNumber);
    const existing = days[dayNumber];
    setForm({
      testId: existing?.testId || "",
      topicName: existing?.topicName || "",
      notesUrl: existing?.notesUrl || "",
      videoUrl: existing?.videoUrl || "",
    });
    setSearchTest("");
    setShowModal(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/crash-courses/${course.id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayNumber: selectedDay,
          testId: form.testId || null,
          topicName: form.topicName || null,
          notesUrl: form.notesUrl || null,
          videoUrl: form.videoUrl || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      setDays((d) => ({ ...d, [selectedDay]: data.data }));
      toast.success(`Day ${selectedDay} updated!`);
      setShowModal(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/crash-courses/${course.id}/days/${selectedDay}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      setDays((d) => {
        const copy = { ...d };
        delete copy[selectedDay];
        return copy;
      });
      toast.success(`Day ${selectedDay} cleared!`);
      setShowDelete(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const selectedTest = allTests.find((t) => t.id === parseInt(form.testId));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/crash-courses"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <MdArrowBack className="text-xl" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {course.title}
              </h1>
              <Badge
                label={course.isActive ? "Active" : "Inactive"}
                color={course.isActive ? "green" : "gray"}
              />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {course.exam?.name} · {course.durationDays} days ·
              <span style={{ color: ACCENT }} className="font-medium">
                {" "}
                {assignedDays} of {totalDays} days assigned
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Course Progress</p>
          <p className="text-sm font-bold" style={{ color: ACCENT }}>
            {assignedDays}/{totalDays} days
          </p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${(assignedDays / totalDays) * 100}%`,
              background: ACCENT,
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{assignedDays} assigned</span>
          <span>{totalDays - assignedDays} remaining</span>
        </div>
      </div>

      {/* Day Grid */}
      <div className="space-y-2">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const assigned = days[day];
          const test = assigned?.test;

          return (
            <div
              key={day}
              className="card p-4"
              style={{
                borderLeft: assigned
                  ? `3px solid ${ACCENT}`
                  : "3px solid #E5E7EB",
              }}
            >
              <div className="flex items-start gap-4">
                {/* Day number */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: assigned ? ACCENT_LIGHT : "#F9FAFB",
                    color: assigned ? ACCENT_TEXT : "#9CA3AF",
                    border: assigned
                      ? `1px solid #99F6E4`
                      : "1px solid #E5E7EB",
                  }}
                >
                  {day}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {assigned ? (
                    <div>
                      {/* Test */}
                      {test ? (
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <MdAssignment className="text-gray-400 text-sm flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {test.title}
                          </p>
                          <Badge
                            label={
                              TEST_TYPE_LABELS[test.testType] || test.testType
                            }
                            color="blue"
                          />
                          <Badge
                            label={test.status}
                            color={STATUS_COLORS[test.status] || "gray"}
                          />
                          <span className="text-xs text-gray-400">
                            {test._count.testQuestions} questions ·{" "}
                            {test.durationMins} min · {test.totalMarks} marks
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 mb-1">
                          No test assigned
                        </p>
                      )}

                      {/* Topic */}
                      {assigned.topicName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <MdBook className="text-gray-400 text-xs flex-shrink-0" />
                          <p className="text-xs text-gray-600">
                            {assigned.topicName}
                          </p>
                        </div>
                      )}

                      {/* Notes + Video */}
                      <div className="flex items-center gap-3 mt-1">
                        {assigned.notesUrl && (
                          <a
                            href={assigned.notesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: ACCENT }}
                          >
                            <MdPictureAsPdf className="text-sm" /> Notes PDF
                          </a>
                        )}
                        {assigned.videoUrl && (
                          <a
                            href={assigned.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: "#7C3AED" }}
                          >
                            <MdVideoLibrary className="text-sm" /> Video
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Not assigned yet</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openAssign(day)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: assigned ? ACCENT_LIGHT : "#F9FAFB",
                      color: assigned ? ACCENT_TEXT : "#6B7280",
                      border: assigned
                        ? `1px solid #99F6E4`
                        : "1px solid #E5E7EB",
                    }}
                  >
                    {assigned ? (
                      <MdEdit className="text-sm" />
                    ) : (
                      <MdAdd className="text-sm" />
                    )}
                    {assigned ? "Edit" : "Assign"}
                  </button>
                  {assigned && (
                    <button
                      onClick={() => {
                        setSelectedDay(day);
                        setShowDelete(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <MdDelete className="text-base" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Day ${selectedDay} — Assign Content`}
        subtitle="Assign a test and optional study material"
      >
        <div className="space-y-4">
          {/* Topic name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic to Study <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Thermodynamics — First Law"
              value={form.topicName}
              onChange={(e) =>
                setForm((f) => ({ ...f, topicName: e.target.value }))
              }
            />
          </div>

          {/* Test selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Test <span className="text-gray-400">(optional)</span>
            </label>

            {/* Search */}
            <input
              className="input-field mb-2"
              placeholder="Search tests..."
              value={searchTest}
              onChange={(e) => setSearchTest(e.target.value)}
            />

            {/* Selected test preview */}
            {selectedTest && (
              <div
                className="flex items-center gap-2 p-2.5 rounded-lg mb-2"
                style={{
                  background: ACCENT_LIGHT,
                  border: `1px solid #99F6E4`,
                }}
              >
                <MdCheckCircle style={{ color: ACCENT, fontSize: 16 }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: ACCENT_TEXT }}
                  >
                    {selectedTest.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedTest._count.testQuestions} questions ·{" "}
                    {selectedTest.durationMins} min
                  </p>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, testId: "" }))}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Test list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              {filteredTests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No tests found
                </p>
              ) : (
                filteredTests.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setForm((f) => ({ ...f, testId: t.id }))}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                    style={{
                      background: form.testId === t.id ? ACCENT_LIGHT : "white",
                    }}
                    onMouseEnter={(e) => {
                      if (form.testId !== t.id)
                        e.currentTarget.style.background = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      if (form.testId !== t.id)
                        e.currentTarget.style.background = "white";
                    }}
                  >
                    {form.testId === t.id ? (
                      <MdCheckCircle
                        style={{ color: ACCENT, fontSize: 16, flexShrink: 0 }}
                      />
                    ) : (
                      <MdRadioButtonUnchecked
                        style={{
                          color: "#D1D5DB",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t.exam?.name} · {t._count.testQuestions} questions ·{" "}
                        {t.durationMins} min
                      </p>
                    </div>
                    <Badge
                      label={t.status}
                      color={STATUS_COLORS[t.status] || "gray"}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes PDF */}
          <FileUpload
            type="image"
            label="Notes PDF (optional)"
            value={form.notesUrl}
            onChange={(val) => setForm((f) => ({ ...f, notesUrl: val }))}
          />

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL{" "}
              <span className="text-gray-400">(optional — Bunny Stream)</span>
            </label>
            <input
              className="input-field"
              placeholder="https://iframe.mediadelivery.net/..."
              value={form.videoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, videoUrl: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Saving..." : `Save Day ${selectedDay}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <AlertDialog
        isOpen={showDelete}
        title={`Clear Day ${selectedDay}?`}
        message="This will remove the test and all content assigned to this day."
        confirmText="Clear Day"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
    </>
  );
}

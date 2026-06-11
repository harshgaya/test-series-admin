"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { MdAdd, MdExpandMore, MdExpandLess, MdClose } from "react-icons/md";

const EXAM_BADGE_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#FED7AA", text: "#9A3412" },
  { bg: "#DDD6FE", text: "#5B21B6" },
  { bg: "#BBF7D0", text: "#14532D" },
  { bg: "#FECDD3", text: "#9F1239" },
];

export default function BulkPick({ examId, selectedQuestions, onAdd }) {
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [custom, setCustom] = useState({});
  const [allExams, setAllExams] = useState([]);
  const [extraExamIds, setExtraExamIds] = useState([]);

  // Color map for exam badges
  const examColorMap = {};
  [parseInt(examId), ...extraExamIds].filter(Boolean).forEach((eid, idx) => {
    examColorMap[eid] = EXAM_BADGE_COLORS[idx % EXAM_BADGE_COLORS.length];
  });

  const showExamBadges = extraExamIds.length > 0;

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAllExams(d.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!examId) return;
    fetchGrouped();
  }, [examId, extraExamIds]);

  async function fetchGrouped() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ groupByChapter: "true", examId });
      if (extraExamIds.length > 0)
        params.set("extraExamIds", extraExamIds.join(","));
      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setGrouped(data.data);
        if (data.data.length > 0) {
          setExpanded({ [data.data[0].subjectId]: true });
        }
      }
    } catch {
      toast.error("Failed to load chapters");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAdd(chapterId, count, subjectId) {
    const key = `${chapterId}-${count}`;
    setAdding(key);
    try {
      const excludeIds = selectedQuestions.map((q) => q.id);
      const res = await fetch("/api/questions/auto-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            {
              examId: parseInt(examId),
              subjectId,
              chapterIds: [chapterId],
              count,
              type: "BOTH",
              difficulty: { EASY: 33, MEDIUM: 34, HARD: 33 },
            },
          ],
          excludeIds,
          extraExamIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      const questions = data.data.questions;
      if (questions.length === 0) {
        toast.error("Not enough questions in this chapter.");
        return;
      }
      onAdd(questions);
      // Clear custom input for this chapter
      setCustom((c) => {
        const n = { ...c };
        delete n[chapterId];
        return n;
      });
      toast.success(`${questions.length} questions added!`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdding(null);
    }
  }

  function toggleSubject(subjectId) {
    setExpanded((e) => ({ ...e, [subjectId]: !e[subjectId] }));
  }

  function addExtraExam(eid) {
    if (!eid) return;
    setExtraExamIds((prev) => [...prev, parseInt(eid)]);
  }

  function removeExtraExam(eid) {
    setExtraExamIds((prev) => prev.filter((id) => id !== eid));
  }

  const availableExtraExams = allExams.filter(
    (e) => e.id !== parseInt(examId) && !extraExamIds.includes(e.id),
  );

  if (!examId) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-400">
          Select an exam in Basic Details to see chapters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Also pull from */}
      <div
        className="p-3 rounded-xl"
        style={{
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Also pull questions from{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>

        {extraExamIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {extraExamIds.map((eid) => {
              const exam = allExams.find((e) => e.id === eid);
              if (!exam) return null;
              const color = examColorMap[eid] || EXAM_BADGE_COLORS[0];
              return (
                <span
                  key={eid}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: color.bg, color: color.text }}
                >
                  {exam.name}
                  <button
                    onClick={() => removeExtraExam(eid)}
                    className="hover:opacity-60 transition-opacity ml-0.5"
                  >
                    <MdClose style={{ fontSize: 11 }} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {availableExtraExams.length > 0 ? (
          <select
            className="input-field py-1.5 text-sm"
            value=""
            onChange={(e) => addExtraExam(e.target.value)}
          >
            <option value="">+ Add exam source</option>
            {availableExtraExams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        ) : extraExamIds.length === 0 ? (
          <p className="text-xs text-gray-400">No other exams available</p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div
            className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: "#0D9488" }}
          />
        </div>
      ) : grouped.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-400">
            No chapters with questions found
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map((subject) => {
            const totalQ = subject.chapters.reduce(
              (sum, c) => sum + c.count,
              0,
            );
            const isExpanded = expanded[subject.subjectId];

            return (
              <div
                key={subject.subjectId}
                className="rounded-xl overflow-hidden"
                style={{ border: "0.5px solid var(--color-border-tertiary)" }}
              >
                {/* Subject header */}
                <button
                  onClick={() => toggleSubject(subject.subjectId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
                  style={{
                    background: isExpanded
                      ? "#F0FDFA"
                      : "var(--color-background-secondary)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isExpanded
                          ? "#0F766E"
                          : "var(--color-text-primary)",
                      }}
                    >
                      {subject.subjectName}
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: isExpanded ? "#CCFBF1" : "#F1F5F9",
                        color: isExpanded ? "#0F766E" : "#64748B",
                      }}
                    >
                      {totalQ.toLocaleString()} questions
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {subject.chapters.length} chapters
                    </span>
                  </div>
                  {isExpanded ? (
                    <MdExpandLess
                      style={{ fontSize: 18, color: "#0D9488", flexShrink: 0 }}
                    />
                  ) : (
                    <MdExpandMore
                      style={{
                        fontSize: 18,
                        color: "var(--color-text-secondary)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>

                {/* Chapter rows */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "0.5px solid var(--color-border-tertiary)",
                    }}
                  >
                    {subject.chapters.map((chapter, ci) => {
                      const isAdding = adding?.startsWith(
                        `${chapter.chapterId}-`,
                      );
                      const countColor =
                        chapter.count >= 50
                          ? "#15803D"
                          : chapter.count >= 20
                            ? "#D97706"
                            : "#DC2626";

                      return (
                        <div
                          key={chapter.chapterId}
                          className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-gray-50"
                          style={{
                            borderTop:
                              ci > 0
                                ? "0.5px solid var(--color-border-tertiary)"
                                : "none",
                          }}
                        >
                          {/* Chapter name + exam badge + count */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Exam badge - only when multiple exams */}
                              {showExamBadges && chapter.examId && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                                  style={{
                                    background: (
                                      examColorMap[chapter.examId] ||
                                      EXAM_BADGE_COLORS[0]
                                    ).bg,
                                    color: (
                                      examColorMap[chapter.examId] ||
                                      EXAM_BADGE_COLORS[0]
                                    ).text,
                                  }}
                                >
                                  {chapter.examName}
                                </span>
                              )}
                              <p className="text-sm text-gray-700 truncate">
                                {chapter.chapterName}
                              </p>
                            </div>
                            <p
                              className="text-[11px] font-semibold mt-0.5"
                              style={{ color: countColor }}
                            >
                              {chapter.count} questions
                            </p>
                          </div>

                          {/* Add buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Quick add buttons - only show if enough questions */}
                            {[10, 20, 30, 50].map((n) => {
                              if (n > chapter.count) return null;
                              const key = `${chapter.chapterId}-${n}`;
                              const isThisAdding = adding === key;
                              return (
                                <button
                                  key={n}
                                  onClick={() =>
                                    handleBulkAdd(
                                      chapter.chapterId,
                                      n,
                                      subject.subjectId,
                                    )
                                  }
                                  disabled={!!adding}
                                  className="text-xs px-2 py-1 rounded-md font-semibold transition-all"
                                  style={{
                                    background: isThisAdding
                                      ? "#0D9488"
                                      : "#F0FDFA",
                                    border: "0.5px solid #0D9488",
                                    color: isThisAdding ? "white" : "#0D9488",
                                    opacity: adding && !isThisAdding ? 0.5 : 1,
                                    minWidth: 32,
                                  }}
                                >
                                  {isThisAdding ? "..." : `+${n}`}
                                </button>
                              );
                            })}

                            {/* Custom input */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="input-field text-xs py-1 text-center"
                                style={{ width: 56 }}
                                placeholder="N"
                                min={1}
                                max={chapter.count}
                                value={custom[chapter.chapterId] || ""}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) =>
                                  setCustom((c) => ({
                                    ...c,
                                    [chapter.chapterId]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                disabled={!!adding}
                                onClick={() => {
                                  const n = parseInt(custom[chapter.chapterId]);
                                  if (!n || n < 1) {
                                    toast.error("Enter a valid number");
                                    return;
                                  }
                                  if (n > chapter.count) {
                                    toast.error(
                                      `Only ${chapter.count} questions available`,
                                    );
                                    return;
                                  }
                                  handleBulkAdd(
                                    chapter.chapterId,
                                    n,
                                    subject.subjectId,
                                  );
                                }}
                                className="p-1.5 rounded-md transition-all"
                                style={{
                                  background: adding ? "#E2E8F0" : "#0D9488",
                                  color: "white",
                                  opacity: adding ? 0.6 : 1,
                                }}
                              >
                                <MdAdd style={{ fontSize: 14 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { MdAdd, MdExpandMore, MdExpandLess } from "react-icons/md";

export default function BulkPick({ examId, selectedQuestions, onAdd }) {
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [custom, setCustom] = useState({});

  useEffect(() => {
    if (!examId) return;
    fetchGrouped();
  }, [examId]);

  async function fetchGrouped() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/questions?groupByChapter=true&examId=${examId}`,
      );
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
              subjectId,
              chapterIds: [chapterId],
              count,
              type: "BOTH",
              difficulty: { EASY: 33, MEDIUM: 34, HARD: 33 },
            },
          ],
          excludeIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      const questions = data.data.questions;
      if (questions.length === 0) {
        toast.error(`Not enough questions in this chapter. Found 0.`);
        return;
      }
      onAdd(questions);
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

  if (!examId) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-400">
          Select an exam in Basic Details to see chapters
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div
          className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
          style={{ borderTopColor: "#0D9488" }}
        />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-400">
          No chapters with questions found for this exam
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {grouped.map((subject) => (
        <div
          key={subject.subjectId}
          className="rounded-lg overflow-hidden"
          style={{ border: "0.5px solid var(--color-border-tertiary)" }}
        >
          <button
            onClick={() => toggleSubject(subject.subjectId)}
            className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
            style={{
              background: expanded[subject.subjectId]
                ? "#F0FDFA"
                : "var(--color-background-secondary)",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{
                color: expanded[subject.subjectId]
                  ? "#0F766E"
                  : "var(--color-text-primary)",
              }}
            >
              {subject.subjectName}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {subject.chapters.reduce((sum, c) => sum + c.count, 0)}{" "}
                questions
              </span>
              {expanded[subject.subjectId] ? (
                <MdExpandLess style={{ fontSize: 18, color: "#0D9488" }} />
              ) : (
                <MdExpandMore
                  style={{ fontSize: 18, color: "var(--color-text-secondary)" }}
                />
              )}
            </div>
          </button>

          {expanded[subject.subjectId] && (
            <div
              className="divide-y"
              style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}
            >
              {subject.chapters.map((chapter) => (
                <div
                  key={chapter.chapterId}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {chapter.chapterName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {chapter.count} questions
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[10, 20, 30].map(
                      (n) =>
                        n <= chapter.count && (
                          <button
                            key={n}
                            onClick={() =>
                              handleBulkAdd(
                                chapter.chapterId,
                                n,
                                subject.subjectId,
                              )
                            }
                            disabled={adding === `${chapter.chapterId}-${n}`}
                            className="text-xs px-2 py-1 rounded-md font-medium transition-all"
                            style={{
                              background:
                                adding === `${chapter.chapterId}-${n}`
                                  ? "#F0FDFA"
                                  : "white",
                              border: "0.5px solid #0D9488",
                              color: "#0D9488",
                            }}
                          >
                            {adding === `${chapter.chapterId}-${n}`
                              ? "..."
                              : `+${n}`}
                          </button>
                        ),
                    )}

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="input-field text-xs py-1 text-center"
                        style={{ width: 70 }}
                        placeholder="N"
                        min={1}
                        max={chapter.count}
                        value={custom[chapter.chapterId] || ""}
                        onChange={(e) =>
                          setCustom((c) => ({
                            ...c,
                            [chapter.chapterId]: e.target.value,
                          }))
                        }
                      />
                      <button
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
                        style={{ background: "#0D9488", color: "white" }}
                      >
                        <MdAdd style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

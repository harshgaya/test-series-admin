"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdDelete,
  MdBolt,
  MdSearch,
  MdExpandMore,
  MdExpandLess,
  MdClose,
  MdDragIndicator,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
} from "react-icons/md";
import MathDisplay from "../../question/MathDisplay";

const DIFFICULTY_PRESETS = [
  { label: "Easy", values: { EASY: 60, MEDIUM: 30, HARD: 10 } },
  { label: "Balanced", values: { EASY: 30, MEDIUM: 50, HARD: 20 } },
  { label: "Hard", values: { EASY: 10, MEDIUM: 40, HARD: 50 } },
  { label: "Custom", values: null },
];

const EXAM_BADGE_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#FED7AA", text: "#9A3412" },
  { bg: "#DDD6FE", text: "#5B21B6" },
  { bg: "#BBF7D0", text: "#14532D" },
  { bg: "#FECDD3", text: "#9F1239" },
];

// ── Search tab ────────────────────────────────────────────────────────────────
function SearchPicker({ exams, onAddQuestion, selectedIds }) {
  const [searchExam, setSearchExam] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: query, limit: 20 });
      if (searchExam) params.set("examId", searchExam);
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) setResults(data.data.questions || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Filter by Exam
        </label>
        <select
          className="input-field py-2 text-sm w-full"
          value={searchExam}
          onChange={(e) => setSearchExam(e.target.value)}
        >
          <option value="">All Exams</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="input-field py-2.5 text-sm flex-1"
          placeholder="Search questions by keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary py-2.5 px-4 flex items-center gap-1.5"
          disabled={loading}
        >
          <MdSearch style={{ fontSize: 18 }} />
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {results.map((q) => {
            const already = selectedIds.has(q.id);
            return (
              <div
                key={q.id}
                className="flex items-start gap-3 p-3 rounded-lg border transition-all"
                style={{
                  borderColor: already ? "#86EFAC" : "#E2E8F0",
                  background: already ? "#F0FDF4" : "white",
                }}
              >
                <div className="flex-1 min-w-0">
                  <MathDisplay
                    text={q.questionText}
                    className="text-sm text-gray-800"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {q.exam?.name} · {q.subject?.name} · {q.chapter?.name} ·{" "}
                    {q.difficulty}
                  </p>
                </div>
                <button
                  onClick={() => !already && onAddQuestion(q)}
                  disabled={already}
                  className="text-xs px-2.5 py-1 rounded-lg font-semibold flex-shrink-0 transition-all"
                  style={{
                    background: already ? "#DCFCE7" : "#0D9488",
                    color: already ? "#15803D" : "white",
                  }}
                >
                  {already ? "Added" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <p className="text-sm text-gray-400 text-center py-4">
          No results found
        </p>
      )}
    </div>
  );
}

// ── BulkPick tab ──────────────────────────────────────────────────────────────
function BulkPickTab({ exams, selectedIds, onAddQuestions }) {
  const [allExams, setAllExams] = useState([]);
  const [primaryExamId, setPrimaryExamId] = useState("");
  const [extraExamIds, setExtraExamIds] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [custom, setCustom] = useState({});

  const examColorMap = {};
  [parseInt(primaryExamId), ...extraExamIds]
    .filter(Boolean)
    .forEach((eid, idx) => {
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
    if (!primaryExamId) return;
    fetchGrouped();
  }, [primaryExamId, JSON.stringify(extraExamIds)]);

  async function fetchGrouped() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        groupByChapter: "true",
        examId: primaryExamId,
      });
      if (extraExamIds.length > 0)
        params.set("extraExamIds", extraExamIds.join(","));
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setGrouped(data.data);
        if (data.data.length > 0)
          setExpanded({ [data.data[0].subjectId]: true });
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
      const res = await fetch("/api/questions/auto-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            {
              examId: parseInt(primaryExamId),
              subjectId,
              chapterIds: [chapterId],
              count,
              type: "BOTH",
              difficulty: { EASY: 33, MEDIUM: 34, HARD: 33 },
            },
          ],
          excludeIds: [...selectedIds],
          extraExamIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      const questions = data.data.questions;
      if (!questions.length) {
        toast.error("Not enough questions in this chapter");
        return;
      }
      onAddQuestions(questions);
      setCustom((c) => {
        const n = { ...c };
        delete n[chapterId];
        return n;
      });
      toast.success(`${questions.length} questions added!`);
    } catch {
      toast.error("Failed");
    } finally {
      setAdding(null);
    }
  }

  const availableExtra = allExams.filter(
    (e) => e.id !== parseInt(primaryExamId) && !extraExamIds.includes(e.id),
  );

  return (
    <div className="space-y-3">
      {/* Exam selector */}
      <div className="flex gap-2 flex-wrap">
        <select
          className="input-field py-1.5 text-sm flex-1"
          value={primaryExamId}
          onChange={(e) => {
            setPrimaryExamId(e.target.value);
            setGrouped([]);
          }}
        >
          <option value="">Select Exam</option>
          {allExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {primaryExamId && availableExtra.length > 0 && (
          <select
            className="input-field py-1.5 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value)
                setExtraExamIds((prev) => [...prev, parseInt(e.target.value)]);
            }}
          >
            <option value="">+ Also from exam</option>
            {availableExtra.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Extra exam badges */}
      {extraExamIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extraExamIds.map((eid) => {
            const exam = allExams.find((e) => e.id === eid);
            const color = examColorMap[eid] || EXAM_BADGE_COLORS[0];
            return (
              <span
                key={eid}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: color.bg, color: color.text }}
              >
                {exam?.name}
                <button
                  onClick={() =>
                    setExtraExamIds((p) => p.filter((id) => id !== eid))
                  }
                >
                  <MdClose style={{ fontSize: 11 }} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {!primaryExamId && (
        <p className="text-sm text-gray-400 text-center py-4">
          Select an exam to browse chapters
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <div
            className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: "#0D9488" }}
          />
        </div>
      )}

      {/* Chapter groups */}
      {!loading &&
        grouped.map((subject) => {
          const totalQ = subject.chapters.reduce((sum, c) => sum + c.count, 0);
          const isExpanded = expanded[subject.subjectId];
          return (
            <div
              key={subject.subjectId}
              className="rounded-xl overflow-hidden"
              style={{ border: "0.5px solid var(--color-border-tertiary)" }}
            >
              <button
                onClick={() =>
                  setExpanded((e) => ({
                    ...e,
                    [subject.subjectId]: !e[subject.subjectId],
                  }))
                }
                className="w-full flex items-center justify-between px-3 py-2.5"
                style={{
                  background: isExpanded
                    ? "#F0FDFA"
                    : "var(--color-background-secondary)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isExpanded ? "#0F766E" : "inherit" }}
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
                </div>
                {isExpanded ? (
                  <MdExpandLess style={{ fontSize: 18, color: "#0D9488" }} />
                ) : (
                  <MdExpandMore style={{ fontSize: 18, color: "#9CA3AF" }} />
                )}
              </button>

              {isExpanded && (
                <div
                  style={{
                    borderTop: "0.5px solid var(--color-border-tertiary)",
                  }}
                >
                  {subject.chapters.map((chapter, ci) => {
                    const countColor =
                      chapter.count >= 50
                        ? "#15803D"
                        : chapter.count >= 20
                          ? "#D97706"
                          : "#DC2626";
                    return (
                      <div
                        key={chapter.chapterId}
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        style={{
                          borderTop:
                            ci > 0
                              ? "0.5px solid var(--color-border-tertiary)"
                              : "none",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[10, 20, 30].map((n) => {
                            if (n > chapter.count) return null;
                            const key = `${chapter.chapterId}-${n}`;
                            const isAdding = adding === key;
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
                                  background: isAdding ? "#0D9488" : "#F0FDFA",
                                  border: "0.5px solid #0D9488",
                                  color: isAdding ? "white" : "#0D9488",
                                  minWidth: 32,
                                }}
                              >
                                {isAdding ? "..." : `+${n}`}
                              </button>
                            );
                          })}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="input-field text-xs py-1 text-center"
                              style={{ width: 52 }}
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
                                    `Only ${chapter.count} available`,
                                  );
                                  return;
                                }
                                handleBulkAdd(
                                  chapter.chapterId,
                                  n,
                                  subject.subjectId,
                                );
                              }}
                              className="p-1.5 rounded-md"
                              style={{
                                background: adding ? "#E2E8F0" : "#0D9488",
                                color: "white",
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
  );
}

// ── AutoBuild tab ─────────────────────────────────────────────────────────────
function AutoBuildTab({ exams, selectedIds, onAddQuestions }) {
  const [allExams, setAllExams] = useState([]);
  const [primaryExamId, setPrimaryExamId] = useState("");
  const [extraExamIds, setExtraExamIds] = useState([]);
  const [buildSections, setBuildSections] = useState([
    {
      subjectId: "",
      chapterIds: [],
      count: 30,
      difficulty: { EASY: 30, MEDIUM: 50, HARD: 20 },
      difficultyPreset: "Balanced",
      type: "MCQ",
    },
  ]);
  const [building, setBuilding] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [chapterCounts, setChapterCounts] = useState({});
  const [sectionChapters, setSectionChapters] = useState({});

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAllExams(d.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!primaryExamId) return;
    // Load subjects for this exam
    fetch(`/api/subjects?examId=${primaryExamId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSubjects(d.data || []);
      })
      .catch(() => {});
  }, [primaryExamId]);

  async function loadChapterData(subjectId, sectionIndex) {
    if (!subjectId || !primaryExamId) return;
    try {
      const params = new URLSearchParams({
        subjectId,
        countByChapter: "true",
        examId: primaryExamId,
      });
      if (extraExamIds.length > 0)
        params.set("extraExamIds", extraExamIds.join(","));
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        if (data.data?.chapterCounts)
          setChapterCounts((prev) => ({ ...prev, ...data.data.chapterCounts }));
        if (data.data?.chapters)
          setSectionChapters((prev) => ({
            ...prev,
            [sectionIndex]: data.data.chapters,
          }));
      }
    } catch {}
  }

  function updateSection(i, key, val) {
    setBuildSections((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)),
    );
  }

  function applyPreset(i, label) {
    const preset = DIFFICULTY_PRESETS.find((p) => p.label === label);
    if (!preset?.values) {
      updateSection(i, "difficultyPreset", "Custom");
      return;
    }
    setBuildSections((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? { ...s, difficulty: { ...preset.values }, difficultyPreset: label }
          : s,
      ),
    );
  }

  async function handleBuild() {
    if (!primaryExamId) {
      toast.error("Select an exam first");
      return;
    }
    const valid = buildSections.filter((s) => s.subjectId && s.count > 0);
    if (!valid.length) {
      toast.error("Configure at least one section");
      return;
    }

    setBuilding(true);
    try {
      const res = await fetch("/api/questions/auto-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: valid.map((s) => ({
            examId: parseInt(primaryExamId),
            subjectId: parseInt(s.subjectId),
            chapterIds: s.chapterIds,
            count: s.count,
            type: s.type,
            difficulty: s.difficulty,
          })),
          excludeIds: [...selectedIds],
          extraExamIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      const questions = data.data.questions;
      if (!questions.length) {
        toast.error("No questions found with these settings");
        return;
      }
      onAddQuestions(questions);
      toast.success(`${questions.length} questions added!`);
    } catch {
      toast.error("Build failed");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Exam selector */}
      <div className="flex gap-2">
        <select
          className="input-field py-1.5 text-sm flex-1"
          value={primaryExamId}
          onChange={(e) => {
            setPrimaryExamId(e.target.value);
            setSubjects([]);
            setSectionChapters({});
          }}
        >
          <option value="">Select Exam</option>
          {allExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {!primaryExamId && (
        <p className="text-sm text-gray-400 text-center py-4">
          Select an exam to auto-build questions
        </p>
      )}

      {primaryExamId &&
        buildSections.map((section, i) => {
          const chapList = sectionChapters[i] || [];
          return (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Section {i + 1}
                </p>
                {buildSections.length > 1 && (
                  <button
                    onClick={() =>
                      setBuildSections((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="text-red-400 hover:text-red-600"
                  >
                    <MdDelete style={{ fontSize: 16 }} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Subject
                  </label>
                  <select
                    className="input-field py-1.5 text-sm"
                    value={section.subjectId}
                    onChange={(e) => {
                      updateSection(i, "subjectId", e.target.value);
                      updateSection(i, "chapterIds", []);
                      setSectionChapters((p) => {
                        const n = { ...p };
                        delete n[i];
                        return n;
                      });
                      if (e.target.value) loadChapterData(e.target.value, i);
                    }}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Count
                  </label>
                  <input
                    type="number"
                    className="input-field py-1.5 text-sm"
                    value={section.count}
                    min={1}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) =>
                      updateSection(i, "count", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>

              {/* Chapters */}
              {section.subjectId && chapList.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Chapters{" "}
                    <span className="text-gray-400">(empty = all)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {chapList.map((c) => {
                      const sel = section.chapterIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            updateSection(
                              i,
                              "chapterIds",
                              sel
                                ? section.chapterIds.filter((id) => id !== c.id)
                                : [...section.chapterIds, c.id],
                            )
                          }
                          className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                          style={{
                            background: sel ? "#0D9488" : "white",
                            borderColor: sel ? "#0D9488" : "#D1D5DB",
                            color: sel ? "white" : "#374151",
                            fontWeight: sel ? 600 : 400,
                          }}
                        >
                          {c.name} ({chapterCounts[c.id] || 0})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Difficulty Mix
                </label>
                <div className="flex gap-1 mb-2">
                  {DIFFICULTY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(i, p.label)}
                      className="text-[11px] px-2 py-1 rounded-md border font-medium"
                      style={{
                        background:
                          section.difficultyPreset === p.label
                            ? "#0D9488"
                            : "white",
                        borderColor:
                          section.difficultyPreset === p.label
                            ? "#0D9488"
                            : "#D1D5DB",
                        color:
                          section.difficultyPreset === p.label
                            ? "white"
                            : "#6B7280",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Question Type
                </label>
                <select
                  className="input-field py-1.5 text-sm"
                  value={section.type}
                  onChange={(e) => updateSection(i, "type", e.target.value)}
                >
                  <option value="MCQ">MCQ Only</option>
                  <option value="INTEGER">Integer Only</option>
                  <option value="MULTI_CORRECT">Multi Correct</option>
                  <option value="BOTH">All Types</option>
                </select>
              </div>
            </div>
          );
        })}

      {primaryExamId && (
        <div className="flex gap-2">
          <button
            onClick={() =>
              setBuildSections((p) => [
                ...p,
                {
                  subjectId: "",
                  chapterIds: [],
                  count: 30,
                  difficulty: { EASY: 30, MEDIUM: 50, HARD: 20 },
                  difficultyPreset: "Balanced",
                  type: "MCQ",
                },
              ])
            }
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
          >
            <MdAdd style={{ fontSize: 16 }} /> Add Section
          </button>
          <button
            onClick={handleBuild}
            disabled={building}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg text-white font-semibold flex-1 justify-center"
            style={{ background: building ? "#0F766E" : "#0D9488" }}
          >
            <MdBolt style={{ fontSize: 16 }} />
            {building ? "Building..." : "Build Now"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main PaperSections component ──────────────────────────────────────────────
export default function PaperSections({
  sections,
  setSections,
  exams,
  subjects,
  chapters,
}) {
  const [activeSection, setActiveSection] = useState(0);
  const [pickerTab, setPickerTab] = useState("bulkpick"); // bulkpick | autobuild | search

  const allSelectedIds = new Set(sections.flatMap((s) => s.questionIds));

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        name: `Section ${String.fromCharCode(65 + prev.length)}`,
        marksPerQ: 4,
        negMarks: 1,
        questionIds: [],
        questions: [],
      },
    ]);
    setActiveSection(sections.length);
  }

  function removeSection(i) {
    if (sections.length === 1) {
      toast.error("Need at least one section");
      return;
    }
    setSections((prev) => prev.filter((_, idx) => idx !== i));
    setActiveSection(Math.max(0, i - 1));
  }

  function updateSection(i, key, val) {
    setSections((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)),
    );
  }

  function addQuestionsToSection(newQuestions, sectionIndex = activeSection) {
    setSections((prev) =>
      prev.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        const existingIds = new Set(s.questionIds);
        const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
        return {
          ...s,
          questionIds: [...s.questionIds, ...toAdd.map((q) => q.id)],
          questions: [...s.questions, ...toAdd],
        };
      }),
    );
  }

  function removeQuestion(sectionIndex, questionId) {
    setSections((prev) =>
      prev.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        return {
          ...s,
          questionIds: s.questionIds.filter((id) => id !== questionId),
          questions: s.questions.filter((q) => q.id !== questionId),
        };
      }),
    );
  }

  const currentSection = sections[activeSection];

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left - Question picker */}
      <div className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Adding to:{" "}
              <span className="text-teal-600">{currentSection?.name}</span>
            </p>
            {sections.length > 1 && (
              <select
                className="input-field py-1 text-xs w-36"
                value={activeSection}
                onChange={(e) => setActiveSection(parseInt(e.target.value))}
              >
                {sections.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Picker tabs */}
          <div className="flex gap-1 border-b border-gray-100 mb-3">
            {[
              { key: "bulkpick", label: "Browse" },
              { key: "autobuild", label: "Auto Build" },
              { key: "search", label: "Search" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPickerTab(t.key)}
                className="px-3 py-1.5 text-xs font-medium border-b-2 transition-all"
                style={{
                  borderColor: pickerTab === t.key ? "#0D9488" : "transparent",
                  color: pickerTab === t.key ? "#0D9488" : "#9CA3AF",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {pickerTab === "bulkpick" && (
            <BulkPickTab
              exams={exams}
              selectedIds={allSelectedIds}
              onAddQuestions={(qs) => addQuestionsToSection(qs)}
            />
          )}
          {pickerTab === "autobuild" && (
            <AutoBuildTab
              exams={exams}
              selectedIds={allSelectedIds}
              onAddQuestions={(qs) => addQuestionsToSection(qs)}
            />
          )}
          {pickerTab === "search" && (
            <SearchPicker
              exams={exams}
              selectedIds={allSelectedIds}
              onAddQuestion={(q) => addQuestionsToSection([q])}
            />
          )}
        </div>
      </div>

      {/* Right - Selected questions per section */}
      <div className="space-y-3">
        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: activeSection === i ? "#0D9488" : "#F1F5F9",
                color: activeSection === i ? "white" : "#6B7280",
              }}
            >
              {s.name} ({s.questionIds.length})
              {sections.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(i);
                  }}
                  className="hover:text-red-300 transition-colors"
                >
                  ×
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addSection}
            className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-all"
            style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
          >
            + Section
          </button>
        </div>

        {/* Section settings */}
        {currentSection && (
          <div className="card p-4 space-y-3">
            <input
              className="input-field py-1.5 text-sm font-medium"
              placeholder="Section name"
              value={currentSection.name}
              onChange={(e) =>
                updateSection(activeSection, "name", e.target.value)
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Marks per Question
                </label>
                <input
                  type="number"
                  className="input-field py-1.5 text-sm"
                  value={currentSection.marksPerQ}
                  min={1}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    updateSection(
                      activeSection,
                      "marksPerQ",
                      parseInt(e.target.value) || 1,
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Negative Marks
                </label>
                <input
                  type="number"
                  className="input-field py-1.5 text-sm"
                  value={currentSection.negMarks}
                  min={0}
                  step={0.25}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    updateSection(
                      activeSection,
                      "negMarks",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                />
              </div>
            </div>

            {/* Question list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">
                  {currentSection.questions.length} questions
                  {currentSection.questions.length > 0 && (
                    <span className="font-normal text-gray-400 ml-1">
                      ·{" "}
                      {currentSection.questions.length *
                        currentSection.marksPerQ}{" "}
                      marks
                    </span>
                  )}
                </p>
                {currentSection.questions.length > 0 && (
                  <button
                    onClick={() =>
                      updateSection(activeSection, "questions", []) ||
                      updateSection(activeSection, "questionIds", [])
                    }
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {currentSection.questions.length === 0 ? (
                <div
                  className="text-center py-8 rounded-lg"
                  style={{
                    background: "var(--color-background-secondary)",
                    border: "0.5px dashed #D1D5DB",
                  }}
                >
                  <p className="text-sm text-gray-400">No questions yet</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Use Browse, Auto Build or Search to add
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {currentSection.questions.map((q, qi) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg group transition-all hover:bg-gray-50"
                      style={{ border: "0.5px solid #F1F5F9" }}
                    >
                      <span className="text-[11px] font-bold text-gray-400 flex-shrink-0 mt-0.5 w-5 text-center">
                        {qi + 1}
                      </span>
                      <MathDisplay
                        text={q.questionText}
                        className="flex-1 text-xs text-gray-700 min-w-0"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      />
                      <button
                        onClick={() => removeQuestion(activeSection, q.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <MdClose style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

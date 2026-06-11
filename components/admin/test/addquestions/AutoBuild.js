"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdDelete,
  MdBolt,
  MdWarning,
  MdClose,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
} from "react-icons/md";

const DIFFICULTY_PRESETS = [
  { label: "Easy", values: { EASY: 60, MEDIUM: 30, HARD: 10 } },
  { label: "Balanced", values: { EASY: 30, MEDIUM: 50, HARD: 20 } },
  { label: "Hard", values: { EASY: 10, MEDIUM: 40, HARD: 50 } },
  { label: "Custom", values: null },
];

const EMPTY_SECTION = {
  subjectId: "",
  chapterIds: [],
  count: 30,
  difficulty: { EASY: 30, MEDIUM: 50, HARD: 20 },
  difficultyPreset: "Balanced",
  type: "MCQ",
};

const EXAM_BADGE_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" }, // blue  - NEET UG
  { bg: "#FED7AA", text: "#9A3412" }, // orange - Class 10
  { bg: "#DDD6FE", text: "#5B21B6" }, // purple - JEE Adv
  { bg: "#BBF7D0", text: "#14532D" }, // green
  { bg: "#FECDD3", text: "#9F1239" }, // rose
];

export default function AutoBuild({
  examId,
  subjects,
  chapters,
  selectedQuestions = [],
  onAdd,
}) {
  const [sections, setSections] = useState([{ ...EMPTY_SECTION }]);
  const [building, setBuilding] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [extraExamIds, setExtraExamIds] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [chapterCounts, setChapterCounts] = useState({});
  const [sectionChapters, setSectionChapters] = useState({});
  const [lastBuildSummary, setLastBuildSummary] = useState(null);

  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // exam color map
  const examColorMap = {};
  [parseInt(examId), ...extraExamIds].filter(Boolean).forEach((eid, idx) => {
    examColorMap[eid] = EXAM_BADGE_COLORS[idx % EXAM_BADGE_COLORS.length];
  });

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
    refreshAll(extraExamIds);
  }, [examId, JSON.stringify(extraExamIds)]);

  async function refreshAll(currentExtraIds) {
    try {
      const params = new URLSearchParams({ examId, countBySubject: "true" });
      if (currentExtraIds.length > 0)
        params.set("extraExamIds", currentExtraIds.join(","));
      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.subjectCounts)
        setSubjectCounts(data.data.subjectCounts);
    } catch {}

    sectionsRef.current.forEach((s, i) => {
      if (s.subjectId) loadChapterData(s.subjectId, i, currentExtraIds);
    });
  }

  async function loadChapterData(subjectId, sectionIndex, currentExtraIds) {
    if (!subjectId) return;
    try {
      const params = new URLSearchParams({
        subjectId,
        countByChapter: "true",
        examId: examId || "",
      });
      if (currentExtraIds.length > 0)
        params.set("extraExamIds", currentExtraIds.join(","));
      const res = await fetch(`/api/questions?${params.toString()}`);
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

  function getChapters(subjectId, sectionIndex) {
    if (sectionChapters[sectionIndex]?.length > 0)
      return sectionChapters[sectionIndex];
    return subjectId
      ? chapters.filter((c) => c.subjectId === parseInt(subjectId))
      : [];
  }

  const availableExtraExams = allExams.filter(
    (e) => e.id !== parseInt(examId) && !extraExamIds.includes(e.id),
  );

  function addExtraExam(eid) {
    if (!eid) return;
    setExtraExamIds((prev) => [...prev, parseInt(eid)]);
  }

  function removeExtraExam(eid) {
    setExtraExamIds((prev) => prev.filter((id) => id !== eid));
    setSections((prev) =>
      prev.map((s, i) => {
        if (!s.chapterIds.length) return s;
        const chapList = sectionChapters[i] || [];
        const stillValid = new Set(
          chapList.filter((c) => c.examId !== eid).map((c) => c.id),
        );
        return {
          ...s,
          chapterIds: s.chapterIds.filter((cid) => stillValid.has(cid)),
        };
      }),
    );
  }

  function addSection() {
    setSections((prev) => [...prev, { ...EMPTY_SECTION, chapterIds: [] }]);
  }

  function removeSection(i) {
    setSections((prev) => prev.filter((_, idx) => idx !== i));
    setSectionChapters((prev) => {
      const n = { ...prev };
      delete n[i];
      return n;
    });
  }

  function updateSection(i, key, value) {
    setSections((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)),
    );
  }

  function handleSubjectChange(i, subjectId) {
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === i ? { ...s, subjectId, chapterIds: [] } : s,
      ),
    );
    setSectionChapters((prev) => {
      const n = { ...prev };
      delete n[i];
      return n;
    });
    if (subjectId) loadChapterData(subjectId, i, extraExamIds);
  }

  function toggleChapter(sectionIndex, chapterId) {
    setSections((prev) =>
      prev.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        const chapterIds = s.chapterIds.includes(chapterId)
          ? s.chapterIds.filter((id) => id !== chapterId)
          : [...s.chapterIds, chapterId];
        return { ...s, chapterIds };
      }),
    );
  }

  function selectAllChapters(sectionIndex) {
    const allIds = getChapters(
      sectionsRef.current[sectionIndex]?.subjectId,
      sectionIndex,
    ).map((c) => c.id);
    updateSection(sectionIndex, "chapterIds", allIds);
  }

  function clearAllChapters(sectionIndex) {
    updateSection(sectionIndex, "chapterIds", []);
  }

  function applyDifficultyPreset(sectionIndex, presetLabel) {
    const preset = DIFFICULTY_PRESETS.find((p) => p.label === presetLabel);
    if (!preset || !preset.values) {
      updateSection(sectionIndex, "difficultyPreset", "Custom");
      return;
    }
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === sectionIndex
          ? {
              ...s,
              difficulty: { ...preset.values },
              difficultyPreset: presetLabel,
            }
          : s,
      ),
    );
  }

  function updateDifficulty(i, level, value) {
    const val = Math.min(100, Math.max(0, parseInt(value) || 0));
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? {
              ...s,
              difficulty: { ...s.difficulty, [level]: val },
              difficultyPreset: "Custom",
            }
          : s,
      ),
    );
  }

  function getSectionAvailableCount(section, sectionIndex) {
    if (!section.subjectId) return null;
    if (section.chapterIds.length > 0) {
      return section.chapterIds.reduce(
        (sum, cid) => sum + (chapterCounts[cid] || 0),
        0,
      );
    }
    return subjectCounts[section.subjectId] ?? null;
  }

  function validateSections() {
    const errs = [];
    if (!examId) {
      errs.push("Please select an exam in Basic Details first");
      return errs;
    }
    sections.forEach((s, i) => {
      const label = `Section ${i + 1}`;
      if (!s.subjectId) errs.push(`${label}: Subject is required`);
      if (!s.count || s.count < 1)
        errs.push(`${label}: Question count must be at least 1`);
      const total =
        (s.difficulty.EASY || 0) +
        (s.difficulty.MEDIUM || 0) +
        (s.difficulty.HARD || 0);
      if (total !== 100)
        errs.push(
          `${label}: Difficulty % must add up to 100 (currently ${total})`,
        );
    });
    return errs;
  }

  async function handleBuild() {
    setWarnings([]);
    setLastBuildSummary(null);
    const errs = validateSections();
    if (errs.length > 0) {
      setWarnings(errs);
      return;
    }

    const validSections = sections.filter((s) => s.subjectId && s.count > 0);
    setBuilding(true);

    try {
      const excludeIds = Array.isArray(selectedQuestions)
        ? selectedQuestions.map((q) => q.id)
        : [];
      const res = await fetch("/api/questions/auto-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: validSections.map((s) => ({
            examId: parseInt(examId),
            subjectId: parseInt(s.subjectId),
            chapterIds: s.chapterIds,
            count: s.count,
            difficulty: s.difficulty,
            type: s.type,
          })),
          excludeIds,
          extraExamIds,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setWarnings([data.error || "Failed to build questions"]);
        return;
      }

      const questions = data.data?.questions || [];
      const totalAsked = validSections.reduce((sum, s) => sum + s.count, 0);
      const newWarnings = [];

      if (questions.length === 0) {
        setWarnings([
          "No questions found matching your rules.",
          "- Not enough questions in DB yet",
          "- Selected chapters have no active questions",
          "- Question type filter too strict",
          'Try: leave chapters empty, change type to "All Types", or add more questions first.',
        ]);
        return;
      }

      if (questions.length < totalAsked) {
        newWarnings.push(
          `Only ${questions.length} of ${totalAsked} requested questions found.`,
          "Add more questions to DB to get the full count.",
        );
      }

      const bySubject = {};
      const byChapter = {};
      questions.forEach((q) => {
        const sName = q.subject?.name || "Unknown";
        const cName = q.chapter?.name || "Unknown";
        bySubject[sName] = (bySubject[sName] || 0) + 1;
        byChapter[cName] = (byChapter[cName] || 0) + 1;
      });

      setLastBuildSummary({
        total: questions.length,
        asked: totalAsked,
        bySubject,
        byChapter,
      });
      onAdd(questions);

      if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        toast.success(`${questions.length} questions added`);
      } else toast.success(`${questions.length} questions added!`);
    } catch (err) {
      console.error(err);
      setWarnings(["Something went wrong. Please try again."]);
    } finally {
      setBuilding(false);
    }
  }

  const filteredSubjects = subjects.filter(
    (s) => !examId || s.examId === parseInt(examId),
  );
  const showExamBadges = extraExamIds.length > 0;

  return (
    <div className="space-y-3">
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

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          className="p-3 rounded-lg"
          style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}
        >
          <div className="flex items-start gap-2">
            <MdWarning
              style={{
                color: "#D97706",
                fontSize: 16,
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <div className="space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: "#92400E" }}>
                  {w}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Build summary - improved layout */}
      {lastBuildSummary && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "0.5px solid #86EFAC" }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: "#DCFCE7" }}
          >
            <p className="text-xs font-bold text-green-800">
              Built {lastBuildSummary.total} of {lastBuildSummary.asked}{" "}
              questions
            </p>
            <button
              onClick={() => setLastBuildSummary(null)}
              className="text-green-600 hover:text-green-800"
            >
              <MdClose style={{ fontSize: 14 }} />
            </button>
          </div>
          {/* Body */}
          <div className="p-3" style={{ background: "#F0FDF4" }}>
            <div className="grid grid-cols-2 gap-4">
              {/* By subject */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1.5">
                  By Subject
                </p>
                {Object.entries(lastBuildSummary.bySubject).map(
                  ([name, count]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between gap-2 mb-1"
                    >
                      <span className="text-xs text-green-800 truncate">
                        {name}
                      </span>
                      <span className="text-xs font-bold text-green-700 flex-shrink-0 bg-green-100 px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
              {/* By chapter */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1.5">
                  Top Chapters
                </p>
                {Object.entries(lastBuildSummary.byChapter)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, count]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between gap-2 mb-1"
                    >
                      <span className="text-xs text-green-800 truncate">
                        {name}
                      </span>
                      <span className="text-xs font-bold text-green-700 flex-shrink-0 bg-green-100 px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => {
        const availableCount = getSectionAvailableCount(section, i);
        const chapList = getChapters(section.subjectId, i);
        const selectedCount = section.chapterIds.length;

        return (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: "0.5px solid var(--color-border-secondary)" }}
          >
            {/* Section header bar */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: "var(--color-background-secondary)",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">
                  Section {i + 1}
                </span>
                {availableCount !== null && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: availableCount > 0 ? "#DCFCE7" : "#FEE2E2",
                      color: availableCount > 0 ? "#15803D" : "#DC2626",
                    }}
                  >
                    {availableCount} available
                  </span>
                )}
                {selectedCount > 0 && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "#CCFBF1", color: "#0F766E" }}
                  >
                    {selectedCount} chapter{selectedCount > 1 ? "s" : ""}{" "}
                    selected
                  </span>
                )}
              </div>
              {sections.length > 1 && (
                <button
                  onClick={() => removeSection(i)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <MdDelete style={{ fontSize: 15 }} />
                </button>
              )}
            </div>

            <div
              className="p-3 space-y-3"
              style={{ background: "var(--color-background-primary, white)" }}
            >
              {/* Subject + Count */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Subject *
                  </label>
                  <select
                    className="input-field py-1.5 text-sm"
                    value={section.subjectId}
                    onChange={(e) => handleSubjectChange(i, e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {subjectCounts[s.id] !== undefined
                          ? ` (${subjectCounts[s.id]})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    No. of Questions *
                    {availableCount !== null &&
                      section.count > availableCount && (
                        <span className="text-red-500 ml-1 text-[11px]">
                          (max {availableCount})
                        </span>
                      )}
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
              {section.subjectId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">
                      Chapters{" "}
                      <span className="font-normal text-gray-400">
                        (empty = all chapters)
                      </span>
                    </label>
                    {chapList.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => selectAllChapters(i)}
                          className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                        >
                          <MdCheckBox style={{ fontSize: 13 }} /> Select All
                        </button>
                        <button
                          onClick={() => clearAllChapters(i)}
                          className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                        >
                          <MdCheckBoxOutlineBlank style={{ fontSize: 13 }} />{" "}
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {chapList.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      Loading chapters...
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {chapList.map((c) => {
                        const selected = section.chapterIds.includes(c.id);
                        const count = chapterCounts[c.id];
                        const examColor =
                          showExamBadges && c.examId
                            ? examColorMap[c.examId] || EXAM_BADGE_COLORS[0]
                            : null;

                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleChapter(i, c.id)}
                            className="flex items-center gap-1 text-xs rounded-lg border transition-all"
                            style={{
                              padding: "4px 10px",
                              // SELECTED: solid teal fill with white text - very obvious
                              background: selected ? "#0D9488" : "white",
                              borderColor: selected ? "#0D9488" : "#D1D5DB",
                              color: selected ? "white" : "#374151",
                              fontWeight: selected ? 600 : 400,
                              opacity: count === 0 ? 0.35 : 1,
                              boxShadow: selected
                                ? "0 1px 3px rgba(13,148,136,0.4)"
                                : "none",
                            }}
                          >
                            {/* Exam badge */}
                            {showExamBadges && examColor && c.examName && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                style={{
                                  background: selected
                                    ? "rgba(255,255,255,0.25)"
                                    : examColor.bg,
                                  color: selected ? "white" : examColor.text,
                                }}
                              >
                                {c.examName}
                              </span>
                            )}
                            <span>{c.name}</span>
                            {count !== undefined && count > 0 && (
                              <span
                                style={{
                                  opacity: selected ? 0.8 : 0.5,
                                  fontSize: "10px",
                                  marginLeft: 1,
                                }}
                              >
                                ({count})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Difficulty + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Difficulty
                  </label>
                  {/* Presets */}
                  <div className="flex gap-1 mb-2">
                    {DIFFICULTY_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => applyDifficultyPreset(i, p.label)}
                        className="text-[11px] px-2 py-1 rounded-md border font-medium transition-all"
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
                  {/* Manual inputs */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: "EASY", color: "#16A34A", label: "E" },
                      { key: "MEDIUM", color: "#D97706", label: "M" },
                      { key: "HARD", color: "#DC2626", label: "H" },
                    ].map((d, di) => (
                      <div key={d.key} className="flex items-center gap-1.5">
                        {di > 0 && (
                          <span className="text-gray-300 text-xs">:</span>
                        )}
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: d.color }}
                          >
                            {d.label}
                          </span>
                          <input
                            type="number"
                            className="input-field py-1 text-xs text-center"
                            style={{ width: 70 }}
                            value={section.difficulty[d.key]}
                            min={0}
                            max={100}
                            onChange={(e) =>
                              updateDifficulty(i, d.key, e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                    {(() => {
                      const total =
                        (section.difficulty.EASY || 0) +
                        (section.difficulty.MEDIUM || 0) +
                        (section.difficulty.HARD || 0);
                      return (
                        <span
                          className="text-[11px] font-semibold ml-1"
                          style={{
                            color: total === 100 ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {total === 100 ? "✓" : `${total}%`}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Question Type
                  </label>
                  <select
                    className="input-field py-1.5 text-sm"
                    value={section.type}
                    onChange={(e) => updateSection(i, "type", e.target.value)}
                  >
                    <option value="MCQ">MCQ Only</option>
                    <option value="INTEGER">Integer Only</option>
                    <option value="MULTI_CORRECT">Multi Correct Only</option>
                    <option value="BOTH">All Types</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={addSection}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-all"
          style={{
            borderColor: "var(--color-border-secondary)",
            color: "var(--color-text-secondary)",
          }}
        >
          <MdAdd style={{ fontSize: 16 }} /> Add Section
        </button>
        <button
          onClick={handleBuild}
          disabled={building}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg text-white transition-all flex-1 justify-center font-semibold"
          style={{ background: building ? "#0F766E" : "#0D9488" }}
        >
          <MdBolt style={{ fontSize: 16 }} />
          {building ? "Building..." : "Build Now"}
        </button>
      </div>
    </div>
  );
}

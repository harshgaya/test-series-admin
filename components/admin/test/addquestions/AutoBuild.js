"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { MdAdd, MdDelete, MdBolt, MdWarning } from "react-icons/md";

const EMPTY_SECTION = {
  subjectId: "",
  chapterIds: [],
  count: 30,
  difficulty: { EASY: 30, MEDIUM: 50, HARD: 20 },
  type: "MCQ",
};

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

  const filteredChapters = (subjectId) =>
    subjectId
      ? chapters.filter((c) => c.subjectId === parseInt(subjectId))
      : [];

  function addSection() {
    setSections([...sections, { ...EMPTY_SECTION, chapterIds: [] }]);
  }

  function removeSection(i) {
    setSections(sections.filter((_, idx) => idx !== i));
  }

  function updateSection(i, key, value) {
    setSections(
      sections.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)),
    );
  }

  function toggleChapter(sectionIndex, chapterId) {
    const section = sections[sectionIndex];
    const chapterIds = section.chapterIds.includes(chapterId)
      ? section.chapterIds.filter((id) => id !== chapterId)
      : [...section.chapterIds, chapterId];
    updateSection(sectionIndex, "chapterIds", chapterIds);
  }

  function updateDifficulty(i, level, value) {
    const val = Math.min(100, Math.max(0, parseInt(value) || 0));
    updateSection(i, "difficulty", { ...sections[i].difficulty, [level]: val });
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
            subjectId: parseInt(s.subjectId),
            chapterIds: s.chapterIds,
            count: s.count,
            difficulty: s.difficulty,
            type: s.type,
          })),
          excludeIds,
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
          "— Not enough questions in DB yet",
          "— Selected chapters have no active questions",
          "— Question type filter too strict",
          'Try: leave chapters empty, change type to "All Types", or add more questions first.',
        ]);
        return;
      }

      if (questions.length < totalAsked) {
        newWarnings.push(
          `Only ${questions.length} of ${totalAsked} requested questions found in DB.`,
          "Add more questions to DB to get the full count.",
        );
      }

      validSections.forEach((s, i) => {
        const subjectName =
          subjects.find((sub) => sub.id === parseInt(s.subjectId))?.name ||
          `Section ${i + 1}`;
        const picked = questions.filter(
          (q) => q.subjectId === parseInt(s.subjectId),
        );
        if (picked.length < s.count) {
          newWarnings.push(
            `${subjectName}: got ${picked.length} of ${s.count} requested`,
          );
        }
      });

      onAdd(questions);

      if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        toast.success(`${questions.length} questions added`);
      } else {
        toast.success(`${questions.length} questions added!`);
      }
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

  return (
    <div className="space-y-3">
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

      {sections.map((section, i) => (
        <div
          key={i}
          className="p-3 rounded-xl"
          style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-600">
              Section {i + 1}
            </span>
            {sections.length > 1 && (
              <button
                onClick={() => removeSection(i)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <MdDelete style={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Subject *
              </label>
              <select
                className="input-field py-1.5 text-sm"
                value={section.subjectId}
                onChange={(e) => updateSection(i, "subjectId", e.target.value)}
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                No. of Questions *
              </label>
              <input
                type="number"
                className="input-field py-1.5 text-sm"
                value={section.count}
                min={1}
                onChange={(e) =>
                  updateSection(i, "count", parseInt(e.target.value) || 1)
                }
              />
            </div>
          </div>

          {section.subjectId && (
            <div className="mb-2">
              <label className="block text-xs text-gray-500 mb-1">
                Chapters{" "}
                <span className="text-gray-400">(empty = all chapters)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {filteredChapters(section.subjectId).map((c) => {
                  const selected = section.chapterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleChapter(i, c.id)}
                      className="text-xs px-2.5 py-1 rounded-full border transition-all"
                      style={{
                        background: selected ? "#F0FDFA" : "white",
                        borderColor: selected
                          ? "#0D9488"
                          : "var(--color-border-secondary)",
                        color: selected
                          ? "#0F766E"
                          : "var(--color-text-secondary)",
                        fontWeight: selected ? 500 : 400,
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {filteredChapters(section.subjectId).length === 0 && (
                  <p className="text-xs text-gray-400">
                    No chapters found for this subject
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Difficulty % <span className="text-gray-400">(must = 100)</span>
              </label>
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#16A34A" }}
                  >
                    Easy
                  </span>
                  <input
                    type="number"
                    className="input-field py-1 text-xs text-center"
                    style={{ width: 70 }}
                    value={section.difficulty.EASY}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateDifficulty(i, "EASY", e.target.value)
                    }
                  />
                </div>
                <span className="text-gray-300 text-xs mt-4">/</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#D97706" }}
                  >
                    Med
                  </span>
                  <input
                    type="number"
                    className="input-field py-1 text-xs text-center"
                    style={{ width: 70 }}
                    value={section.difficulty.MEDIUM}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateDifficulty(i, "MEDIUM", e.target.value)
                    }
                  />
                </div>
                <span className="text-gray-300 text-xs mt-4">/</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#DC2626" }}
                  >
                    Hard
                  </span>
                  <input
                    type="number"
                    className="input-field py-1 text-xs text-center"
                    style={{ width: 70 }}
                    value={section.difficulty.HARD}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateDifficulty(i, "HARD", e.target.value)
                    }
                  />
                </div>
              </div>
              {(() => {
                const total =
                  (section.difficulty.EASY || 0) +
                  (section.difficulty.MEDIUM || 0) +
                  (section.difficulty.HARD || 0);
                return (
                  <p
                    className="text-xs mt-1"
                    style={{ color: total === 100 ? "#16A34A" : "#DC2626" }}
                  >
                    Total: {total}% {total === 100 ? "✓" : "(must be 100)"}
                  </p>
                );
              })()}
            </div>

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
                <option value="MULTI_CORRECT">Multi Correct Only</option>
                <option value="BOTH">All Types</option>
              </select>
            </div>
          </div>
        </div>
      ))}

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
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg text-white transition-all flex-1 justify-center font-medium"
          style={{ background: building ? "#0F766E" : "#0D9488" }}
        >
          <MdBolt style={{ fontSize: 16 }} />
          {building ? "Building..." : "Build Now"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { MdSearch, MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/constants";

const DIFF_COLORS = {
  EASY: { bg: "#F0FDF4", text: "#166534" },
  MEDIUM: { bg: "#FFFBEB", text: "#92400E" },
  HARD: { bg: "#FEF2F2", text: "#991B1B" },
};

export default function ManualSearch({
  examId,
  subjects,
  chapters,
  selectedQuestions,
  onAdd,
  onRemove,
}) {
  const [filters, setFilters] = useState({
    subjectId: "",
    chapterId: "",
    difficulty: "",
    type: "",
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const filteredSubjects = examId
    ? subjects.filter((s) => s.examId === parseInt(examId))
    : subjects;
  const filteredChapters = filters.subjectId
    ? chapters.filter((c) => c.subjectId === parseInt(filters.subjectId))
    : chapters;

  const selectedIds = selectedQuestions.map((q) => q.id);

  function truncate(text, len = 80) {
    if (!text) return "";
    const plain = text
      .replace(/\$[^$]*\$/g, "[math]")
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "[math]");
    return plain.length > len ? plain.substring(0, len) + "..." : plain;
  }

  async function handleSearch(p = 1) {
    if (!examId) {
      toast.error("Please select an exam in Basic Details first");
      return;
    }
    setSearching(true);
    setPage(p);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      params.set("examId", examId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      if (filters.chapterId) params.set("chapterId", filters.chapterId);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.type) params.set("type", filters.type);
      if (search) params.set("search", search);
      params.set("status", "active");

      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data.questions);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch {
      toast.error("Failed to search questions");
    } finally {
      setSearching(false);
    }
  }

  function toggleQuestion(q) {
    if (selectedIds.includes(q.id)) {
      onRemove(q.id);
    } else {
      onAdd([q]);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input-field py-1.5 text-sm"
          value={filters.subjectId}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              subjectId: e.target.value,
              chapterId: "",
            }))
          }
        >
          <option value="">All Subjects</option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="input-field py-1.5 text-sm"
          value={filters.chapterId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, chapterId: e.target.value }))
          }
        >
          <option value="">All Chapters</option>
          {filteredChapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="input-field py-1.5 text-sm"
          value={filters.difficulty}
          onChange={(e) =>
            setFilters((f) => ({ ...f, difficulty: e.target.value }))
          }
        >
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          className="input-field py-1.5 text-sm"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">All Types</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="input-field flex-1 py-1.5 text-sm"
          placeholder="Search question text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
        />
        <button
          onClick={() => handleSearch(1)}
          disabled={searching}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg text-white font-medium"
          style={{ background: "#0D9488" }}
        >
          <MdSearch style={{ fontSize: 16 }} />
          {searching ? "..." : "Search"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="text-xs text-gray-400 px-1">
            {total} results — click to select/deselect
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "0.5px solid var(--color-border-tertiary)" }}
          >
            {results.map((q, i) => {
              const isSelected = selectedIds.includes(q.id);
              const diff = DIFF_COLORS[q.difficulty] || DIFF_COLORS.MEDIUM;
              return (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q)}
                  className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
                  style={{
                    background: isSelected
                      ? "#F0FDFA"
                      : i % 2 === 0
                        ? "white"
                        : "var(--color-background-secondary)",
                    borderBottom: "0.5px solid var(--color-border-tertiary)",
                  }}
                >
                  {isSelected ? (
                    <MdCheckBox
                      style={{
                        color: "#0D9488",
                        fontSize: 18,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                  ) : (
                    <MdCheckBoxOutlineBlank
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 18,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: diff.bg, color: diff.text }}
                      >
                        {q.difficulty}
                      </span>
                      <span className="text-xs text-gray-400">
                        {q.chapter?.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">
                      {truncate(q.questionText)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page === 1 || searching}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--color-border-secondary)" }}
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page === totalPages || searching}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--color-border-secondary)" }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {results.length === 0 && !searching && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            Search to find and pick specific questions
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
  MdVisibility,
  MdUpload,
  MdFindInPage,
} from "react-icons/md";
import Badge from "@/components/ui/Badge";
import AlertDialog from "@/components/ui/AlertDialog";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import BulkImport from "@/components/admin/question/BulkImport";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/constants";

const DIFF_COLORS = { EASY: "green", MEDIUM: "yellow", HARD: "red" };

export default function QuestionsClient({ filters }) {
  const { exams, subjects, chapters, topics } = filters;

  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [filterExam, setFilterExam] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterCh, setFilterCh] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const filteredSubjects = filterExam
    ? subjects.filter((s) => s.examId === parseInt(filterExam))
    : subjects;
  const filteredChapters = filterSub
    ? chapters.filter((c) => c.subjectId === parseInt(filterSub))
    : chapters;

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterExam) params.set("examId", filterExam);
      if (filterSub) params.set("subjectId", filterSub);
      if (filterCh) params.set("chapterId", filterCh);
      if (filterDiff) params.set("difficulty", filterDiff);
      if (filterType) params.set("type", filterType);
      if (search) params.set("search", search);
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data.questions);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [page, filterExam, filterSub, filterCh, filterDiff, filterType, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  async function handleDelete() {
    setDelLoading(true);
    try {
      const res = await fetch(`/api/questions/${selected.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Question deleted!");
      setShowDelete(false);
      fetchQuestions();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDelLoading(false);
    }
  }

  function truncate(text, len = 80) {
    if (!text) return "";
    const plain = text
      .replace(/\$[^$]*\$/g, "[math]")
      .replace(/\\\w+\{[^}]*\}/g, "[math]");
    return plain.length > len ? plain.substring(0, len) + "..." : plain;
  }

  const COLS = [
    "#",
    "Question",
    "Exam",
    "Subject",
    "Chapter",
    "Topic",
    "Type",
    "Difficulty",
    "Tags",
    "Used",
    "Status",
    "Actions",
  ];

  return (
    <>
      <div className="page-header flex-wrap gap-3">
        <div>
          <p className="page-title">
            Questions ({total.toLocaleString("en-IN")})
          </p>
          <p className="page-subtitle">All questions in the question bank</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/duplicates"
            className="btn-secondary flex items-center gap-2"
          >
            <MdFindInPage className="text-lg" /> Find Duplicates
          </Link>
          <button
            onClick={() => setShowBulk(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <MdUpload className="text-lg" /> Bulk Import
          </button>
          <Link href="/admin/questions/new" className="btn-primary">
            <MdAdd className="text-lg" /> Add Question
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2">
          <MdFilterList className="text-gray-400 flex-shrink-0" />
          <select
            className="input-field w-32 py-1.5"
            value={filterExam}
            onChange={(e) => {
              setFilterExam(e.target.value);
              setFilterSub("");
              setFilterCh("");
              setPage(1);
            }}
          >
            <option value="">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            className="input-field w-32 py-1.5"
            value={filterSub}
            onChange={(e) => {
              setFilterSub(e.target.value);
              setFilterCh("");
              setPage(1);
            }}
          >
            <option value="">All Subjects</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input-field w-36 py-1.5"
            value={filterCh}
            onChange={(e) => {
              setFilterCh(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Chapters</option>
            {filteredChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input-field w-28 py-1.5"
            value={filterDiff}
            onChange={(e) => {
              setFilterDiff(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            className="input-field w-36 py-1.5"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2 mt-3">
          <input
            className="input-field pl-3 w-56 py-1.5"
            placeholder="Search questions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary py-1.5">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            title="No questions found"
            message="Try adjusting filters or add new questions"
            action={
              <Link href="/admin/questions/new" className="btn-primary">
                <MdAdd /> Add Question
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {COLS.map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === "Actions" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {questions.map((q, i) => (
                    <tr key={q.id} className="table-row-hover">
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {(page - 1) * 20 + i + 1}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-gray-900 text-sm leading-snug">
                          {truncate(q.questionText)}
                        </p>
                        {q.questionImageUrl && (
                          <span className="text-xs text-blue-500 mt-0.5">
                            📷 Has image
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {q.exam?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {q.subject?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {q.chapter?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {q.topic?.name || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          label={
                            QUESTION_TYPES.find(
                              (t) => t.value === q.questionType,
                            )?.label || q.questionType
                          }
                          color="blue"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          label={q.difficulty}
                          color={DIFF_COLORS[q.difficulty] || "gray"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {q.tags?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {q.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {q.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{q.tags.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {q.usageCount ?? 0} tests
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          label={q.isActive ? "Active" : "Inactive"}
                          color={q.isActive ? "green" : "gray"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/questions/${q.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <MdEdit className="text-lg" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelected(q);
                              setShowDelete(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <MdDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        title="Bulk Import Questions"
        subtitle="Upload Excel — each row can have its own Exam, Subject, Chapter"
        size="lg"
      >
        <BulkImport
          exams={exams}
          subjects={subjects}
          chapters={chapters}
          topics={topics || []}
          onImported={() => {
            setShowBulk(false);
            fetchQuestions();
          }}
        />
      </Modal>

      <AlertDialog
        isOpen={showDelete}
        title="Delete Question?"
        message="This question will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={delLoading}
      />
    </>
  );
}

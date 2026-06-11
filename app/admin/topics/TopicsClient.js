"use client";

import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdToggleOn,
  MdToggleOff,
  MdCheckCircle,
  MdWarning,
  MdSearch,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import Modal from "@/components/ui/Modal";
import AlertDialog from "@/components/ui/AlertDialog";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

const PAGE_SIZE = 100;

export default function TopicsClient({
  topics: init,
  exams,
  subjects,
  chapters,
}) {
  const [topics, setTopics] = useState(init);
  const [filterExam, setFilterExam] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterCh, setFilterCh] = useState("");
  const [search, setSearch] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", chapterId: "" });
  const [loading, setLoading] = useState(false);

  const filteredSubjects = filterExam
    ? subjects.filter((s) => s.examId === parseInt(filterExam))
    : subjects;
  const filteredChapters = filterSub
    ? chapters.filter((c) => c.subjectId === parseInt(filterSub))
    : chapters;

  // Flag duplicate topic name within the same chapter (across ALL topics)
  const issueMap = useMemo(() => {
    const map = {};
    const nameByChapter = {};
    topics.forEach((t) => {
      const k = `${t.chapterId}|${(t.name || "").trim().toLowerCase()}`;
      nameByChapter[k] = (nameByChapter[k] || 0) + 1;
    });
    topics.forEach((t) => {
      const k = `${t.chapterId}|${(t.name || "").trim().toLowerCase()}`;
      if (nameByChapter[k] > 1)
        map[t.id] = "Duplicate topic name in this chapter";
    });
    return map;
  }, [topics]);

  const totalIssues = Object.keys(issueMap).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      const exam = t.chapter?.subject?.exam;
      const sub = t.chapter?.subject;
      if (filterExam && exam?.id !== parseInt(filterExam)) return false;
      if (filterSub && sub?.id !== parseInt(filterSub)) return false;
      if (filterCh && t.chapterId !== parseInt(filterCh)) return false;
      if (issuesOnly && !issueMap[t.id]) return false;
      if (q && !(t.name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [topics, filterExam, filterSub, filterCh, issuesOnly, search, issueMap]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filterExam, filterSub, filterCh, issuesOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  async function handleSave() {
    if (!form.name || !form.chapterId) {
      toast.error("Name and chapter are required");
      return;
    }
    setLoading(true);
    try {
      const isEdit = !!selected;
      const res = await fetch(
        isEdit ? `/api/topics/${selected.id}` : "/api/topics",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            chapterId: parseInt(form.chapterId),
          }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      const ch = chapters.find((c) => c.id === parseInt(form.chapterId));
      const sub = subjects.find((s) => s.id === ch?.subjectId);
      const exam = exams.find((e) => e.id === sub?.examId);
      const enriched = {
        ...data.data,
        chapter: {
          id: ch?.id,
          name: ch?.name,
          subject: {
            id: sub?.id,
            name: sub?.name,
            exam: { id: exam?.id, name: exam?.name },
          },
        },
        _count: { questions: selected?._count?.questions || 0 },
      };
      if (isEdit) {
        setTopics(
          topics.map((t) => (t.id === selected.id ? { ...t, ...enriched } : t)),
        );
        toast.success("Topic updated!");
      } else {
        setTopics([...topics, enriched]);
        toast.success("Topic created!");
      }
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
      const res = await fetch(`/api/topics/${selected.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setTopics(topics.filter((t) => t.id !== selected.id));
      toast.success("Topic deleted!");
      setShowDelete(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(topic) {
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...topic, isActive: !topic.isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setTopics(
        topics.map((t) =>
          t.id === topic.id ? { ...t, isActive: !t.isActive } : t,
        ),
      );
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Topics ({filtered.length})</p>
          <p className="page-subtitle">Specific topics inside each chapter</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field w-32 py-2"
            value={filterExam}
            onChange={(e) => {
              setFilterExam(e.target.value);
              setFilterSub("");
              setFilterCh("");
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
            className="input-field w-32 py-2"
            value={filterSub}
            onChange={(e) => {
              setFilterSub(e.target.value);
              setFilterCh("");
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
            className="input-field w-36 py-2"
            value={filterCh}
            onChange={(e) => setFilterCh(e.target.value)}
          >
            <option value="">All Chapters</option>
            {filteredChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setSelected(null);
            setForm({ name: "", chapterId: filterCh || "" });
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <MdAdd className="text-lg" /> Add Topic
        </button>
      </div>

      {/* Search + health banner */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-72">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pr-6" />
          <input
            className="input-field pl-9 w-full py-2"
            placeholder="Search topic name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{
            background: totalIssues === 0 ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${totalIssues === 0 ? "#86EFAC" : "#FCD34D"}`,
          }}
        >
          {totalIssues === 0 ? (
            <>
              <MdCheckCircle style={{ color: "#15803D", fontSize: 18 }} />
              <span className="text-sm font-semibold text-green-800">
                No duplicate topics
              </span>
            </>
          ) : (
            <>
              <MdWarning style={{ color: "#D97706", fontSize: 18 }} />
              <span className="text-sm font-semibold text-yellow-800">
                {totalIssues} duplicate topic{totalIssues > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setIssuesOnly((v) => !v)}
                className="ml-1 text-xs font-semibold px-2 py-1 rounded-lg"
                style={{
                  background: issuesOnly ? "#D97706" : "#FEF3C7",
                  color: issuesOnly ? "white" : "#92400E",
                }}
              >
                {issuesOnly ? "Show All" : "Issues Only"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No topics found"
            message="Add topics inside chapters"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Status",
                  "ID",
                  "Topic",
                  "Ch ID",
                  "Chapter",
                  "Subject",
                  "Exam",
                  "Questions",
                  "Active",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((t) => {
                const problem = issueMap[t.id];
                const ok = !problem;
                return (
                  <tr
                    key={t.id}
                    className="table-row-hover"
                    style={{ background: ok ? "transparent" : "#FFFBEB" }}
                  >
                    <td className="px-4 py-3">
                      {ok ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "#DCFCE7", color: "#15803D" }}
                        >
                          <MdCheckCircle style={{ fontSize: 13 }} /> OK
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "#FEE2E2", color: "#DC2626" }}
                          title={problem}
                        >
                          <MdWarning style={{ fontSize: 13 }} /> Dup
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {t.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {t.chapterId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.chapter?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.chapter?.subject?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {t.chapter?.subject?.exam?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t._count.questions}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={t.isActive ? "Active" : "Inactive"}
                        color={t.isActive ? "green" : "gray"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(t)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          {t.isActive ? (
                            <MdToggleOn className="text-2xl text-green-500" />
                          ) : (
                            <MdToggleOff className="text-2xl" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelected(t);
                            setForm({ name: t.name, chapterId: t.chapterId });
                            setShowModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button
                          onClick={() => {
                            setSelected(t);
                            setShowDelete(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {pageStart + 1}-
            {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-1 px-2 disabled:opacity-40"
            >
              <MdChevronLeft className="text-lg" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary py-1 px-2 disabled:opacity-40"
            >
              <MdChevronRight className="text-lg" />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selected ? "Edit Topic" : "Add Topic"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter *
            </label>
            <select
              className="input-field"
              value={form.chapterId}
              onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
            >
              <option value="">Select Chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Name *
            </label>
            <input
              className="input-field"
              placeholder="e.g. First Law of Thermodynamics"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              {loading ? "Saving..." : selected ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog
        isOpen={showDelete}
        title="Delete Topic?"
        message={`Delete "${selected?.name}"?`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
    </>
  );
}

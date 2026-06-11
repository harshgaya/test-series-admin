"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdToggleOn,
  MdToggleOff,
  MdCheckCircle,
  MdWarning,
} from "react-icons/md";
import Modal from "@/components/ui/Modal";
import AlertDialog from "@/components/ui/AlertDialog";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

export default function ChaptersClient({ chapters: init, exams, subjects }) {
  const [chapters, setChapters] = useState(init);
  const [filterExam, setFilterExam] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    subjectId: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(false);

  // Filter subjects by selected exam
  const filteredSubjects = filterExam
    ? subjects.filter((s) => s.examId === parseInt(filterExam))
    : subjects;

  // ── Detect problems across ALL chapters (not just filtered) ──────────────
  // A chapter is flagged if:
  //   - duplicate chapter name within the same subject, OR
  //   - its subject name is duplicated within the same exam (duplicate subject)
  const issueMap = useMemo(() => {
    const map = {}; // chapterId -> array of problem strings

    // Count chapter names per subject
    const chapNameBySubject = {}; // `${subjectId}|${lowername}` -> count
    chapters.forEach((c) => {
      const k = `${c.subjectId}|${(c.name || "").trim().toLowerCase()}`;
      chapNameBySubject[k] = (chapNameBySubject[k] || 0) + 1;
    });

    // Count subject names per exam (using subjects list)
    const subNameByExam = {}; // `${examId}|${lowername}` -> count
    subjects.forEach((s) => {
      const k = `${s.examId}|${(s.name || "").trim().toLowerCase()}`;
      subNameByExam[k] = (subNameByExam[k] || 0) + 1;
    });

    chapters.forEach((c) => {
      const problems = [];

      // Duplicate chapter name in same subject
      const ck = `${c.subjectId}|${(c.name || "").trim().toLowerCase()}`;
      if (chapNameBySubject[ck] > 1) {
        problems.push("Duplicate chapter name in this subject");
      }

      // Duplicate subject within exam
      const examId = c.subject?.exam?.id;
      const subName = c.subject?.name;
      if (examId && subName) {
        const sk = `${examId}|${subName.trim().toLowerCase()}`;
        if (subNameByExam[sk] > 1) {
          problems.push("Subject name is duplicated within this exam");
        }
      }

      // Missing exam link
      if (!c.subject?.exam?.id) {
        problems.push("Chapter not linked to any exam");
      }

      if (problems.length > 0) map[c.id] = problems;
    });

    return map;
  }, [chapters, subjects]);

  const totalIssues = Object.keys(issueMap).length;

  // Filter chapters
  const filtered = chapters.filter((c) => {
    if (filterExam && c.subject?.exam?.id !== parseInt(filterExam))
      return false;
    if (filterSub && c.subjectId !== parseInt(filterSub)) return false;
    if (issuesOnly && !issueMap[c.id]) return false;
    return true;
  });

  function openAdd() {
    setSelected(null);
    setForm({ name: "", subjectId: filterSub || "", description: "" });
    setShowModal(true);
  }

  function openEdit(chapter) {
    setSelected(chapter);
    setForm({
      name: chapter.name,
      subjectId: chapter.subjectId,
      description: chapter.description || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.subjectId) {
      toast.error("Name and subject are required");
      return;
    }
    setLoading(true);
    try {
      const isEdit = !!selected;
      const res = await fetch(
        isEdit ? `/api/chapters/${selected.id}` : "/api/chapters",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            subjectId: parseInt(form.subjectId),
          }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      const sub = subjects.find((s) => s.id === parseInt(form.subjectId));
      const exam = exams.find((e) => e.id === sub?.examId);
      const enriched = {
        ...data.data,
        subject: {
          id: sub?.id,
          name: sub?.name,
          exam: { id: exam?.id, name: exam?.name },
        },
        _count: selected?._count || { topics: 0, questions: 0 },
      };
      if (isEdit) {
        setChapters(
          chapters.map((c) =>
            c.id === selected.id ? { ...c, ...enriched } : c,
          ),
        );
        toast.success("Chapter updated!");
      } else {
        setChapters([...chapters, enriched]);
        toast.success("Chapter created!");
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
      const res = await fetch(`/api/chapters/${selected.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setChapters(chapters.filter((c) => c.id !== selected.id));
      toast.success("Chapter deleted!");
      setShowDelete(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(chapter) {
    try {
      const res = await fetch(`/api/chapters/${chapter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...chapter, isActive: !chapter.isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setChapters(
        chapters.map((c) =>
          c.id === chapter.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
      toast.success(chapter.isActive ? "Deactivated" : "Activated");
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Chapters ({filtered.length})</p>
          <p className="page-subtitle">
            Chapters like Thermodynamics, Organic Chemistry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-36 py-2"
            value={filterExam}
            onChange={(e) => {
              setFilterExam(e.target.value);
              setFilterSub("");
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
            className="input-field w-36 py-2"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="">All Subjects</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div onClick={openAdd} className="btn-primary">
          <MdAdd className="text-lg" /> Add Chapter
        </div>
      </div>

      {/* Health summary banner */}
      <div
        className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
        style={{
          background: totalIssues === 0 ? "#F0FDF4" : "#FFFBEB",
          border: `1px solid ${totalIssues === 0 ? "#86EFAC" : "#FCD34D"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {totalIssues === 0 ? (
            <>
              <MdCheckCircle style={{ color: "#15803D", fontSize: 20 }} />
              <span className="text-sm font-semibold text-green-800">
                All chapters look correct - no duplicate or misfiled chapters
              </span>
            </>
          ) : (
            <>
              <MdWarning style={{ color: "#D97706", fontSize: 20 }} />
              <span className="text-sm font-semibold text-yellow-800">
                {totalIssues} chapter{totalIssues > 1 ? "s" : ""} need attention
                (duplicates or missing exam link)
              </span>
            </>
          )}
        </div>
        {totalIssues > 0 && (
          <button
            onClick={() => setIssuesOnly((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{
              background: issuesOnly ? "#D97706" : "#FEF3C7",
              color: issuesOnly ? "white" : "#92400E",
            }}
          >
            {issuesOnly ? "Show All" : "Show Issues Only"}
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No chapters found"
            message="Add chapters to your subjects"
            action={
              <button onClick={openAdd} className="btn-primary">
                <MdAdd />
                Add Chapter
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Status",
                  "Ch ID",
                  "Chapter",
                  "Subject",
                  "Sub ID",
                  "Exam",
                  "Exam ID",
                  "Topics",
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
              {filtered.map((c) => {
                const problems = issueMap[c.id];
                const ok = !problems;
                return (
                  <tr
                    key={c.id}
                    className="table-row-hover"
                    style={{ background: ok ? "transparent" : "#FFFBEB" }}
                  >
                    {/* Status */}
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
                          title={problems.join(" | ")}
                        >
                          <MdWarning style={{ fontSize: 13 }} /> Issue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {c.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.name}
                      {!ok && (
                        <span className="block text-[11px] font-normal text-red-500 mt-0.5">
                          {problems[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.subject?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {c.subject?.id ?? c.subjectId}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.subject?.exam?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {c.subject?.exam?.id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c._count.topics}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c._count.questions}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={c.isActive ? "Active" : "Inactive"}
                        color={c.isActive ? "green" : "gray"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(c)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          {c.isActive ? (
                            <MdToggleOn className="text-2xl text-green-500" />
                          ) : (
                            <MdToggleOff className="text-2xl" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button
                          onClick={() => {
                            setSelected(c);
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selected ? "Edit Chapter" : "Add Chapter"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam
            </label>
            <select
              className="input-field"
              value={filterExam}
              onChange={(e) => {
                setFilterExam(e.target.value);
                setForm((f) => ({ ...f, subjectId: "" }));
              }}
            >
              <option value="">Select Exam</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              className="input-field"
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter Name *
            </label>
            <input
              className="input-field"
              placeholder="e.g. Thermodynamics"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
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
              {loading ? "Saving..." : selected ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <AlertDialog
        isOpen={showDelete}
        title="Delete Chapter?"
        message={`Delete "${selected?.name}"? All topics under it will also be deleted.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
    </>
  );
}

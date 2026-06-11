"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdDelete,
  MdPrint,
  MdSave,
  MdEdit,
  MdArrowBack,
  MdVisibility,
} from "react-icons/md";
import PaperSetup from "./PaperSetup";
import PaperSections from "./PaperSections";
import PaperPreview from "./PaperPreview";

const EMPTY_PAPER = {
  name: "",
  instituteName: "",
  examTitle: "",
  subject: "",
  duration: "3 Hours",
  maxMarks: 180,
  date: "",
  instructions: `1. All questions are compulsory.\n2. Each question carries equal marks.\n3. Negative marking applies as indicated.\n4. Use of calculators is not permitted.\n5. Write answers clearly in the answer sheet.`,
  shuffleQ: false,
  shuffleOpts: false,
  twoColumn: false,
  fontSize: "medium",
};

const EMPTY_SECTION = {
  name: "Section A",
  marksPerQ: 4,
  negMarks: 1,
  questionIds: [],
  questions: [],
};

export default function PaperGenerator({
  exams,
  subjects,
  chapters,
  papers: initialPapers,
}) {
  const [view, setView] = useState("list"); // list | builder | preview
  const [papers, setPapers] = useState(initialPapers || []);
  const [paper, setPaper] = useState({ ...EMPTY_PAPER });
  const [sections, setSections] = useState([{ ...EMPTY_SECTION }]);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const totalQuestions = sections.reduce(
    (sum, s) => sum + (s.questionIds?.length || 0),
    0,
  );
  const totalMarks = sections.reduce(
    (sum, s) => sum + (s.questionIds?.length || 0) * (s.marksPerQ || 4),
    0,
  );

  function newPaper() {
    setPaper({ ...EMPTY_PAPER });
    setSections([{ ...EMPTY_SECTION }]);
    setEditingId(null);
    setActiveTab("setup");
    setView("builder");
  }

  async function loadPaper(p) {
    try {
      const res = await fetch(`/api/paper-templates?id=${p.id}`);
      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to load paper");
        return;
      }
      const full = data.data;
      setPaper({
        name: full.name,
        instituteName: full.instituteName || "",
        examTitle: full.examTitle,
        subject: full.subject || "",
        duration: full.duration || "3 Hours",
        maxMarks: full.maxMarks || 180,
        date: full.date || "",
        instructions: full.instructions || EMPTY_PAPER.instructions,
        shuffleQ: full.shuffleQ || false,
        shuffleOpts: full.shuffleOpts || false,
        twoColumn: full.twoColumn || false,
        fontSize: full.fontSize || "medium",
      });
      setSections(
        full.sections.map((sec) => ({
          name: sec.name,
          marksPerQ: sec.marksPerQ,
          negMarks: sec.negMarks,
          questionIds: sec.questions.map((q) => q.questionId),
          questions: sec.questions.map((q) => q.question),
        })),
      );
      setEditingId(full.id);
      setActiveTab("setup");
    } catch {
      toast.error("Failed to load paper");
    }
  }

  async function savePaper() {
    if (!paper.name?.trim()) {
      toast.error("Paper name required");
      return;
    }
    if (!paper.examTitle?.trim()) {
      toast.error("Exam title required");
      return;
    }
    if (totalQuestions === 0) {
      toast.error("Add at least one question");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...paper,
        sections: sections.map((sec) => ({
          name: sec.name,
          marksPerQ: sec.marksPerQ,
          negMarks: sec.negMarks,
          questionIds: sec.questionIds,
        })),
      };

      const res = await fetch("/api/paper-templates", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      toast.success(editingId ? "Paper updated!" : "Paper saved!");
      if (!editingId) setEditingId(data.data.id);

      const listRes = await fetch("/api/paper-templates");
      const listData = await listRes.json();
      if (listData.success) setPapers(listData.data);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deletePaper(id) {
    if (!confirm("Delete this paper? Cannot be undone.")) return;
    try {
      await fetch(`/api/paper-templates?id=${id}`, { method: "DELETE" });
      toast.success("Paper deleted");
      setPapers((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  }

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {papers.length} saved paper{papers.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={newPaper}
            className="btn-primary flex items-center gap-2"
          >
            <MdAdd /> New Paper
          </button>
        </div>

        {papers.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-base font-bold text-gray-700 mb-2">
              No papers yet
            </p>
            <p className="text-sm text-gray-400 mb-5">
              Create your first offline test paper from your question bank
            </p>
            <button onClick={newPaper} className="btn-primary">
              Create Paper
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((p) => {
              const totalQ =
                p.sections?.reduce(
                  (sum, s) => sum + (s._count?.questions || 0),
                  0,
                ) || 0;
              return (
                <div
                  key={p.id}
                  className="card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.examTitle}
                      {p.subject ? ` · ${p.subject}` : ""}
                      {p.duration ? ` · ${p.duration}` : ""}
                      {p.maxMarks ? ` · ${p.maxMarks} marks` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.sections?.length || 0} section
                      {p.sections?.length !== 1 ? "s" : ""} &middot; {totalQ}{" "}
                      questions &middot;{" "}
                      {new Date(p.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        await loadPaper(p);
                        setView("preview");
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{
                        background: "#F0FDF4",
                        color: "#15803D",
                        border: "0.5px solid #86EFAC",
                      }}
                    >
                      <MdPrint style={{ fontSize: 14 }} /> Print
                    </button>
                    <button
                      onClick={async () => {
                        await loadPaper(p);
                        setView("builder");
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        border: "0.5px solid #BFDBFE",
                      }}
                    >
                      <MdEdit style={{ fontSize: 14 }} /> Edit
                    </button>
                    <button
                      onClick={() => deletePaper(p.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <MdDelete style={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Preview view ───────────────────────────────────────────────────────────
  if (view === "preview") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setView(editingId ? "list" : "builder")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <MdArrowBack /> {editingId ? "All Papers" : "Back to Editor"}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setView("builder")}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium"
            style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
          >
            <MdEdit style={{ fontSize: 15 }} /> Edit Paper
          </button>
        </div>
        <PaperPreview paper={paper} sections={sections} />
      </div>
    );
  }

  // ── Builder view ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Builder header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <MdArrowBack /> All Papers
        </button>
        <input
          className="input-field py-1.5 text-sm font-semibold w-72"
          placeholder="Paper name (e.g. NEET Mock Test 3)..."
          value={paper.name}
          onChange={(e) => setPaper((p) => ({ ...p, name: e.target.value }))}
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {totalQuestions} questions &middot; {totalMarks} marks
          </span>
          <button
            onClick={() => {
              if (totalQuestions === 0) {
                toast.error("Add questions first");
                return;
              }
              setView("preview");
            }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium"
            style={{
              background: "#F0FDF4",
              color: "#15803D",
              border: "0.5px solid #86EFAC",
            }}
          >
            <MdVisibility style={{ fontSize: 16 }} /> Preview & Print
          </button>
          <button
            onClick={savePaper}
            disabled={saving}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-semibold text-white"
            style={{ background: saving ? "#9CA3AF" : "#0D9488" }}
          >
            <MdSave style={{ fontSize: 16 }} />
            {saving ? "Saving..." : editingId ? "Update" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: "setup", label: "Paper Setup" },
          { key: "questions", label: `Questions (${totalQuestions})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-all"
            style={{
              borderColor: activeTab === t.key ? "#0D9488" : "transparent",
              color: activeTab === t.key ? "#0D9488" : "#6B7280",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "setup" && (
        <PaperSetup paper={paper} setPaper={setPaper} />
      )}
      {activeTab === "questions" && (
        <PaperSections
          sections={sections}
          setSections={setSections}
          exams={exams}
          subjects={subjects}
          chapters={chapters}
        />
      )}
    </div>
  );
}

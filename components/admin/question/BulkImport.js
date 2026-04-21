"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  MdUpload,
  MdDownload,
  MdCheckCircle,
  MdError,
  MdClose,
  MdInfo,
} from "react-icons/md";

export default function BulkImport({
  exams,
  subjects,
  chapters,
  topics,
  onImported,
}) {
  const inputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("perrow");

  const [mapping, setMapping] = useState({
    examId: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
  });
  const filteredSubjects = mapping.examId
    ? subjects.filter((s) => s.examId === parseInt(mapping.examId))
    : subjects;
  const filteredChapters = mapping.subjectId
    ? chapters.filter((c) => c.subjectId === parseInt(mapping.subjectId))
    : chapters;
  const filteredTopics = mapping.chapterId
    ? topics.filter((t) => t.chapterId === parseInt(mapping.chapterId))
    : topics;

  function buildLookups() {
    const examByName = {};
    const subByName = {};
    const chByName = {};
    const topicByName = {};
    exams.forEach((e) => {
      examByName[e.name.toLowerCase().trim()] = e.id;
    });
    subjects.forEach((s) => {
      subByName[s.name.toLowerCase().trim()] = { id: s.id, examId: s.examId };
    });
    chapters.forEach((c) => {
      chByName[c.name.toLowerCase().trim()] = {
        id: c.id,
        subjectId: c.subjectId,
      };
    });
    topics.forEach((t) => {
      topicByName[t.name.toLowerCase().trim()] = t.id;
    });
    return { examByName, subByName, chByName, topicByName };
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setPreview(null);
    setResult(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      const lookups = buildLookups();
      const valid = [];
      const invalid = [];

      rows.forEach((row, i) => {
        const rowNum = i + 2;
        const questionText = String(
          row["Question"] || row["question"] || "",
        ).trim();
        if (!questionText) return;

        const optionA = String(row["Option A"] || row["A"] || "").trim();
        const optionB = String(row["Option B"] || row["B"] || "").trim();
        const optionC = String(row["Option C"] || row["C"] || "").trim();
        const optionD = String(row["Option D"] || row["D"] || "").trim();
        const correct = String(row["Correct"] || row["Answer"] || "")
          .trim()
          .toUpperCase();
        const difficulty = String(row["Difficulty"] || "MEDIUM")
          .trim()
          .toUpperCase();
        const tags = String(row["Tags"] || "").trim();
        const solution = String(row["Solution"] || "").trim();

        let examId = null,
          subjectId = null,
          chapterId = null,
          topicId = null;
        let examName = "",
          subjectName = "",
          chapterName = "",
          topicRawName = "";

        if (mode === "perrow") {
          const en = String(row["Exam"] || "").trim();
          const sn = String(row["Subject"] || "").trim();
          const cn = String(row["Chapter"] || "").trim();
          const tn = String(row["Topic"] || "").trim();
          examId = lookups.examByName[en.toLowerCase()] || null;
          subjectId = lookups.subByName[sn.toLowerCase()]?.id || null;
          chapterId = lookups.chByName[cn.toLowerCase()]?.id || null;
          topicId = tn ? lookups.topicByName[tn.toLowerCase()] || null : null;
          examName = en;
          subjectName = sn;
          chapterName = cn;
          topicRawName = tn; // raw topic name string — used for auto-create in API
        } else {
          examId = mapping.examId ? parseInt(mapping.examId) : null;
          subjectId = mapping.subjectId ? parseInt(mapping.subjectId) : null;
          chapterId = mapping.chapterId ? parseInt(mapping.chapterId) : null;
          topicId = mapping.topicId ? parseInt(mapping.topicId) : null;
          examName =
            exams.find((e) => e.id === parseInt(mapping.examId))?.name || "";
          subjectName =
            subjects.find((s) => s.id === parseInt(mapping.subjectId))?.name ||
            "";
          chapterName =
            chapters.find((c) => c.id === parseInt(mapping.chapterId))?.name ||
            "";
          topicRawName = "";
        }

        const errors = [];
        if (!questionText) errors.push("Missing question");
        if (!optionA) errors.push("Missing Option A");
        if (!optionB) errors.push("Missing Option B");
        if (!optionC) errors.push("Missing Option C");
        if (!optionD) errors.push("Missing Option D");
        if (!["A", "B", "C", "D"].includes(correct))
          errors.push("Correct must be A/B/C/D");
        if (!examId) errors.push(`Exam not found: "${examName}"`);
        if (!subjectId) errors.push(`Subject not found: "${subjectName}"`);
        if (!chapterId) errors.push(`Chapter not found: "${chapterName}"`);

        const finalDiff = ["EASY", "MEDIUM", "HARD"].includes(difficulty)
          ? difficulty
          : "MEDIUM";
        const q = {
          rowNum,
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correct,
          difficulty: finalDiff,
          tags,
          solution,
          examId,
          subjectId,
          chapterId,
          topicId,
          examName,
          subjectName,
          chapterName,
          topicRawName, // passed to API for auto-create
        };

        if (errors.length > 0) invalid.push({ ...q, errors });
        else valid.push(q);
      });

      setPreview({ valid, invalid, total: rows.length });
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse file. Check the format.");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (
      mode === "global" &&
      (!mapping.examId || !mapping.subjectId || !mapping.chapterId)
    ) {
      toast.error("Please select Exam, Subject and Chapter");
      return;
    }
    if (!preview?.valid?.length) {
      toast.error("No valid questions to import");
      return;
    }

    setImporting(true);
    try {
      const questions = preview.valid.map((q) => ({
        questionText: q.questionText,
        questionType: "MCQ",
        difficulty: q.difficulty,
        examId: q.examId,
        subjectId: q.subjectId,
        chapterId: q.chapterId,
        topicId: q.topicId || null,
        topicName: q.topicRawName || null, // API uses this to auto-create topic if not found
        solutionText: q.solution || null,
        tags: q.tags
          ? q.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        isActive: true,
        options: [
          { label: "A", optionText: q.optionA, isCorrect: q.correct === "A" },
          { label: "B", optionText: q.optionB, isCorrect: q.correct === "B" },
          { label: "C", optionText: q.optionC, isCorrect: q.correct === "C" },
          { label: "D", optionText: q.optionD, isCorrect: q.correct === "D" },
        ],
      }));

      const res = await fetch("/api/questions/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setResult(data.data);
      setPreview(null);
      toast.success(`${data.data.imported} questions imported!`);
      if (onImported) onImported();
    } catch {
      toast.error("Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const rows = [
      {
        Exam: "Class 10",
        Subject: "Physics",
        Chapter: "Electricity",
        Topic: "Ohm's Law",
        Question: "What is the SI unit of resistance?",
        "Option A": "Volt",
        "Option B": "Ampere",
        "Option C": "Ohm",
        "Option D": "Watt",
        Correct: "C",
        Difficulty: "EASY",
        Tags: "",
        Solution: "SI unit of resistance is Ohm (Ω).",
      },
      {
        Exam: "Class 10",
        Subject: "Chemistry",
        Chapter: "Acids, Bases & Salts",
        Topic: "pH Scale",
        Question: "pH of pure water is?",
        "Option A": "0",
        "Option B": "7",
        "Option C": "14",
        "Option D": "1",
        Correct: "B",
        Difficulty: "EASY",
        Tags: "",
        Solution: "Pure water is neutral with pH = 7.",
      },
      {
        Exam: "Class 10",
        Subject: "Biology",
        Chapter: "Life Processes",
        Topic: "Photosynthesis",
        Question: "Which gas is released during photosynthesis?",
        "Option A": "CO2",
        "Option B": "N2",
        "Option C": "O2",
        "Option D": "H2",
        Correct: "C",
        Difficulty: "EASY",
        Tags: "",
        Solution: "Oxygen (O2) is released as a byproduct of photosynthesis.",
      },
    ];
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 22 },
        { wch: 55 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 8 },
        { wch: 10 },
        { wch: 8 },
        { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Questions");
      XLSX.writeFile(wb, "question-import-template.xlsx");
    });
  }

  return (
    <div className="space-y-4">
      {/* Template */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: "#F0FDFA", border: "1px solid #99F6E4" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "#0F766E" }}>
            Step 1 — Download Excel Template
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Topics are auto-created in DB if they don't exist
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="btn-secondary flex items-center gap-2"
        >
          <MdDownload className="text-lg" /> Template
        </button>
      </div>

      {/* Mode */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Step 2 — Choose Import Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${mode === "perrow" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}
          >
            <input
              type="radio"
              name="mode"
              value="perrow"
              checked={mode === "perrow"}
              onChange={() => setMode("perrow")}
              className="mt-0.5"
              style={{ accentColor: "#0D9488" }}
            />
            <div>
              <p
                className={`text-sm font-semibold ${mode === "perrow" ? "text-teal-700" : "text-gray-700"}`}
              >
                Per-Row (Recommended)
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Each row has its own Exam, Subject, Chapter, Topic — upload
                questions across multiple chapters in one file
              </p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${mode === "global" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}
          >
            <input
              type="radio"
              name="mode"
              value="global"
              checked={mode === "global"}
              onChange={() => setMode("global")}
              className="mt-0.5"
              style={{ accentColor: "#0D9488" }}
            />
            <div>
              <p
                className={`text-sm font-semibold ${mode === "global" ? "text-teal-700" : "text-gray-700"}`}
              >
                Global Mapping
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                All questions go to one chapter — simpler Excel without
                classification columns
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Per-row hint */}
      {mode === "perrow" && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <MdInfo className="text-blue-500 text-lg shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Exam, Subject, Chapter must match DB names exactly.{" "}
            <strong>Topic is optional</strong> — if it doesn't exist in DB it
            will be auto-created automatically.
          </p>
        </div>
      )}

      {/* Global mapping dropdowns */}
      {mode === "global" && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Select Classification
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Exam *
              </label>
              <select
                className="input-field py-1.5 text-sm"
                value={mapping.examId}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    examId: e.target.value,
                    subjectId: "",
                    chapterId: "",
                    topicId: "",
                  }))
                }
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subject *
              </label>
              <select
                className="input-field py-1.5 text-sm"
                value={mapping.subjectId}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    subjectId: e.target.value,
                    chapterId: "",
                    topicId: "",
                  }))
                }
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chapter *
              </label>
              <select
                className="input-field py-1.5 text-sm"
                value={mapping.chapterId}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    chapterId: e.target.value,
                    topicId: "",
                  }))
                }
              >
                <option value="">Select Chapter</option>
                {filteredChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Topic (optional)
              </label>
              <select
                className="input-field py-1.5 text-sm"
                value={mapping.topicId}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, topicId: e.target.value }))
                }
              >
                <option value="">Select Topic</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Upload */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">
          Step 3 — Upload Filled Excel
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all"
          style={{ borderColor: "#0D9488", background: "#F0FDFA" }}
        >
          <MdUpload style={{ color: "#0D9488", fontSize: 24 }} />
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "#0F766E" }}>
              {parsing ? "Parsing..." : "Click to upload Excel file"}
            </p>
            <p className="text-xs text-gray-400">.xlsx, .xls, .csv supported</p>
          </div>
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="card overflow-hidden">
          <div
            className="p-4 flex items-center justify-between"
            style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <MdCheckCircle style={{ color: "#16A34A", fontSize: 18 }} />
                <span className="text-sm font-medium text-gray-900">
                  {preview.valid.length} valid
                </span>
              </div>
              {preview.invalid.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <MdError style={{ color: "#DC2626", fontSize: 18 }} />
                  <span className="text-sm font-medium text-red-600">
                    {preview.invalid.length} errors
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setPreview(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <MdClose className="text-lg" />
            </button>
          </div>

          {preview.invalid.length > 0 && (
            <div className="p-3 bg-red-50 border-b border-red-100">
              <p className="text-xs font-semibold text-red-700 mb-2">
                Fix these errors:
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {preview.invalid.map((q, i) => (
                  <p key={i} className="text-xs text-red-600">
                    Row {q.rowNum}: {q.errors.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    "#",
                    "Question",
                    "Exam",
                    "Subject",
                    "Chapter",
                    "Topic",
                    "Correct",
                    "Difficulty",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.valid.map((q, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">
                      {q.questionText.substring(0, 60)}...
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {q.examName}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {q.subjectName}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {q.chapterName}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {q.topicRawName || "—"}
                    </td>
                    <td
                      className="px-3 py-2 font-semibold whitespace-nowrap"
                      style={{ color: "#16A34A" }}
                    >
                      {q.correct}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{q.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="p-4 flex justify-end gap-3"
            style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}
          >
            <button onClick={() => setPreview(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || preview.valid.length === 0}
              className="btn-primary"
            >
              {importing
                ? "Importing..."
                : `Import ${preview.valid.length} Questions`}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <MdCheckCircle style={{ color: "#16A34A", fontSize: 24 }} />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Import Complete!
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {result.imported} imported · {result.duplicates} duplicates
              skipped · {result.errors || 0} errors
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

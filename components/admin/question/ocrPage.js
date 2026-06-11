"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  MdCameraAlt,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdWarning,
  MdCheckCircle,
  MdExpandMore,
  MdExpandLess,
  MdSave,
  MdRefresh,
} from "react-icons/md";

// KaTeX renderer
function renderMath(text, katex) {
  if (!text || !katex) return text || "";
  try {
    let r = text;
    r = r.replace(/\$\$([^$]+)\$\$/g, (_, m) => {
      try {
        return katex.renderToString(m.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        return m;
      }
    });
    r = r.replace(/\$([^$\n]+)\$/g, (_, m) => {
      try {
        return katex.renderToString(m.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return m;
      }
    });
    return r.replace(/\n/g, "<br/>");
  } catch {
    return text;
  }
}

function QuestionCard({ q, index, selected, onToggle, katex }) {
  const [open, setOpen] = useState(true);
  const correctOpt = q.options?.find((o) => o.isCorrect);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: selected
          ? "1.5px solid #0D9488"
          : "0.5px solid var(--color-border-secondary)",
        background: selected ? "#F0FDFA" : "white",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(index)}
          className="flex-shrink-0 transition-colors"
          style={{ color: selected ? "#0D9488" : "#9CA3AF" }}
        >
          {selected ? (
            <MdCheckBox style={{ fontSize: 22 }} />
          ) : (
            <MdCheckBoxOutlineBlank style={{ fontSize: 22 }} />
          )}
        </button>

        {/* Question number + badges */}
        <div
          className="flex-1 flex items-center gap-2 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-xs font-bold text-gray-700">Q{index + 1}</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#EFF6FF", color: "#1D4ED8" }}
          >
            {q.questionType || "MCQ"}
          </span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#F1F5F9", color: "#64748B" }}
          >
            {q.difficulty || "MEDIUM"}
          </span>
          {q.hasImage && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "#FEF3C7", color: "#92400E" }}
            >
              Has diagram
            </span>
          )}
          {/* Preview of question */}
          {!open && (
            <p className="text-xs text-gray-500 truncate max-w-xs">
              {q.questionText?.replace(/\$[^$]+\$/g, "[math]").slice(0, 60)}...
            </p>
          )}
        </div>

        <button onClick={() => setOpen((v) => !v)} className="text-gray-400">
          {open ? (
            <MdExpandLess style={{ fontSize: 18 }} />
          ) : (
            <MdExpandMore style={{ fontSize: 18 }} />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-gray-100 pt-3">
          {/* Question text */}
          <div
            className="text-sm text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderMath(q.questionText, katex),
            }}
          />

          {/* Diagram note */}
          {q.hasImage && q.imageNote && (
            <div className="text-xs text-yellow-700 bg-yellow-50 rounded-lg p-2 border border-yellow-100">
              <span className="font-bold">Diagram: </span>
              {q.imageNote}
            </div>
          )}

          {/* Options */}
          {q.options?.length > 0 && (
            <div className="space-y-1">
              {q.options.map((opt) => (
                <div
                  key={opt.label}
                  className="flex items-start gap-2 text-sm px-2 py-1 rounded-lg"
                  style={{
                    background: opt.isCorrect ? "#F0FDF4" : "transparent",
                    border: opt.isCorrect ? "0.5px solid #86EFAC" : "none",
                  }}
                >
                  <span
                    className="font-bold flex-shrink-0 text-[11px] w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background: opt.isCorrect ? "#0D9488" : "#F1F5F9",
                      color: opt.isCorrect ? "white" : "#6B7280",
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    className={
                      opt.isCorrect
                        ? "text-green-800 font-medium text-xs"
                        : "text-gray-700 text-xs"
                    }
                    dangerouslySetInnerHTML={{
                      __html: renderMath(opt.optionText, katex),
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Solution */}
          {q.solutionText && (
            <div
              className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderMath(q.solutionText, katex),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function OcrPage({ exams, subjects, chapters }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [katex, setKatex] = useState(null);

  const [step, setStep] = useState("upload"); // upload | review | saving | done
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [hint, setHint] = useState("");
  const [extractionNotes, setExtractionNotes] = useState("");

  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]); // boolean array

  // Classification - applies to ALL questions
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    import("katex").then((k) => setKatex(k.default)).catch(() => {});
  }, []);

  const filteredSubjects = subjects.filter(
    (s) => !examId || s.examId === parseInt(examId),
  );
  const filteredChapters = chapters.filter(
    (c) => !subjectId || c.subjectId === parseInt(subjectId),
  );
  const selectedQuestions = questions.filter((_, i) => selected[i]);
  const selectedCount = selected.filter(Boolean).length;

  function toggleSelect(index) {
    setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  function selectAll() {
    setSelected(questions.map(() => true));
  }

  function selectNone() {
    setSelected(questions.map(() => false));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload JPG, PNG, GIF or WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      setPreview(dataUrl);
      setProcessing(true);
      setStep("upload");
      setQuestions([]);
      setSelected([]);

      try {
        const res = await fetch("/api/questions/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mediaType: file.type,
            hint,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.error || "Extraction failed");
          return;
        }
        const qs = data.data.questions || [];
        setQuestions(qs);
        setSelected(qs.map(() => true)); // select all by default
        setExtractionNotes(data.data.extractionNotes || "");
        setStep("review");
        toast.success(
          `${qs.length} question${qs.length > 1 ? "s" : ""} extracted!`,
        );
      } catch (err) {
        toast.error("OCR failed: " + err.message);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSaveAll() {
    if (!examId || !subjectId || !chapterId) {
      toast.error("Please select Exam, Subject and Chapter");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Select at least one question");
      return;
    }

    setSaving(true);
    setStep("saving");
    let saved = 0;
    let failed = 0;

    for (const q of selectedQuestions) {
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: q.questionText,
            questionType: q.questionType || "MCQ",
            difficulty: q.difficulty || "MEDIUM",
            examId: parseInt(examId),
            subjectId: parseInt(subjectId),
            chapterId: parseInt(chapterId),
            solutionText: q.solutionText || "",
            isActive: true,
            tags: [],
            options: (q.questionType !== "INTEGER" ? q.options : []) || [],
            integerAnswer:
              q.questionType === "INTEGER" ? q.correctAnswer : null,
            skipDuplicateCheck: false,
          }),
        });
        const data = await res.json();
        if (data.success || data.duplicate) {
          saved++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setSavedCount(saved);
    setSaving(false);
    setStep("done");

    if (failed > 0) {
      toast.error(`${saved} saved, ${failed} failed`);
    } else {
      toast.success(`${saved} questions saved to question bank!`);
    }
  }

  function reset() {
    setStep("upload");
    setPreview(null);
    setQuestions([]);
    setSelected([]);
    setExtractionNotes("");
    setSavedCount(0);
    setHint("");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">
          Extract Questions from Image
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a photo of a textbook page. AI extracts all questions with
          LaTeX. Select which to save.
        </p>
      </div>

      {/* Done state */}
      {step === "done" && (
        <div className="card p-8 text-center">
          <MdCheckCircle
            style={{ fontSize: 48, color: "#15803D", margin: "0 auto 12px" }}
          />
          <p className="text-lg font-bold text-gray-900 mb-1">
            {savedCount} Questions Saved!
          </p>
          <p className="text-sm text-gray-500 mb-5">
            Added to your question bank successfully.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: "#F0FDFA",
                color: "#0F766E",
                border: "0.5px solid #0D9488",
              }}
            >
              <MdCameraAlt style={{ fontSize: 16 }} /> Extract More
            </button>
            <button
              onClick={() => router.push("/admin/questions")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#0D9488" }}
            >
              View Question Bank
            </button>
          </div>
        </div>
      )}

      {step !== "done" && (
        <>
          {/* Upload section */}
          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subject hint{" "}
                <span className="font-normal text-gray-400">
                  (helps AI understand context)
                </span>
              </label>
              <input
                type="text"
                className="input-field text-sm py-1.5"
                placeholder="e.g. Chemistry - Acids and Bases, Physics - Thermodynamics"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                disabled={processing}
              />
            </div>

            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-teal-400"
              style={{
                borderColor: preview ? "#0D9488" : "#D1D5DB",
                background: preview ? "#F0FDFA" : "#FAFAFA",
              }}
              onClick={() => !processing && fileRef.current?.click()}
            >
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Uploaded"
                    className="max-h-40 mx-auto rounded-lg object-contain mb-2"
                  />
                  {!processing && (
                    <p className="text-xs text-teal-600 font-medium">
                      Click to upload a different image
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <MdCameraAlt
                    style={{
                      fontSize: 40,
                      color: "#9CA3AF",
                      margin: "0 auto 8px",
                    }}
                  />
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Click to upload image
                  </p>
                  <p className="text-xs text-gray-400">
                    JPG, PNG, WEBP - up to 5MB
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Textbook photos, screenshots, handwritten notes
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFile}
                disabled={processing}
              />
            </div>

            {processing && (
              <div className="flex items-center justify-center gap-3 py-3">
                <div
                  className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                  style={{ borderTopColor: "#0D9488" }}
                />
                <p className="text-sm text-gray-600">
                  Reading image and extracting questions...
                </p>
              </div>
            )}

            {extractionNotes && (
              <div
                className="flex items-start gap-2 rounded-lg p-3"
                style={{ background: "#FFFBEB", border: "0.5px solid #FCD34D" }}
              >
                <MdWarning
                  style={{
                    fontSize: 14,
                    color: "#D97706",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <p className="text-xs text-yellow-700">{extractionNotes}</p>
              </div>
            )}
          </div>

          {/* Review section */}
          {step === "review" && questions.length > 0 && (
            <>
              {/* Classification - applies to all */}
              <div className="card p-5">
                <p className="text-sm font-bold text-gray-800 mb-3">
                  Classify all questions
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    (applies to all selected questions)
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Exam *
                    </label>
                    <select
                      className="input-field py-1.5 text-sm"
                      value={examId}
                      onChange={(e) => {
                        setExamId(e.target.value);
                        setSubjectId("");
                        setChapterId("");
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
                    <label className="block text-xs text-gray-500 mb-1">
                      Subject *
                    </label>
                    <select
                      className="input-field py-1.5 text-sm"
                      value={subjectId}
                      onChange={(e) => {
                        setSubjectId(e.target.value);
                        setChapterId("");
                      }}
                      disabled={!examId}
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
                      Chapter *
                    </label>
                    <select
                      className="input-field py-1.5 text-sm"
                      value={chapterId}
                      onChange={(e) => setChapterId(e.target.value)}
                      disabled={!subjectId}
                    >
                      <option value="">Select Chapter</option>
                      {filteredChapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Question list with checkboxes */}
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">
                      {questions.length} questions extracted
                    </p>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#CCFBF1", color: "#0F766E" }}
                    >
                      {selectedCount} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-teal-600 hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={selectNone}
                      className="text-xs text-gray-400 hover:underline font-medium"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <QuestionCard
                      key={i}
                      q={q}
                      index={i}
                      selected={selected[i]}
                      onToggle={toggleSelect}
                      katex={katex}
                    />
                  ))}
                </div>
              </div>

              {/* Save bar - sticky at bottom */}
              <div className="sticky bottom-4 z-10">
                <div
                  className="card p-4 flex items-center justify-between shadow-lg"
                  style={{ border: "0.5px solid #0D9488" }}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {selectedCount} of {questions.length} questions selected
                    </p>
                    <p className="text-xs text-gray-500">
                      {!examId || !subjectId || !chapterId
                        ? "Select Exam, Subject and Chapter to save"
                        : "Ready to save to question bank"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium"
                      style={{ background: "#F1F5F9", color: "#64748B" }}
                    >
                      <MdRefresh style={{ fontSize: 16 }} /> Reset
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={
                        saving ||
                        selectedCount === 0 ||
                        !examId ||
                        !subjectId ||
                        !chapterId
                      }
                      className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
                      style={{
                        background:
                          saving ||
                          !examId ||
                          !subjectId ||
                          !chapterId ||
                          selectedCount === 0
                            ? "#9CA3AF"
                            : "#0D9488",
                      }}
                    >
                      <MdSave style={{ fontSize: 16 }} />
                      {saving
                        ? "Saving..."
                        : `Save ${selectedCount} Question${selectedCount !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

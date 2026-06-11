"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  MdCameraAlt,
  MdClose,
  MdArrowBack,
  MdArrowForward,
  MdCheckCircle,
  MdWarning,
  MdExpandMore,
  MdExpandLess,
} from "react-icons/md";

function renderMath(text, katex) {
  if (!text || !katex) return text || "";
  try {
    let r = text;
    // Replace literal \n in JSON string with actual newline marker
    r = r.replace(/\\n/g, "\n");
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

export default function OcrUpload({ onApply }) {
  const [open, setOpen] = useState(false);
  const [katex, setKatex] = useState(null);
  const fileRef = useRef(null);

  // Extraction state
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [hint, setHint] = useState("");
  const [extractionNotes, setExtractionNotes] = useState("");

  // Questions cache - persists across modal open/close
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [usedIndices, setUsedIndices] = useState(new Set());

  const hasQuestions = questions.length > 0;
  const currentQ = questions[currentIndex] || null;
  const totalQ = questions.length;

  useEffect(() => {
    import("katex").then((k) => setKatex(k.default)).catch(() => {});
  }, []);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function resetAll() {
    setQuestions([]);
    setCurrentIndex(0);
    setUsedIndices(new Set());
    setPreview(null);
    setHint("");
    setExtractionNotes("");
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
      setQuestions([]);
      setCurrentIndex(0);
      setUsedIndices(new Set());
      setExtractionNotes("");

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
        setCurrentIndex(0);
        setExtractionNotes(data.data.extractionNotes || "");
        toast.success(
          `${qs.length} question${qs.length > 1 ? "s" : ""} found!`,
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

  function handleApply() {
    if (!currentQ) return;
    onApply(currentQ);
    setUsedIndices((prev) => new Set([...prev, currentIndex]));
    closeModal();
    // Auto-advance to next unused question
    const nextUnused = questions.findIndex(
      (_, i) => i > currentIndex && !usedIndices.has(i),
    );
    if (nextUnused !== -1) setCurrentIndex(nextUnused);
    toast.success(
      "Form filled! Save this question then come back for the next one.",
    );
  }

  function goTo(idx) {
    if (idx >= 0 && idx < questions.length) setCurrentIndex(idx);
  }

  // Button label
  function getButtonLabel() {
    if (!hasQuestions) return "Extract from Image";
    const remaining = questions.length - usedIndices.size;
    if (remaining === 0) return "All Done ✓";
    return `Question ${currentIndex + 1} of ${totalQ} (${remaining} remaining)`;
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{
          background:
            hasQuestions && usedIndices.size < totalQ ? "#F0FDF4" : "#EFF6FF",
          color:
            hasQuestions && usedIndices.size < totalQ ? "#15803D" : "#1D4ED8",
          border: `0.5px solid ${hasQuestions && usedIndices.size < totalQ ? "#86EFAC" : "#BFDBFE"}`,
        }}
      >
        {hasQuestions && usedIndices.size < totalQ ? (
          <MdCheckCircle style={{ fontSize: 17 }} />
        ) : (
          <MdCameraAlt style={{ fontSize: 17 }} />
        )}
        {getButtonLabel()}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <MdCameraAlt style={{ fontSize: 20, color: "#1D4ED8" }} />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {hasQuestions
                      ? `Question ${currentIndex + 1} of ${totalQ}`
                      : "Extract from Image"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {hasQuestions
                      ? `${usedIndices.size} used, ${totalQ - usedIndices.size} remaining`
                      : "Upload a photo - AI extracts all questions at once"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasQuestions && (
                  <button
                    onClick={resetAll}
                    className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: "#FEF2F2", color: "#DC2626" }}
                  >
                    New Image
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MdClose style={{ fontSize: 20 }} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Upload area - only shown when no questions yet */}
              {!hasQuestions && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subject hint{" "}
                      <span className="font-normal text-gray-400">
                        (optional - helps AI)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input-field text-sm py-1.5"
                      placeholder="e.g. Chemistry - Acids and Bases"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      disabled={processing}
                    />
                  </div>

                  <div
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-blue-400"
                    style={{ borderColor: "#BFDBFE", background: "#F8FAFF" }}
                    onClick={() => !processing && fileRef.current?.click()}
                  >
                    {processing ? (
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
                          style={{ borderTopColor: "#1D4ED8" }}
                        />
                        <p className="text-sm text-gray-600">
                          Reading image and extracting questions...
                        </p>
                        <p className="text-xs text-gray-400">
                          This takes 5-10 seconds
                        </p>
                      </div>
                    ) : (
                      <div>
                        <MdCameraAlt
                          style={{
                            fontSize: 44,
                            color: "#93C5FD",
                            margin: "0 auto 10px",
                          }}
                        />
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Click to upload image
                        </p>
                        <p className="text-xs text-gray-400">
                          JPG, PNG, WEBP up to 5MB
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

                  {extractionNotes && (
                    <div
                      className="flex items-start gap-2 rounded-lg p-3"
                      style={{
                        background: "#FFFBEB",
                        border: "0.5px solid #FCD34D",
                      }}
                    >
                      <MdWarning
                        style={{
                          fontSize: 14,
                          color: "#D97706",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <p className="text-xs text-yellow-700">
                        {extractionNotes}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Question navigator - shown when questions are loaded */}
              {hasQuestions && (
                <>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {questions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goTo(i)}
                        className="w-7 h-7 rounded-full text-[11px] font-bold transition-all"
                        style={{
                          background: usedIndices.has(i)
                            ? "#DCFCE7"
                            : i === currentIndex
                              ? "#0D9488"
                              : "#F1F5F9",
                          color: usedIndices.has(i)
                            ? "#15803D"
                            : i === currentIndex
                              ? "white"
                              : "#9CA3AF",
                          border:
                            i === currentIndex ? "2px solid #0D9488" : "none",
                        }}
                      >
                        {usedIndices.has(i) ? "✓" : i + 1}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      Click a number to jump to that question
                    </span>
                  </div>

                  {/* Current question preview */}
                  {currentQ && (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        border: "0.5px solid var(--color-border-secondary)",
                      }}
                    >
                      {/* Question header */}
                      <div
                        className="px-4 py-2.5 flex items-center gap-2"
                        style={{
                          background: "var(--color-background-secondary)",
                        }}
                      >
                        <span className="text-xs font-bold text-gray-600">
                          Q{currentIndex + 1}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#EFF6FF", color: "#1D4ED8" }}
                        >
                          {currentQ.questionType || "MCQ"}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#F1F5F9", color: "#64748B" }}
                        >
                          {currentQ.difficulty || "MEDIUM"}
                        </span>
                        {currentQ.hasImage && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "#FEF3C7", color: "#92400E" }}
                          >
                            Has diagram
                          </span>
                        )}
                        {usedIndices.has(currentIndex) && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "#DCFCE7", color: "#15803D" }}
                          >
                            Already used
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Question text */}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                            Question
                          </p>
                          <div
                            className="text-sm text-gray-800 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: renderMath(currentQ.questionText, katex),
                            }}
                          />
                        </div>

                        {/* Diagram note */}
                        {currentQ.hasImage && currentQ.imageNote && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 rounded-lg p-2.5 border border-yellow-100">
                            <span className="font-bold">Diagram: </span>
                            {currentQ.imageNote}
                          </div>
                        )}

                        {/* Options */}
                        {currentQ.options?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                              Options
                            </p>
                            <div className="space-y-1">
                              {currentQ.options.map((opt) => (
                                <div
                                  key={opt.label}
                                  className="flex items-start gap-2 text-sm px-2 py-1.5 rounded-lg"
                                  style={{
                                    background: opt.isCorrect
                                      ? "#F0FDF4"
                                      : "transparent",
                                    border: opt.isCorrect
                                      ? "0.5px solid #86EFAC"
                                      : "none",
                                  }}
                                >
                                  <span
                                    className="font-bold flex-shrink-0 text-[11px] w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                    style={{
                                      background: opt.isCorrect
                                        ? "#0D9488"
                                        : "#F1F5F9",
                                      color: opt.isCorrect
                                        ? "white"
                                        : "#6B7280",
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
                                  {opt.isCorrect && (
                                    <span className="text-[10px] text-green-600 flex-shrink-0 ml-1">
                                      (correct)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Solution */}
                        {currentQ.solutionText && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                              Solution
                            </p>
                            <div
                              className="text-xs text-gray-700 bg-gray-50 rounded-lg p-2.5 leading-loose"
                              style={{ lineHeight: "1.8" }}
                              dangerouslySetInnerHTML={{
                                __html: renderMath(
                                  currentQ.solutionText,
                                  katex,
                                ),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation + Apply */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goTo(currentIndex - 1)}
                      disabled={currentIndex === 0}
                      className="p-2 rounded-lg border transition-all disabled:opacity-30"
                      style={{ borderColor: "var(--color-border-secondary)" }}
                    >
                      <MdArrowBack style={{ fontSize: 16, color: "#6B7280" }} />
                    </button>

                    <button
                      onClick={() => goTo(currentIndex + 1)}
                      disabled={currentIndex === totalQ - 1}
                      className="p-2 rounded-lg border transition-all disabled:opacity-30"
                      style={{ borderColor: "var(--color-border-secondary)" }}
                    >
                      <MdArrowForward
                        style={{ fontSize: 16, color: "#6B7280" }}
                      />
                    </button>

                    <button
                      onClick={handleApply}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                      style={{
                        background: usedIndices.has(currentIndex)
                          ? "#9CA3AF"
                          : "#0D9488",
                      }}
                    >
                      {usedIndices.has(currentIndex)
                        ? "Already Used - Fill Again?"
                        : `Fill Form with Q${currentIndex + 1}`}
                    </button>

                    {/* Skip to next unused */}
                    {totalQ - usedIndices.size > 0 && (
                      <button
                        onClick={() => {
                          const next = questions.findIndex(
                            (_, i) => !usedIndices.has(i) && i !== currentIndex,
                          );
                          if (next !== -1) goTo(next);
                        }}
                        className="text-xs px-3 py-2 rounded-lg border font-medium"
                        style={{
                          borderColor: "var(--color-border-secondary)",
                          color: "#6B7280",
                        }}
                      >
                        Skip
                      </button>
                    )}
                  </div>

                  {/* All done message */}
                  {usedIndices.size === totalQ && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{
                        background: "#F0FDF4",
                        border: "0.5px solid #86EFAC",
                      }}
                    >
                      <MdCheckCircle
                        style={{ fontSize: 16, color: "#15803D" }}
                      />
                      <p className="text-xs font-semibold text-green-700">
                        All {totalQ} questions used! Upload a new image to
                        extract more.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

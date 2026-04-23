"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MdArrowBack,
  MdArrowForward,
  MdFlag,
  MdClose,
  MdCheck,
  MdTimer,
  MdGridView,
} from "react-icons/md";

function useKatex() {
  const [katex, setKatex] = useState(null);
  useEffect(() => {
    import("katex").then((k) => setKatex(k.default));
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
  }, []);
  return katex;
}

function renderMath(value, katex) {
  if (!value || !katex) return value || "";
  try {
    let result = value;

    // Display math $$...$$
    result = result.replace(/\$\$([^$]+)\$\$/g, (_, m) => {
      try {
        return katex.renderToString(m.trim(), {
          throwOnError: false,
          displayMode: true,
          output: "html",
          strict: false,
        });
      } catch {
        return m;
      }
    });

    // Inline math $...$
    result = result.replace(/\$([^$\n]+)\$/g, (_, m) => {
      try {
        return katex.renderToString(m.trim(), {
          throwOnError: false,
          displayMode: false,
          output: "html",
          strict: false,
        });
      } catch {
        return m;
      }
    });

    // Auto-detect LaTeX commands without $ signs (e.g. 100 \text{ J})
    if (!result.includes("$") && /\\[a-zA-Z]/.test(result)) {
      try {
        return katex.renderToString(result.trim(), {
          throwOnError: false,
          displayMode: false,
          output: "html",
          strict: false,
        });
      } catch {
        return result;
      }
    }

    result = result.replace(/\n/g, "<br/>");
    return result;
  } catch {
    return value;
  }
}

function Timer({ totalSecs, onTimeUp }) {
  const [secs, setSecs] = useState(totalSecs);

  useEffect(() => {
    if (secs <= 0) {
      onTimeUp?.();
      return;
    }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const isLow = secs < 300;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        background: isLow ? "#FEF2F2" : "#F0FDFA",
        border: `1px solid ${isLow ? "#FECACA" : "#99F6E4"}`,
      }}
    >
      <MdTimer style={{ color: isLow ? "#DC2626" : "#0D9488", fontSize: 18 }} />
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: isLow ? "#DC2626" : "#0F766E" }}
      >
        {h > 0 && `${String(h).padStart(2, "0")}:`}
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

function getPaletteColor(status) {
  switch (status) {
    case "answered":
      return { bg: "#16A34A", text: "white" };
    case "marked":
      return { bg: "#7C3AED", text: "white" };
    case "answered-marked":
      return { bg: "#7C3AED", text: "white", border: "#16A34A" };
    case "visited":
      return { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" };
    default:
      return { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" };
  }
}

export default function TestPreviewClient({ test }) {
  const katex = useKatex();
  const questions = test.testQuestions.map((tq) => tq.question);
  const total = questions.length;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  const [showPalette, setShowPalette] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const q = questions[current];

  function getStatus(i) {
    const qid = questions[i]?.id;
    if (!qid) return "not-visited";
    const isAnswered = answers[qid] !== undefined;
    const isMarked = marked[qid];
    if (isAnswered && isMarked) return "answered-marked";
    if (isAnswered) return "answered";
    if (isMarked) return "marked";
    if (visited[i]) return "visited";
    return "not-visited";
  }

  function goTo(i) {
    setCurrent(i);
    setVisited((v) => ({ ...v, [i]: true }));
    setShowPalette(false);
  }

  function selectOption(label) {
    setAnswers((a) => ({ ...a, [q.id]: label }));
  }

  function clearAnswer() {
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[q.id];
      return copy;
    });
  }

  function toggleMark() {
    setMarked((m) => ({ ...m, [q.id]: !m[q.id] }));
  }
  function handleNext() {
    if (current < total - 1) goTo(current + 1);
  }
  function handlePrev() {
    if (current > 0) goTo(current - 1);
  }

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.keys(marked).filter((k) => marked[k]).length;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#F0FDFA" }}
          >
            <MdCheck style={{ color: "#0D9488", fontSize: 32 }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Preview Complete
          </h2>
          <p className="text-gray-500 mb-6">
            This is how the test looks to students
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-lg font-bold text-green-700">
                {answeredCount}
              </p>
              <p className="text-xs text-green-600">Answered</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-lg font-bold text-purple-700">{markedCount}</p>
              <p className="text-xs text-purple-600">Marked</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-700">
                {total - answeredCount}
              </p>
              <p className="text-xs text-gray-500">Unanswered</p>
            </div>
          </div>
          <button
            onClick={() => window.history.back()}
            className="btn-primary w-full"
          >
            ← Back to Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white flex-shrink-0"
        style={{
          borderBottom: "1px solid #E5E7EB",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <MdArrowBack className="text-xl" />
          </button>
          <div>
            <p className="text-sm font-bold text-gray-900 truncate max-w-xs">
              {test.title}
            </p>
            <p className="text-xs text-gray-400">
              Preview Mode — {total} questions · {test.marksCorrect} marks each
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Timer
            totalSecs={test.durationMins * 60}
            onTimeUp={() => setShowSubmitConfirm(true)}
          />
          <button
            onClick={() => setShowPalette((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: "#F0FDFA",
              color: "#0F766E",
              border: "1px solid #99F6E4",
            }}
          >
            <MdGridView className="text-base" /> Palette
          </button>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="btn-primary py-1.5 text-sm"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main question area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: "#F0FDFA", color: "#0F766E" }}
                >
                  Q {current + 1} / {total}
                </span>
                <span className="text-xs text-gray-400">
                  {q?.chapter?.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    background:
                      q?.difficulty === "EASY"
                        ? "#F0FDF4"
                        : q?.difficulty === "HARD"
                          ? "#FEF2F2"
                          : "#FFFBEB",
                    color:
                      q?.difficulty === "EASY"
                        ? "#166534"
                        : q?.difficulty === "HARD"
                          ? "#991B1B"
                          : "#92400E",
                  }}
                >
                  {q?.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span style={{ color: "#16A34A" }}>+{test.marksCorrect}</span>
                <span className="text-gray-300">/</span>
                <span style={{ color: "#DC2626" }}>{test.negativeMarking}</span>
              </div>
            </div>

            {/* Question text */}
            <div className="card p-5 mb-4">
              {q?.questionImageUrl && (
                <img
                  src={q.questionImageUrl}
                  alt="Question"
                  className="max-h-48 object-contain mb-4 rounded"
                />
              )}
              {katex ? (
                <div
                  className="text-base text-gray-900 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMath(q?.questionText, katex),
                  }}
                />
              ) : (
                <p className="text-base text-gray-900 leading-relaxed">
                  {q?.questionText}
                </p>
              )}
            </div>

            {/* MCQ Options */}
            {q?.questionType === "MCQ" && (
              <div className="space-y-2.5 mb-6">
                {q.options?.map((opt) => {
                  const selected = answers[q.id] === opt.label;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(opt.label)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: selected ? "#0D9488" : "#E5E7EB",
                        background: selected ? "#F0FDFA" : "white",
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: selected ? "#0D9488" : "#F3F4F6",
                          color: selected ? "white" : "#6B7280",
                        }}
                      >
                        {opt.label}
                      </span>
                      {katex ? (
                        <span
                          className="text-sm text-gray-800 flex-1"
                          dangerouslySetInnerHTML={{
                            __html: renderMath(opt.optionText, katex),
                          }}
                        />
                      ) : (
                        <span className="text-sm text-gray-800 flex-1">
                          {opt.optionText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi correct Options */}
            {q?.questionType === "MULTI_CORRECT" && (
              <div className="space-y-2.5 mb-6">
                {q.options?.map((opt) => {
                  const selectedArr = answers[q.id] || [];
                  const selected = selectedArr.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        const prev = answers[q.id] || [];
                        const next = prev.includes(opt.label)
                          ? prev.filter((l) => l !== opt.label)
                          : [...prev, opt.label];
                        setAnswers((a) => ({ ...a, [q.id]: next }));
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: selected ? "#0D9488" : "#E5E7EB",
                        background: selected ? "#F0FDFA" : "white",
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: selected ? "#0D9488" : "#F3F4F6",
                          color: selected ? "white" : "#6B7280",
                        }}
                      >
                        {opt.label}
                      </span>
                      {katex ? (
                        <span
                          className="text-sm text-gray-800 flex-1"
                          dangerouslySetInnerHTML={{
                            __html: renderMath(opt.optionText, katex),
                          }}
                        />
                      ) : (
                        <span className="text-sm text-gray-800 flex-1">
                          {opt.optionText}
                        </span>
                      )}
                    </button>
                  );
                })}
                <p className="text-xs text-gray-400">
                  Select all correct options
                </p>
              </div>
            )}

            {/* Integer type */}
            {q?.questionType === "INTEGER" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your answer:
                </label>
                <input
                  type="number"
                  className="input-field w-48 text-lg font-bold text-center"
                  placeholder="0"
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                  }
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMark}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all"
                  style={{
                    background: marked[q?.id] ? "#F5F3FF" : "white",
                    borderColor: marked[q?.id] ? "#7C3AED" : "#E5E7EB",
                    color: marked[q?.id] ? "#7C3AED" : "#6B7280",
                  }}
                >
                  <MdFlag className="text-base" />
                  {marked[q?.id] ? "Marked" : "Mark for Review"}
                </button>
                {answers[q?.id] !== undefined && (
                  <button
                    onClick={clearAnswer}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-2"
                  >
                    Clear Answer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={current === 0}
                  className="btn-secondary py-2 flex items-center gap-1 disabled:opacity-40"
                >
                  <MdArrowBack className="text-base" /> Prev
                </button>
                <button
                  onClick={handleNext}
                  disabled={current === total - 1}
                  className="btn-primary py-2 flex items-center gap-1 disabled:opacity-40"
                >
                  Next <MdArrowForward className="text-base" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Palette sidebar */}
        {/* {showPalette && (
          <div
            className="w-72 bg-white overflow-y-auto flex-shrink-0"
            style={{ borderLeft: "1px solid #E5E7EB" }}
          >
            <div
              className="p-4 sticky top-0 bg-white"
              style={{ borderBottom: "1px solid #E5E7EB" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">
                  Question Palette
                </p>
                <button
                  onClick={() => setShowPalette(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <MdClose className="text-lg" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { status: "answered", label: "Answered" },
                  { status: "marked", label: "Marked" },
                  { status: "visited", label: "Not Answered" },
                  { status: "not-visited", label: "Not Visited" },
                ].map(({ status, label }) => {
                  const c = getPaletteColor(status);
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded flex-shrink-0"
                        style={{
                          background: c.bg,
                          border: `1px solid ${c.border || c.bg}`,
                        }}
                      />
                      <span className="text-gray-500">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="px-4 py-3 grid grid-cols-3 gap-2 text-center"
              style={{ borderBottom: "1px solid #E5E7EB" }}
            >
              <div>
                <p className="text-lg font-bold text-green-600">
                  {answeredCount}
                </p>
                <p className="text-xs text-gray-400">Answered</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {markedCount}
                </p>
                <p className="text-xs text-gray-400">Marked</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-500">
                  {total - answeredCount}
                </p>
                <p className="text-xs text-gray-400">Left</p>
              </div>
            </div>
            <div className="p-4 grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const status = getStatus(i);
                const c = getPaletteColor(status);
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="w-10 h-10 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: i === current ? "#0D9488" : c.bg,
                      color: i === current ? "white" : c.text,
                      border:
                        i === current
                          ? "none"
                          : `1px solid ${c.border || c.bg}`,
                      outline: i === current ? "2px solid #0D9488" : "none",
                      outlineOffset: i === current ? "2px" : "0",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )} */}
        <div
          className="w-72 bg-white overflow-y-auto flex-shrink-0"
          style={{ borderLeft: "1px solid #E5E7EB" }}
        >
          <div
            className="p-4 sticky top-0 bg-white"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">
                Question Palette
              </p>
              <button
                onClick={() => setShowPalette(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <MdClose className="text-lg" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { status: "answered", label: "Answered" },
                { status: "marked", label: "Marked" },
                { status: "visited", label: "Not Answered" },
                { status: "not-visited", label: "Not Visited" },
              ].map(({ status, label }) => {
                const c = getPaletteColor(status);
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex-shrink-0"
                      style={{
                        background: c.bg,
                        border: `1px solid ${c.border || c.bg}`,
                      }}
                    />
                    <span className="text-gray-500">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="px-4 py-3 grid grid-cols-3 gap-2 text-center"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <div>
              <p className="text-lg font-bold text-green-600">
                {answeredCount}
              </p>
              <p className="text-xs text-gray-400">Answered</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-600">{markedCount}</p>
              <p className="text-xs text-gray-400">Marked</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-500">
                {total - answeredCount}
              </p>
              <p className="text-xs text-gray-400">Left</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-5 gap-2">
            {questions.map((_, i) => {
              const status = getStatus(i);
              const c = getPaletteColor(status);
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="w-10 h-10 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: i === current ? "#0D9488" : c.bg,
                    color: i === current ? "white" : c.text,
                    border:
                      i === current ? "none" : `1px solid ${c.border || c.bg}`,
                    outline: i === current ? "2px solid #0D9488" : "none",
                    outlineOffset: i === current ? "2px" : "0",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Submit Test?
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-700">
                  {answeredCount}
                </p>
                <p className="text-xs text-green-600">Answered</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-red-700">
                  {total - answeredCount}
                </p>
                <p className="text-xs text-red-600">Unanswered</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This is a preview — no data will be saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn-secondary flex-1"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  setSubmitted(true);
                }}
                className="btn-primary flex-1"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

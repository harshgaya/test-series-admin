"use client";

import { useState, useEffect } from "react";
import {
  MdExpandMore,
  MdExpandLess,
  MdOpenInNew,
  MdClose,
  MdCheckCircle,
} from "react-icons/md";

const DIFF_COLORS = {
  EASY: { bg: "#F0FDF4", text: "#166534" },
  MEDIUM: { bg: "#FFFBEB", text: "#92400E" },
  HARD: { bg: "#FEF2F2", text: "#991B1B" },
};

function renderMath(value, katex) {
  if (!value) return "";

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderInline(math) {
    return katex.renderToString(math.trim(), {
      throwOnError: false,
      displayMode: false,
      output: "html",
      strict: false,
    });
  }

  function renderDisplay(math) {
    return katex.renderToString(math.trim(), {
      throwOnError: false,
      displayMode: true,
      output: "html",
      strict: false,
    });
  }

  const hasDollar = /\$/.test(value);
  const hasCe = /\\ce\{/.test(value);
  const hasLatex = /\\[a-zA-Z]/.test(value);

  if (!hasDollar && !hasCe && hasLatex) {
    try {
      return renderInline(value);
    } catch {
      return escapeHtml(value);
    }
  }

  if (!hasDollar && !hasCe && !hasLatex) {
    return escapeHtml(value).replace(/\n/g, "<br/>");
  }

  let result = value;
  result = result.replace(/\$\$([^$]+)\$\$/g, (_, m) => {
    try {
      return renderDisplay(m);
    } catch {
      return escapeHtml(m);
    }
  });
  result = result.replace(/\$([^$\n]+)\$/g, (_, m) => {
    try {
      return renderInline(m);
    } catch {
      return escapeHtml(m);
    }
  });
  result = result.replace(/\\ce\{([^}]+)\}/g, (_, c) => {
    try {
      return renderInline(`\\mathrm{${c}}`);
    } catch {
      return `<code>${escapeHtml(c)}</code>`;
    }
  });
  result = result.replace(/\n/g, "<br/>");
  return result;
}

export default function QuestionPreviewCard({ question, index, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [katex, setKatex] = useState(null);

  const diff = DIFF_COLORS[question.difficulty] || DIFF_COLORS.MEDIUM;
  const correct = question.options?.find((o) => o.isCorrect);

  useEffect(() => {
    import("katex").then((k) => setKatex(k.default));
  }, []);

  useEffect(() => {
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
  }, []);

  function truncate(text, len = 80) {
    if (!text) return "";
    const plain = text
      .replace(/\$[^$]*\$/g, "[math]")
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "[math]");
    return plain.length > len ? plain.substring(0, len) + "..." : plain;
  }

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--color-border-tertiary)" }}
    >
      {/* Question row */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <span className="text-xs text-gray-400 w-5 flex-shrink-0 mt-0.5">
          {index}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ background: diff.bg, color: diff.text }}
            >
              {question.difficulty}
            </span>
            <span className="text-xs text-gray-400">
              {question.subject?.name}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">
              {question.chapter?.name}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-snug">
            {truncate(question.questionText)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Preview"
          >
            {expanded ? (
              <MdExpandLess className="text-lg" />
            ) : (
              <MdExpandMore className="text-lg" />
            )}
          </button>
          <a
            href={`/admin/questions/${question.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
            title="Edit in new tab"
          >
            <MdOpenInNew className="text-base" />
          </a>
          <button
            onClick={() => onRemove(question.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <MdClose className="text-base" />
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div
          className="mx-3 mb-3 p-3 rounded-lg"
          style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
          }}
        >
          {/* Question image */}
          {question.questionImageUrl && (
            <img
              src={question.questionImageUrl}
              alt="Question"
              className="max-h-40 object-contain mb-3 rounded"
            />
          )}

          {/* Question text */}
          {katex ? (
            <div
              className="text-sm text-gray-800 leading-relaxed mb-3"
              dangerouslySetInnerHTML={{
                __html: renderMath(question.questionText, katex),
              }}
            />
          ) : (
            <p className="text-sm text-gray-700 mb-3">
              {question.questionText}
            </p>
          )}

          {/* Options */}
          {question.options?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {question.options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                  style={{
                    background: opt.isCorrect ? "#F0FDF4" : "white",
                    border: `0.5px solid ${opt.isCorrect ? "#6EE7B7" : "var(--color-border-tertiary)"}`,
                  }}
                >
                  {opt.isCorrect && (
                    <MdCheckCircle
                      className="text-green-500 flex-shrink-0 mt-0.5"
                      style={{ fontSize: 14 }}
                    />
                  )}
                  {!opt.isCorrect && (
                    <span
                      className="w-4 h-4 rounded-full border flex-shrink-0 mt-0.5"
                      style={{ borderColor: "var(--color-border-secondary)" }}
                    />
                  )}
                  <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
                    {opt.label}.
                  </span>
                  {katex ? (
                    <span
                      className="text-sm text-gray-700 flex-1"
                      dangerouslySetInnerHTML={{
                        __html: renderMath(opt.optionText, katex),
                      }}
                    />
                  ) : (
                    <span className="text-sm text-gray-700">
                      {opt.optionText}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Integer answer */}
          {question.questionType === "INTEGER" &&
            question.integerAnswer !== null && (
              <div className="text-sm">
                <span className="text-gray-500">Answer: </span>
                <span className="font-semibold text-green-600">
                  {String(question.integerAnswer)}
                </span>
              </div>
            )}

          {/* Solution preview */}
          {question.solutionText && (
            <div
              className="mt-2 pt-2"
              style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}
            >
              <p className="text-xs font-medium text-gray-400 mb-1">Solution</p>
              {katex ? (
                <div
                  className="text-xs text-gray-600"
                  dangerouslySetInnerHTML={{
                    __html: renderMath(question.solutionText, katex),
                  }}
                />
              ) : (
                <p className="text-xs text-gray-600">{question.solutionText}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

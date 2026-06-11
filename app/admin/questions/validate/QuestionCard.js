"use client";

import { useState } from "react";
import {
  MdRefresh,
  MdWarning,
  MdExpandMore,
  MdExpandLess,
  MdThumbUp,
  MdVisibilityOff,
  MdAutoFixHigh,
  MdClose,
} from "react-icons/md";
import MathDisplay from "@/components/admin/question/MathDisplay";

export default function QuestionCard({
  q,
  onApprove,
  onDeactivate,
  onReset,
  onFix,
  onFixLatex,
}) {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixingLatex, setFixingLatex] = useState(false);

  const statusColor = q.aiValidationStatus === "fail" ? "#DC2626" : "#D97706";
  const statusBg = q.aiValidationStatus === "fail" ? "#FEF2F2" : "#FFFBEB";

  const allNotes = q.aiValidationNotes ? q.aiValidationNotes.split(" | ") : [];
  const latexNotes = allNotes.filter(
    (n) => n.startsWith("LaTeX:") || n.startsWith("AI-LaTeX:"),
  );
  const contentNotes = allNotes.filter(
    (n) => !n.startsWith("LaTeX:") && !n.startsWith("AI-LaTeX:"),
  );
  const hasLatex = latexNotes.length > 0;

  // Parse suggested fix from DB
  let suggestedFix = null;
  try {
    if (q.aiValidationFix) suggestedFix = JSON.parse(q.aiValidationFix);
  } catch {}

  const hasFix =
    suggestedFix &&
    (suggestedFix.questionText ||
      suggestedFix.solutionText ||
      suggestedFix.correctOptionLabel ||
      suggestedFix.optionChanges?.length > 0);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
        style={{ borderLeft: `3px solid ${statusColor}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusBg, color: statusColor }}
            >
              {q.aiValidationStatus === "fail" ? "FAIL" : "UNCERTAIN"}
            </span>
            {hasLatex && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#EFF6FF", color: "#1D4ED8" }}
              >
                LaTeX Issue
              </span>
            )}
            {hasFix && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#F0FDF4", color: "#15803D" }}
              >
                AI Fix Available
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              #{q.id} - {q.exam?.name} - {q.subject?.name} - {q.chapter?.name}
            </span>
          </div>
          <p className="text-sm text-gray-800 line-clamp-2">
            {q.questionText.replace(/\$[^$]+\$/g, "[math]").slice(0, 120)}...
          </p>
          {contentNotes[0] && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <MdWarning style={{ fontSize: 12, flexShrink: 0 }} />
              {contentNotes[0]}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {open ? (
            <MdExpandLess style={{ fontSize: 18, color: "#9CA3AF" }} />
          ) : (
            <MdExpandMore style={{ fontSize: 18, color: "#9CA3AF" }} />
          )}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "0.5px solid #F3F4F6" }}
        >
          {/* Question */}
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
              Question
            </p>
            <MathDisplay
              text={q.questionText}
              className="text-sm text-gray-800 leading-relaxed"
            />
          </div>

          {/* Options */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
              Options
            </p>
            <div className="space-y-1">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-start gap-2 text-sm px-2 py-1.5 rounded-lg"
                  style={{
                    background: opt.isCorrect ? "#F0FDF4" : "transparent",
                    border: opt.isCorrect ? "0.5px solid #86EFAC" : "none",
                  }}
                >
                  <span
                    className="font-bold flex-shrink-0 text-xs w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background: opt.isCorrect ? "#0D9488" : "#F1F5F9",
                      color: opt.isCorrect ? "white" : "#6B7280",
                    }}
                  >
                    {opt.label}
                  </span>
                  <div className="flex-1">
                    <MathDisplay
                      text={opt.optionText}
                      className={
                        opt.isCorrect
                          ? "text-green-800 font-medium"
                          : "text-gray-700"
                      }
                    />
                    {opt.isCorrect && (
                      <span className="ml-1 text-[10px] text-green-600">
                        (marked correct)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solution */}
          {q.solutionText && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Solution
              </p>
              <MathDisplay
                text={q.solutionText}
                className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3"
              />
            </div>
          )}

          {/* AI findings */}
          {contentNotes.length > 0 && (
            <div
              className="rounded-lg p-3"
              style={{
                background: statusBg,
                border: `0.5px solid ${statusColor}40`,
              }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wide mb-1.5"
                style={{ color: statusColor }}
              >
                AI Findings
              </p>
              {contentNotes.map((note, i) => (
                <p
                  key={i}
                  className="text-xs mb-0.5"
                  style={{ color: statusColor }}
                >
                  {i === 0 ? note : `• ${note}`}
                </p>
              ))}
            </div>
          )}

          {/* LaTeX issues */}
          {hasLatex && (
            <div
              className="rounded-lg p-3"
              style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 mb-1.5">
                LaTeX Issues
              </p>
              {latexNotes.map((note, i) => (
                <p key={i} className="text-xs text-blue-700 mb-0.5 font-mono">
                  {note.replace("LaTeX: ", "")}
                </p>
              ))}
            </div>
          )}

          {/* Preview modal */}
          {showPreview && (hasFix || hasLatex) && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
              onClick={() => setShowPreview(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div
                  className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
                  style={{ background: "#F0FDF4" }}
                >
                  <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                    <MdAutoFixHigh style={{ fontSize: 16 }} />
                    Before / After Preview - Question #{q.id}
                  </p>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MdClose style={{ fontSize: 20 }} />
                  </button>
                </div>

                <div
                  className="overflow-y-auto p-5 space-y-5"
                  style={{ maxHeight: "calc(90vh - 120px)" }}
                >
                  {/* Question comparison */}
                  {suggestedFix?.questionText && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Question Text
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold text-red-600 mb-1">
                            BEFORE
                          </p>
                          <MathDisplay
                            text={q.questionText}
                            className="text-sm text-gray-700 bg-red-50 rounded-lg p-3 border border-red-100 leading-relaxed block"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-green-600 mb-1">
                            AFTER
                          </p>
                          <MathDisplay
                            text={suggestedFix.questionText}
                            className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 border border-green-100 leading-relaxed block"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options comparison */}
                  {suggestedFix?.optionChanges?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Options
                      </p>
                      {suggestedFix.optionChanges.map((change) => {
                        const orig = q.options.find(
                          (o) => o.label === change.label,
                        );
                        return (
                          <div key={change.label} className="mb-2">
                            <p className="text-[11px] font-semibold text-gray-500 mb-1">
                              Option {change.label}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <MathDisplay
                                text={orig?.optionText || ""}
                                className="text-sm text-gray-700 bg-red-50 rounded-lg p-2.5 border border-red-100 block"
                              />
                              <MathDisplay
                                text={change.newText}
                                className="text-sm text-gray-700 bg-green-50 rounded-lg p-2.5 border border-green-100 block"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Correct answer change */}
                  {suggestedFix?.correctOptionLabel && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Correct Answer
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-sm bg-red-50 rounded-lg p-2.5 border border-red-100">
                          <span className="font-semibold text-red-700">
                            Before:{" "}
                          </span>
                          <span className="text-red-600">
                            Option{" "}
                            {q.options.find((o) => o.isCorrect)?.label || "?"}
                          </span>
                        </div>
                        <div className="text-sm bg-green-50 rounded-lg p-2.5 border border-green-100">
                          <span className="font-semibold text-green-700">
                            After:{" "}
                          </span>
                          <span className="text-green-600">
                            Option {suggestedFix.correctOptionLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Solution comparison */}
                  {suggestedFix?.solutionText && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Solution
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold text-red-600 mb-1">
                            BEFORE
                          </p>
                          <MathDisplay
                            text={q.solutionText || ""}
                            className="text-sm text-gray-700 bg-red-50 rounded-lg p-3 border border-red-100 leading-relaxed block"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-green-600 mb-1">
                            AFTER
                          </p>
                          <MathDisplay
                            text={suggestedFix.solutionText}
                            className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 border border-green-100 leading-relaxed block"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LaTeX only fix preview */}
                  {hasLatex && !hasFix && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                        LaTeX Auto-Fix Preview
                      </p>
                      <div
                        className="rounded-lg p-3"
                        style={{
                          background: "#EFF6FF",
                          border: "0.5px solid #BFDBFE",
                        }}
                      >
                        <p className="text-xs font-semibold text-blue-700 mb-2">
                          Issues that will be fixed:
                        </p>
                        {latexNotes.map((note, i) => (
                          <p
                            key={i}
                            className="text-xs text-blue-700 font-mono mb-0.5"
                          >
                            {note.replace("LaTeX: ", "")}
                          </p>
                        ))}
                        <p className="text-xs text-blue-600 mt-2">
                          These are auto-fixed by pattern replacement. No AI
                          involved.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal footer - single Apply All Fixes button */}
                <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowPreview(false);
                      setApplyingFix(true);
                      try {
                        await onFix(q.id, suggestedFix);
                      } finally {
                        setApplyingFix(false);
                      }
                    }}
                    disabled={applyingFix || fixingLatex}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all flex-1 justify-center"
                    style={{ background: applyingFix ? "#9CA3AF" : "#0D9488" }}
                  >
                    <MdAutoFixHigh style={{ fontSize: 15 }} />
                    {applyingFix
                      ? "Applying..."
                      : hasFix && hasLatex
                        ? "Apply All Fixes (AI + LaTeX)"
                        : hasFix
                          ? "Apply AI Fix"
                          : "Apply LaTeX Fix"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(q.id);
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: "#F0FDF4",
                color: "#15803D",
                border: "0.5px solid #86EFAC",
              }}
            >
              <MdThumbUp style={{ fontSize: 13 }} /> Approve
            </button>
            {(hasFix || hasLatex) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreview(true);
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{
                  background: "#DCFCE7",
                  color: "#15803D",
                  border: "0.5px solid #86EFAC",
                }}
              >
                <MdAutoFixHigh style={{ fontSize: 13 }} />
                Preview Fix
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate(q.id);
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: "#FEF2F2",
                color: "#DC2626",
                border: "0.5px solid #FECACA",
              }}
            >
              <MdVisibilityOff style={{ fontSize: 13 }} /> Deactivate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset(q.id);
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: "#F8FAFC",
                color: "#64748B",
                border: "0.5px solid #E2E8F0",
              }}
            >
              <MdRefresh style={{ fontSize: 13 }} /> Re-check
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/admin/questions/${q.id}`, "_blank");
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
              style={{
                background: "#F8FAFC",
                color: "#374151",
                border: "0.5px solid #E2E8F0",
              }}
            >
              Edit Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import QuestionPreviewCard from "./QuestionPreviewCard";

const ACCENT = "#0D9488";
const ACCENT_LIGHT = "#F0FDFA";
const ACCENT_TEXT = "#0F766E";
const ACCENT_BORDER = "#99F6E4";

const SUBJECT_COLORS = {
  Physics: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  Chemistry: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  Biology: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  Botany: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  Zoology: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  Maths: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  Mathematics: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

function getSubjectColor(subject) {
  return (
    SUBJECT_COLORS[subject] || {
      bg: "#F8FAFC",
      text: "#475569",
      border: "#E2E8F0",
    }
  );
}

export default function SelectedPanel({
  selectedQuestions,
  onRemove,
  marksCorrect,
}) {
  const questions = Array.isArray(selectedQuestions) ? selectedQuestions : [];
  const totalMarks = questions.length * (marksCorrect || 4);

  const grouped = {};
  for (const q of questions) {
    if (!q) continue;
    const subject = q.subject?.name || "Unknown";
    const chapter = q.chapter?.name || "Unknown";
    const key = `${subject}||${chapter}`;
    if (!grouped[key]) grouped[key] = { subject, chapter, questions: [] };
    grouped[key].questions.push(q);
  }

  const subjectCount = {};
  for (const q of questions) {
    if (!q) continue;
    const s = q.subject?.name || "Unknown";
    subjectCount[s] = (subjectCount[s] || 0) + 1;
  }

  return (
    <div
      className="flex flex-col"
      style={{
        border: `1px solid ${ACCENT_BORDER}`,
        borderRadius: 12,
        background: "white",
        overflow: "hidden",
        maxHeight: "calc(100vh - 180px)",
      }}
    >
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{
          background: ACCENT_LIGHT,
          borderBottom: `1px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: ACCENT_TEXT }}>
            Selected Questions
          </p>
          <span
            className="text-sm font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: ACCENT, color: "white" }}
          >
            {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color: ACCENT_TEXT }}>
            {totalMarks} total marks
          </span>
          {Object.keys(grouped).length > 0 && (
            <span className="text-xs" style={{ color: ACCENT_TEXT }}>
              · {Object.keys(grouped).length} chapters
            </span>
          )}
        </div>
      </div>

      {questions.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: ACCENT_LIGHT }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={ACCENT}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              No questions yet
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Use Auto Build, Bulk Pick
              <br />
              or Manual Search to add
            </p>
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {Object.values(grouped).map(
            ({ subject, chapter, questions: groupQs }) => {
              const color = getSubjectColor(subject);
              return (
                <div key={`${subject}||${chapter}`}>
                  <div
                    className="px-3 py-2 flex items-center justify-between sticky top-0"
                    style={{
                      background: color.bg,
                      borderBottom: `0.5px solid ${color.border}`,
                      borderTop: `0.5px solid ${color.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: color.border, color: color.text }}
                      >
                        {subject}
                      </span>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: color.text }}
                      >
                        {chapter}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-2"
                      style={{ background: color.border, color: color.text }}
                    >
                      {groupQs.length}
                    </span>
                  </div>

                  {groupQs.map((q, i) =>
                    q ? (
                      <QuestionPreviewCard
                        key={q.id}
                        question={q}
                        index={i + 1}
                        onRemove={onRemove}
                      />
                    ) : null,
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      {questions.length > 0 && (
        <div
          className="px-3 py-2.5 flex-shrink-0 flex flex-wrap gap-1.5"
          style={{
            borderTop: `1px solid ${ACCENT_BORDER}`,
            background: ACCENT_LIGHT,
          }}
        >
          {Object.entries(subjectCount).map(([subject, count]) => {
            const color = getSubjectColor(subject);
            return (
              <div
                key={subject}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: color.bg,
                  border: `0.5px solid ${color.border}`,
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: color.text }}
                >
                  {subject}
                </span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: color.border, color: color.text }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

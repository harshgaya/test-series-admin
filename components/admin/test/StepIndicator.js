"use client";

import { MdCheck } from "react-icons/md";

const STEPS = [
  "Test Type",
  "Basic Details",
  "Add Questions",
  "Settings",
  "Publish",
];

export default function StepIndicator({ step }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`flex items-center gap-2 ${i < STEPS.length - 1 ? "flex-1" : ""}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background:
                  i < step ? "#10B981" : i === step ? "#0D9488" : "#E5E7EB",
                color: i < step || i === step ? "white" : "#6B7280",
              }}
            >
              {i < step ? <MdCheck /> : i + 1}
            </div>
            <span
              className="text-sm hidden sm:block"
              style={{
                fontWeight: i === step ? 600 : 400,
                color: i === step ? "#0F172A" : "#9CA3AF",
              }}
            >
              {s}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="h-0.5 flex-1 mx-2"
              style={{ background: i < step ? "#10B981" : "#E5E7EB" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

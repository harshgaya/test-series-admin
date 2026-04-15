"use client";

import { useEffect, useState } from "react";

export default function MathEditor({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState(false);

  // Load KaTeX CSS once
  useEffect(() => {
    if (document.getElementById("katex-css")) return;
    const link = document.createElement("link");
    link.id = "katex-css";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
  }, []);

  // Render preview on every keystroke
  useEffect(() => {
    if (!value) {
      setPreview("");
      setError(false);
      return;
    }
    import("katex").then((katex) => {
      try {
        const html = katex.default.renderToString(value, {
          throwOnError: false,
          displayMode: true,
          output: "html",
          trust: true,
          macros: {
            "\\ce": "\\text{#1}",
          },
        });
        setPreview(html);
        setError(false);
      } catch {
        setPreview(value);
        setError(true);
      }
    });
  }, [value]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {hint && <span className="text-xs text-gray-400 ml-2">{hint}</span>}
        </label>
      )}

      {/* Box 1 — teacher types here */}
      <textarea
        className="input-field resize-none font-mono text-sm"
        rows={rows}
        placeholder={placeholder || "Type math here... e.g. x^2 + 2x = 0"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* Box 2 — live preview */}
      {value && (
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Preview — student sees this
          </p>
          {error ? (
            <p className="text-sm text-gray-600 font-mono">{value}</p>
          ) : (
            <div
              className="text-gray-900 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
        </div>
      )}
    </div>
  );
}

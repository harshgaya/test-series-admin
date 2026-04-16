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

  useEffect(() => {
    if (!value) {
      setPreview("");
      setError(false);
      return;
    }

    import("katex").then((katex) => {
      try {
        function escapeHtml(str) {
          return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }

        function renderInline(math) {
          return katex.default.renderToString(math.trim(), {
            throwOnError: false,
            displayMode: false,
            output: "html",
            strict: false,
          });
        }

        function renderDisplay(math) {
          return katex.default.renderToString(math.trim(), {
            throwOnError: false,
            displayMode: true,
            output: "html",
            strict: false,
          });
        }

        const hasDollar = /\$/.test(value);
        const hasCe = /\\ce\{/.test(value);
        const hasLatex = /\\[a-zA-Z]/.test(value);

        // Case 1 — no $ and no \ce but has latex commands
        // e.g. "100 \text{ J}" or "\frac{1}{2}"
        // render entire value as inline math
        if (!hasDollar && !hasCe && hasLatex) {
          try {
            setPreview(renderInline(value));
            setError(false);
          } catch {
            setPreview(escapeHtml(value));
            setError(false);
          }
          return;
        }

        // Case 2 — no $ and no latex — plain text
        if (!hasDollar && !hasCe && !hasLatex) {
          setPreview(escapeHtml(value).replace(/\n/g, "<br/>"));
          setError(false);
          return;
        }

        // Case 3 — mixed content with $...$ and/or \ce{...}
        let result = value;

        // Replace $$...$$ — display math
        result = result.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
          try {
            return renderDisplay(math);
          } catch {
            return escapeHtml(math);
          }
        });

        // Replace $...$ — inline math
        result = result.replace(/\$([^$\n]+)\$/g, (_, math) => {
          try {
            return renderInline(math);
          } catch {
            return escapeHtml(math);
          }
        });

        // Replace \ce{...} — chemistry
        result = result.replace(/\\ce\{([^}]+)\}/g, (_, chem) => {
          try {
            return renderInline(`\\mathrm{${chem}}`);
          } catch {
            return `<span style="font-family:monospace">${escapeHtml(chem)}</span>`;
          }
        });

        // Preserve line breaks
        result = result.replace(/\n/g, "<br/>");

        setPreview(result);
        setError(false);
      } catch {
        setPreview(`<span>${value}</span>`);
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
        placeholder={
          placeholder ||
          "Type here... wrap math in $...$ and chemistry in \\ce{...}"
        }
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
              className="text-gray-900 text-sm leading-relaxed overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
        </div>
      )}
    </div>
  );
}

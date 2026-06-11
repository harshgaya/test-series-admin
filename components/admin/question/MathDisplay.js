"use client";

import { useEffect, useState } from "react";

// Load KaTeX CSS once globally
function ensureKatexCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById("katex-css")) return;
  const link = document.createElement("link");
  link.id = "katex-css";
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
  document.head.appendChild(link);
}

export function renderMathToHtml(value, katex) {
  if (!value || !katex) return value || "";

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

  try {
    const hasDollar = /\$/.test(value);
    const hasLatex = /\\[a-zA-Z]/.test(value);

    // No $ but has latex commands - render whole thing as inline math
    if (!hasDollar && hasLatex) {
      try {
        return renderInline(value);
      } catch {
        return escapeHtml(value);
      }
    }

    // Plain text - no math
    if (!hasDollar && !hasLatex) {
      return escapeHtml(value).replace(/\n/g, "<br/>");
    }

    // Mixed content with $...$ blocks
    let result = value;

    // Display math $$...$$
    result = result.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
      try {
        return renderDisplay(math);
      } catch {
        return escapeHtml(math);
      }
    });

    // Inline math $...$
    result = result.replace(/\$([^$\n]+)\$/g, (_, math) => {
      try {
        return renderInline(math);
      } catch {
        return escapeHtml(math);
      }
    });

    // Chemistry \ce{...}
    result = result.replace(/\\ce\{([^}]+)\}/g, (_, chem) => {
      try {
        return renderInline(`\\mathrm{${chem}}`);
      } catch {
        return `<span style="font-family:monospace">${escapeHtml(chem)}</span>`;
      }
    });

    // Line breaks
    result = result.replace(/\n/g, "<br/>");

    return result;
  } catch {
    return value;
  }
}

/**
 * MathDisplay - renders LaTeX math using KaTeX
 * Same rendering logic as MathEditor preview box
 *
 * Usage:
 *   <MathDisplay text={question.questionText} />
 *   <MathDisplay text={option.optionText} className="text-sm" />
 */
export default function MathDisplay({ text, className = "", style = {} }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    ensureKatexCss();
  }, []);

  useEffect(() => {
    if (!text) {
      setHtml("");
      return;
    }
    import("katex")
      .then((k) => {
        setHtml(renderMathToHtml(text, k.default));
      })
      .catch(() => {
        setHtml(text);
      });
  }, [text]);

  if (!text) return null;

  return (
    <div
      className={`overflow-x-auto ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html || text }}
    />
  );
}

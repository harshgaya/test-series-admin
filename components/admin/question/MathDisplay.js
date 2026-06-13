"use client";
import { useEffect, useState } from "react";
// Import KaTeX CSS as a bundled module so the radical signs, fraction bars,
// superscripts, etc. always render. (Loading it from a CDN at runtime can be
// blocked by CSP/ad-blockers/offline, which makes math collapse to bare
// characters: \sqrt{2} shows as "2", \frac{p}{q} shows as "qp".)
import "katex/dist/katex.min.css";

// Load katex + mhchem once and cache the promise.
// mhchem mutates the katex module to add \ce and \pu, so it must be
// required immediately after katex, before any renderToString call.
let katexPromise = null;
export function loadKatex() {
  if (katexPromise) return katexPromise;
  katexPromise = import("katex").then(async (k) => {
    const katex = k.default;
    try {
      await import("katex/contrib/mhchem");
    } catch {
      // mhchem failed to load; \ce will fall back to plain text below
    }
    return katex;
  });
  return katexPromise;
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

    // No $ but has latex commands (including bare \ce{...}) - render whole
    // thing as inline math so KaTeX + mhchem handle it natively.
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

    // Mixed content with $...$ blocks.
    //
    // IMPORTANT: convert line breaks to <br/> on the RAW source FIRST, before
    // any math is rendered. KaTeX's output for \sqrt, \frac, etc. contains
    // SVG <path d="..."> data with embedded newlines; running a \n -> <br/>
    // replace AFTER rendering corrupts those paths (injecting <br/> mid-path),
    // which makes radicals/fractions fail to draw and collapse to bare text.
    // Math inside $...$ is .trim()'d when rendered, so these <br/> markers
    // only ever sit in the plain-text segments and never reach KaTeX.
    let result = value.replace(/\r\n/g, "\n").replace(/\n/g, "<br/>");

    // Display math $$...$$  (non-greedy)
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      try {
        return renderDisplay(math);
      } catch {
        return escapeHtml(math);
      }
    });

    // Inline math $...$  (non-greedy)
    result = result.replace(/\$([\s\S]+?)\$/g, (_, math) => {
      try {
        return renderInline(math);
      } catch {
        return escapeHtml(math);
      }
    });

    // NOTE: \ce is intentionally NOT handled here by a custom replace.
    // With mhchem loaded, \ce works natively inside the $...$ blocks above.
    // Any bare \ce{...} outside $...$ is caught by the "no dollar, has latex"
    // branch near the top of this function.

    return result;
  } catch {
    return value;
  }
}

/**
 * MathDisplay - renders LaTeX math using KaTeX (with mhchem for \ce / \pu)
 * Same rendering logic as MathEditor preview box
 *
 * Usage:
 *   <MathDisplay text={question.questionText} />
 *   <MathDisplay text={option.optionText} className="text-sm" />
 */
export default function MathDisplay({ text, className = "", style = {} }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!text) {
      setHtml("");
      return;
    }
    let active = true;
    loadKatex()
      .then((katex) => {
        if (active) setHtml(renderMathToHtml(text, katex));
      })
      .catch(() => {
        if (active) setHtml(text);
      });
    return () => {
      active = false;
    };
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

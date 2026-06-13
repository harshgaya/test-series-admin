"use client";

import { useEffect, useState } from "react";
import {
  renderMathToHtml,
  loadKatex,
} from "@/components/admin/question/MathDisplay";

export default function MathEditor({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!value) {
      setPreview("");
      return;
    }
    let active = true;
    // loadKatex() imports katex + mhchem (for \ce / \pu) once and caches it.
    loadKatex()
      .then((katex) => {
        if (active) setPreview(renderMathToHtml(value, katex));
      })
      .catch(() => {
        if (active) setPreview(value);
      });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {hint && <span className="text-xs text-gray-400 ml-2">{hint}</span>}
        </label>
      )}

      {/* Box 1 - teacher types here */}
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

      {/* Box 2 - live preview */}
      {value && (
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Preview - student sees this
          </p>
          <div
            className="text-gray-900 text-sm leading-relaxed overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: preview || value }}
          />
        </div>
      )}
    </div>
  );
}

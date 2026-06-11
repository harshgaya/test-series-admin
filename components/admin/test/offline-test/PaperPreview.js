"use client";

import { useEffect, useState } from "react";
import { renderMathToHtml } from "../../question/MathDisplay";

// All CSS for the paper - used in both preview iframe and print window
const PAPER_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; background: #E5E7EB; padding: 20px; }
  .a4-page {
    width: 210mm;
    padding: 12mm 18mm 15mm 18mm;
    background: white;
    margin: 0 auto 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    border-radius: 3px;
  }
  .paper-header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .paper-title { font-size: 17px; font-weight: bold; text-align: center; }
  .paper-inst { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .paper-subtitle { font-size: 12px; text-align: center; margin-top: 2px; }
  .paper-meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; }
  .instructions-box { border: 1px solid #000; padding: 6px 8px; margin-bottom: 10px; font-size: 10.5px; line-height: 1.6; }
  .section-header {
    border: 1.5px solid #000;
    padding: 3px 8px;
    font-size: 11.5px;
    font-weight: bold;
    margin: 10px 0 5px 0;
    text-align: center;
  }
  .section-meta { font-size: 10px; margin-bottom: 6px; color: #444; }
  .qblock { margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
  .qtext { line-height: 1.55; display: flex; gap: 5px; align-items: flex-start; }
  .qnum { font-weight: bold; flex-shrink: 0; min-width: 18px; }
  .options { margin-top: 4px; padding-left: 14px; display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 10.5px; }
  .opt { display: flex; gap: 3px; align-items: flex-start; }
  .opt-label { font-weight: bold; flex-shrink: 0; min-width: 22px; }
  .two-col { columns: 2; column-gap: 10mm; }
  .ans-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 4px 0 0 0; }
  .ans-table th, .ans-table td { border: 1px solid #999; padding: 3px 5px; text-align: center; min-width: 26px; }
  .ans-table th { background: #f0f0f0; font-weight: bold; }
  @media print {
    body { background: white; padding: 0; margin: 0; }
    .a4-page { box-shadow: none; border-radius: 0; margin: 0; padding: 12mm 18mm 15mm 18mm; width: 100%; }
    .page-break-before { page-break-before: always; }
  }
`;

function buildHTML(paper, sections, katex) {
  function rm(text) {
    if (!text || !katex) return text || "";
    try {
      return renderMathToHtml(text, katex);
    } catch {
      return text || "";
    }
  }

  const fs = { small: "11px", medium: "12px", large: "13.5px" }[
    paper.fontSize || "medium"
  ];
  const fo = { small: "10px", medium: "10.5px", large: "12px" }[
    paper.fontSize || "medium"
  ];
  const totalQ = sections.reduce(
    (s, sec) => s + (sec.questions?.length || 0),
    0,
  );
  const totalMarks = sections.reduce(
    (s, sec) => s + (sec.questions?.length || 0) * (sec.marksPerQ || 4),
    0,
  );

  let html = "";
  let globalNum = 0;

  // ── Question paper ────────────────────────────────────────────────────────
  html += `<div class="a4-page">`;

  // Header
  html += `<div class="paper-header">`;
  if (paper.instituteName)
    html += `<div class="paper-inst">${paper.instituteName}</div>`;
  html += `<div class="paper-title">${paper.examTitle || ""}</div>`;
  if (paper.subject)
    html += `<div class="paper-subtitle">${paper.subject}</div>`;
  html += `<div class="paper-meta">
    <span><b>Date:</b> ${paper.date || "___________"}</span>
    <span><b>Time:</b> ${paper.duration || "___________"}</span>
    <span><b>Max Marks:</b> ${paper.maxMarks || totalMarks}</span>
    <span><b>Total Questions:</b> ${totalQ}</span>
  </div>`;
  html += `</div>`;

  // Instructions
  if (paper.instructions) {
    const lines = paper.instructions
      .split("\n")
      .map((l) => `<div>${l}</div>`)
      .join("");
    html += `<div class="instructions-box"><b>General Instructions:</b><div style="margin-top:3px">${lines}</div></div>`;
  }

  // Sections + questions
  sections.forEach((section) => {
    if (!section.questions?.length) return;
    html += `<div class="section-header">${section.name} &mdash; ${section.questions.length} Questions</div>`;
    html += `<div class="section-meta">
      Marks per correct answer: +${section.marksPerQ} &nbsp;&bull;&nbsp;
      Negative marking: &minus;${section.negMarks} &nbsp;&bull;&nbsp;
      Maximum marks: ${section.questions.length * section.marksPerQ}
    </div>`;

    html += `<div class="${paper.twoColumn ? "two-col" : ""}">`;
    section.questions.forEach((q) => {
      globalNum++;

      // Options HTML
      let optHtml = "";
      if (q.options?.length) {
        const optItems = q.options
          .map(
            (o) =>
              `<div class="opt"><span class="opt-label">(${o.label})</span><span style="font-size:${fo}">${rm(o.optionText)}</span></div>`,
          )
          .join("");

        if (paper.twoColumn) {
          // 2x2 grid inside two-column layout
          optHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-top:3px;padding-left:14px">${optItems}</div>`;
        } else {
          // 4 options in a row
          optHtml = `<div class="options">${optItems}</div>`;
        }
      }

      // Image HTML
      const imgHtml = q.questionImageUrl
        ? `<div style="text-align:center;margin:5px 0"><img src="${q.questionImageUrl}" style="max-width:100%;max-height:110px"></div>`
        : "";

      html += `<div class="qblock">
        <div class="qtext" style="font-size:${fs}">
          <span class="qnum">${globalNum}.</span>
          <span>${rm(q.questionText)}</span>
        </div>
        ${imgHtml}
        ${optHtml}
      </div>`;
    });
    html += `</div>`; // two-col or plain div
  });

  html += `</div>`; // a4-page question paper

  // ── Answer key ────────────────────────────────────────────────────────────
  html += `<div class="a4-page page-break-before">`;
  html += `<div class="paper-header">
    <div class="paper-title">Answer Key</div>
    <div class="paper-subtitle">${paper.examTitle || ""}</div>
  </div>`;

  let secStart = 1;
  sections.forEach((section) => {
    if (!section.questions?.length) return;
    html += `<div class="section-header">${section.name}</div>`;

    // Split into chunks of 20 columns max (so table fits on page)
    const qs = section.questions;
    const chunk = 20;
    for (let i = 0; i < qs.length; i += chunk) {
      const slice = qs.slice(i, i + chunk);
      const headers = slice
        .map((_, j) => `<th>Q${secStart + i + j}</th>`)
        .join("");
      const answers = slice
        .map((q) => {
          const correct = q.options?.find((o) => o.isCorrect);
          return `<td>${correct?.label || (q.integerAnswer != null ? q.integerAnswer : "&mdash;")}</td>`;
        })
        .join("");
      html += `<table class="ans-table" style="margin-bottom:8px">
        <thead><tr>${headers}</tr></thead>
        <tbody><tr>${answers}</tr></tbody>
      </table>`;
    }
    secStart += qs.length;
  });

  html += `</div>`; // a4-page answer key

  return html;
}

function fullHTMLDoc(paper, sections, katex, forPrint = false) {
  const body = buildHTML(paper, sections, katex);
  const printCSS = forPrint
    ? "" // print CSS already in PAPER_CSS via @media print
    : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${paper.examTitle || "Question Paper"}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>${PAPER_CSS}</style>
</head>
<body>
  ${body}
  ${forPrint ? `<script>window.onload=function(){setTimeout(function(){window.print();},700)}<\/script>` : ""}
</body>
</html>`;
}

export default function PaperPreview({ paper, sections }) {
  const [katex, setKatex] = useState(null);
  const [srcDoc, setSrcDoc] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    import("katex").then((k) => setKatex(k.default)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!katex) return;
    setSrcDoc(fullHTMLDoc(paper, sections, katex, false));
  }, [katex, paper, sections]);

  function handlePrint() {
    if (!katex) {
      alert("Math renderer still loading, please wait...");
      return;
    }
    setPrinting(true);
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups for this site to print.");
      setPrinting(false);
      return;
    }
    win.document.write(fullHTMLDoc(paper, sections, katex, true));
    win.document.close();
    setPrinting(false);
  }

  const totalQ = sections.reduce(
    (s, sec) => s + (sec.questions?.length || 0),
    0,
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">
            {paper.examTitle || "Untitled Paper"}
          </p>
          <p className="text-xs text-gray-500">
            {sections.length} section{sections.length !== 1 ? "s" : ""} &middot;{" "}
            {totalQ} questions
            {paper.maxMarks ? ` · ${paper.maxMarks} marks` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 max-w-xs hidden sm:block">
            In print dialog: Paper=A4, Margins=None, enable "Background
            graphics"
          </p>
          <button
            onClick={handlePrint}
            disabled={printing || !katex}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
            style={{ background: !katex || printing ? "#9CA3AF" : "#0D9488" }}
          >
            🖨️{" "}
            {printing
              ? "Preparing..."
              : !katex
                ? "Loading..."
                : "Print / Save PDF"}
          </button>
        </div>
      </div>

      {/* Preview iframe - completely isolated from admin UI */}
      {katex && srcDoc ? (
        <iframe
          title="paper-preview"
          srcDoc={srcDoc}
          style={{
            width: "100%",
            height: "80vh",
            border: "none",
            borderRadius: 8,
            background: "#E5E7EB",
          }}
          sandbox="allow-same-origin"
        />
      ) : (
        <div
          className="card flex items-center justify-center"
          style={{ height: 400 }}
        >
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Rendering paper preview...</p>
          </div>
        </div>
      )}
    </div>
  );
}

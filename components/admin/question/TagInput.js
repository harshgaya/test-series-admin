"use client";

import { useState } from "react";
import { MdClose, MdAdd } from "react-icons/md";

const SUGGESTIONS = [
  "JEE Main 2024",
  "JEE Main 2023",
  "JEE Main 2022",
  "JEE Main 2021",
  "JEE Main 2020",
  "JEE Advanced 2024",
  "JEE Advanced 2023",
  "JEE Advanced 2022",
  "JEE Advanced 2021",
  "NEET 2024",
  "NEET 2023",
  "NEET 2022",
  "NEET 2021",
  "NEET 2020",
  "EAMCET 2024",
  "EAMCET 2023",
  "EAMCET 2022",
  "NTSE 2024",
  "NTSE 2023",
];

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  const filtered = input
    ? SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s),
      )
    : SUGGESTIONS.filter((s) => !tags.includes(s)).slice(0, 8);

  function addTag(tag) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput("");
    setShowSuggest(false);
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="relative">
      {/* Tags + input box */}
      <div
        className="min-h-10 w-full border border-gray-300 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-transparent"
        style={{ focusWithin: { boxShadow: "0 0 0 2px #0D9488" } }}
        onClick={() => document.getElementById("tag-input").focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: "#F0FDFA",
              color: "#0F766E",
              border: "1px solid #99F6E4",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              <MdClose style={{ fontSize: 12 }} />
            </button>
          </span>
        ))}

        <input
          id="tag-input"
          type="text"
          className="flex-1 min-w-32 outline-none text-sm bg-transparent py-0.5"
          placeholder={
            tags.length === 0 ? "Type tag e.g. JEE Main 2024..." : ""
          }
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggest && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <MdAdd style={{ color: "#0D9488", fontSize: 16 }} />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">
        Press Enter to add · Click suggestion to select · Backspace to remove
        last
      </p>
    </div>
  );
}

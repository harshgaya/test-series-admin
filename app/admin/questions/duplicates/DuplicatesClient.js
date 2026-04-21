"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  MdSearch,
  MdDelete,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdWarning,
  MdArrowBack,
} from "react-icons/md";

function SimilarityBadge({ pct }) {
  const color =
    pct === 100
      ? { bg: "#FEF2F2", text: "#DC2626", label: "Exact Match" }
      : pct >= 95
        ? { bg: "#FFF7ED", text: "#EA580C", label: `${pct}% Similar` }
        : { bg: "#FEFCE8", text: "#CA8A04", label: `${pct}% Similar` };
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: color.bg, color: color.text }}
    >
      {color.label}
    </span>
  );
}

function truncate(text, len = 120) {
  if (!text) return "";
  const plain = text
    .replace(/\$[^$]*\$/g, "[math]")
    .replace(/\\\w+\{[^}]*\}/g, "[math]");
  return plain.length > len ? plain.substring(0, len) + "..." : plain;
}

export default function DuplicatesClient({ exams }) {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checked, setChecked] = useState({});
  const [threshold, setThreshold] = useState(85);
  const [filterExam, setFilterExam] = useState("");
  const [scanned, setScanned] = useState(false);

  async function runScan() {
    setLoading(true);
    setGroups([]);
    setChecked({});
    setScanned(false);
    try {
      const params = new URLSearchParams({ threshold: threshold / 100 });
      if (filterExam) params.set("examId", filterExam);
      const res = await fetch(`/api/questions/duplicates?${params}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setGroups(data.data.groups);
      setStats({
        groups: data.data.totalGroups,
        duplicates: data.data.totalDuplicates,
        scanned: data.data.scanned,
      });
      setScanned(true);
      if (data.data.totalGroups === 0) toast.success("No duplicates found! 🎉");
      else toast.error(`Found ${data.data.totalGroups} duplicate groups`);
    } catch {
      toast.error("Scan failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(id) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function selectDuplicatesInGroup(group) {
    const updates = {};
    group.slice(1).forEach((q) => {
      updates[q.id] = true;
    });
    setChecked((c) => ({ ...c, ...updates }));
  }

  function selectAllDuplicates() {
    const updates = {};
    groups.forEach((group) => {
      group.slice(1).forEach((q) => {
        updates[q.id] = true;
      });
    });
    setChecked(updates);
  }

  function clearSelection() {
    setChecked({});
  }

  const checkedIds = Object.entries(checked)
    .filter(([, v]) => v)
    .map(([id]) => parseInt(id));
  const checkedCount = checkedIds.length;

  async function deleteSelected() {
    if (checkedCount === 0) {
      toast.error("Select questions to delete");
      return;
    }
    if (
      !confirm(
        `Delete ${checkedCount} selected questions? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/questions/duplicates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: checkedIds }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success(`${data.data.deleted} questions deleted!`);
      const newGroups = groups
        .map((g) => g.filter((q) => !checkedIds.includes(q.id)))
        .filter((g) => g.length > 1);
      setGroups(newGroups);
      setChecked({});
      setStats((s) => ({
        ...s,
        groups: newGroups.length,
        duplicates: newGroups.reduce((sum, g) => sum + g.length - 1, 0),
      }));
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors"
      >
        <MdArrowBack /> Back to Questions
      </Link>

      {/* Scan controls */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">
              Scan for Duplicates
            </h2>
            <p className="text-sm text-gray-500">
              Scans all questions and groups exact + near-duplicate matches
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <MdSearch className="text-lg" />
            {loading ? "Scanning..." : "Run Scan"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Filter by Exam{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              className="input-field py-1.5 text-sm"
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
            >
              <option value="">All Exams</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Similarity Threshold —{" "}
              <span className="text-teal-600 font-bold">{threshold}%</span>
            </label>
            <input
              type="range"
              min={70}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>70% (loose)</span>
              <span>85% (recommended)</span>
              <span>100% (exact only)</span>
            </div>
          </div>
        </div>
        {loading && (
          <div className="mt-5 flex items-center gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl">
            <div className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-teal-700">
                Scanning question bank...
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                This may take a moment for large question banks
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {scanned && stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Questions Scanned",
              value: stats.scanned.toLocaleString("en-IN"),
              icon: "🔍",
              bg: "bg-blue-50",
              text: "text-blue-700",
            },
            {
              label: "Duplicate Groups",
              value: stats.groups,
              icon: "📦",
              bg: "bg-orange-50",
              text: "text-orange-700",
            },
            {
              label: "Duplicates Found",
              value: stats.duplicates,
              icon: "⚠️",
              bg: "bg-red-50",
              text: "text-red-700",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.bg} rounded-2xl p-5 text-center border border-white`}
            >
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-3xl font-extrabold ${s.text} leading-none`}>
                {s.value}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      {groups.length > 0 && (
        <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={selectAllDuplicates}
              className="text-xs px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 transition-colors"
            >
              Select All Duplicates ({stats?.duplicates})
            </button>
            <button
              onClick={clearSelection}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Selection
            </button>
            {checkedCount > 0 && (
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg">
                {checkedCount} selected
              </span>
            )}
          </div>
          <button
            onClick={deleteSelected}
            disabled={deleting || checkedCount === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              checkedCount === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            }`}
            style={{ fontFamily: "Poppins, sans-serif", border: "none" }}
          >
            <MdDelete className="text-lg" />
            {deleting ? "Deleting..." : `Delete Selected (${checkedCount})`}
          </button>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group, gi) => (
            <div key={gi} className="card overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MdWarning className="text-orange-400 text-lg" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Group {gi + 1} — {group.length} questions
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group[0].exam?.name} · {group[0].subject?.name} ·{" "}
                      {group[0].chapter?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => selectDuplicatesInGroup(group)}
                  className="text-xs px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 transition-colors"
                >
                  Keep First, Select Rest
                </button>
              </div>
              {group.map((q, qi) => {
                const isFirst = qi === 0;
                const isChecked = !!checked[q.id];
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0 transition-colors ${isChecked ? "bg-red-50" : isFirst ? "bg-green-50/50" : "bg-white"}`}
                  >
                    <button
                      onClick={() => toggleCheck(q.id)}
                      className={`mt-0.5 shrink-0 text-xl cursor-pointer transition-colors ${isChecked ? "text-red-500" : "text-gray-300 hover:text-gray-500"}`}
                      style={{ background: "none", border: "none" }}
                    >
                      {isChecked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-400">
                          Q#{q.id}
                        </span>
                        <SimilarityBadge pct={q.similarity} />
                        {isFirst && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            ✓ Original (keep)
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(q.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {truncate(q.questionText)}
                      </p>
                    </div>
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="text-xs text-teal-600 no-underline font-semibold shrink-0 hover:text-teal-800 transition-colors"
                    >
                      Edit →
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {scanned && groups.length === 0 && !loading && (
        <div className="card p-16 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-base font-bold text-gray-700 mb-2">
            No duplicates found!
          </p>
          <p className="text-sm text-gray-400">
            Your question bank is clean at {threshold}% similarity threshold
          </p>
        </div>
      )}

      {!scanned && !loading && (
        <div className="card p-16 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-base font-bold text-gray-700 mb-2">
            Click "Run Scan" to find duplicates
          </p>
          <p className="text-sm text-gray-400">
            Scans all questions and groups similar ones together
          </p>
        </div>
      )}
    </div>
  );
}

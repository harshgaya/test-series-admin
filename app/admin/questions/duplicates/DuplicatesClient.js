"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  MdSearch,
  MdDelete,
  MdWarning,
  MdArrowBack,
  MdArrowForward,
} from "react-icons/md";
import MathDisplay from "@/components/admin/question/MathDisplay";

const PAGE_SIZE = 20;

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

export default function DuplicatesClient({ exams }) {
  // All groups stored client-side after scan
  const [allGroups, setAllGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null); // groupIndex being deleted
  const [threshold, setThreshold] = useState(95);
  const [filterExam, setFilterExam] = useState("");
  const [scanned, setScanned] = useState(false);
  const [page, setPage] = useState(1);

  // Client-side pagination - instant, no server round-trip
  const totalPages = Math.ceil((allGroups?.length || 0) / PAGE_SIZE);
  const pagedGroups = (allGroups || []).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  async function runScan() {
    setLoading(true);
    setAllGroups([]);
    setStats(null);
    setScanned(false);
    setPage(1);
    try {
      const params = new URLSearchParams({ threshold: threshold / 100 });
      if (filterExam) params.set("examId", filterExam);
      const res = await fetch(`/api/questions/duplicates?${params}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setAllGroups(data.data.groups || []);
      setStats({
        groups: data.data.totalGroups,
        duplicates: data.data.totalDuplicates,
        scanned: data.data.scanned,
      });
      setScanned(true);
      if (data.data.totalGroups === 0) toast.success("No duplicates found!");
      else
        toast(`Found ${data.data.totalGroups} duplicate groups`, {
          icon: "⚠️",
        });
    } catch {
      toast.error("Scan failed");
    } finally {
      setLoading(false);
    }
  }

  // Delete all duplicates in a group (keep first/oldest)
  async function deleteGroupDuplicates(groupIndex) {
    const group = allGroups[groupIndex];
    if (!group || group.length < 2) return;
    const toDelete = group.slice(1).map((q) => q.id); // keep first, delete rest

    setDeleting(groupIndex);
    try {
      const res = await fetch("/api/questions/duplicates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: toDelete }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `${data.data.deleted} question${data.data.deleted > 1 ? "s" : ""} deleted`,
      );

      // Remove this group from list - instant UI update
      const newGroups = allGroups.filter((_, i) => i !== groupIndex);
      setAllGroups(newGroups);
      setStats((s) => ({
        ...s,
        groups: (s?.groups || 1) - 1,
        duplicates: (s?.duplicates || 0) - toDelete.length,
      }));

      // Adjust page if needed
      const newTotalPages = Math.ceil(newGroups.length / PAGE_SIZE);
      if (page > newTotalPages && newTotalPages > 0) setPage(newTotalPages);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function goToPage(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Global offset for group numbering
  const globalOffset = (page - 1) * PAGE_SIZE;

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
              Uses Postgres trigram similarity. Set 95%+ to avoid false
              positives on template questions.
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
              min={85}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>85% (loose)</span>
              <span>95% (recommended)</span>
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
                Using pg_trgm index - usually 2-5 seconds
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
              value: (stats.scanned || 0).toLocaleString("en-IN"),
              icon: "🔍",
              bg: "bg-blue-50",
              text: "text-blue-700",
            },
            {
              label: "Duplicate Groups",
              value: stats?.groups || 0,
              icon: "📦",
              bg: "bg-orange-50",
              text: "text-orange-700",
            },
            {
              label: "Duplicates Found",
              value: stats?.duplicates || 0,
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

      {/* Groups */}
      {(allGroups?.length ?? 0) > 0 && (
        <>
          <div className="space-y-4">
            {pagedGroups.map((group, gi) => {
              const globalIndex = allGroups.indexOf(group);
              const isDeleting = deleting === globalIndex;
              const duplicateIds = group.slice(1).map((q) => q.id);

              return (
                <div key={gi} className="card overflow-hidden">
                  {/* Group header */}
                  <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MdWarning className="text-orange-400 text-lg" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Group {globalOffset + gi + 1} — {group.length}{" "}
                          questions
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {group[0].exam?.name} · {group[0].subject?.name} ·{" "}
                          {group[0].chapter?.name}
                        </p>
                      </div>
                    </div>

                    {/* Delete duplicates button - directly on group card */}
                    <button
                      onClick={() => deleteGroupDuplicates(globalIndex)}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                      style={{
                        background: isDeleting ? "#FEE2E2" : "#DC2626",
                        color: "white",
                        opacity: isDeleting ? 0.7 : 1,
                      }}
                    >
                      <MdDelete style={{ fontSize: 14 }} />
                      {isDeleting
                        ? "Deleting..."
                        : `Delete ${duplicateIds.length} Duplicate${duplicateIds.length > 1 ? "s" : ""}`}
                    </button>
                  </div>

                  {/* Questions in group */}
                  {group.map((q, qi) => {
                    const isFirst = qi === 0;
                    return (
                      <div
                        key={q.id}
                        className={`flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0 ${isFirst ? "bg-green-50/50" : "bg-white"}`}
                      >
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
                            {!isFirst && (
                              <span className="text-xs font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full">
                                Will be deleted
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {q.difficulty}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(q.createdAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                          <MathDisplay
                            text={q.questionText}
                            className="text-sm text-gray-700 leading-relaxed"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          />
                        </div>
                        <Link
                          href={`/admin/questions/${q.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 no-underline font-semibold shrink-0 hover:text-teal-800 transition-colors"
                        >
                          Edit ↗
                        </Link>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Pagination - instant, no server call */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} ({allGroups.length} total groups)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-40"
                  style={{ borderColor: "#E2E8F0", color: "#6B7280" }}
                >
                  <MdArrowBack style={{ fontSize: 14 }} /> Prev
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p;
                  if (totalPages <= 7) p = i + 1;
                  else if (page <= 4) p = i + 1;
                  else if (page >= totalPages - 3) p = totalPages - 6 + i;
                  else p = page - 3 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className="text-xs w-8 h-8 rounded-lg font-medium transition-all"
                      style={{
                        background: p === page ? "#0D9488" : "#F8FAFC",
                        color: p === page ? "white" : "#6B7280",
                        border: `0.5px solid ${p === page ? "#0D9488" : "#E2E8F0"}`,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-40"
                  style={{ borderColor: "#E2E8F0", color: "#6B7280" }}
                >
                  Next <MdArrowForward style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {scanned && (allGroups?.length ?? 0) === 0 && !loading && (
        <div className="card p-16 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-base font-bold text-gray-700 mb-2">
            No duplicates found!
          </p>
          <p className="text-sm text-gray-400">
            Question bank is clean at {threshold}% similarity threshold
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
            Compares cleaned question text using Postgres trigram index
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  MdCheckCircle,
  MdCancel,
  MdHelp,
  MdPlayArrow,
  MdPause,
  MdRefresh,
  MdCode,
  MdAutoFixHigh,
} from "react-icons/md";
import StatCard from "./StatCard";
import QuestionCard from "./QuestionCard";

export default function ValidatePage() {
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [nextStartId, setNextStartId] = useState(1);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [flaggedFilter, setFlaggedFilter] = useState("fail");
  const [flaggedPage, setFlaggedPage] = useState(1);
  const [flaggedTotal, setFlaggedTotal] = useState(0);
  const [loadingFlagged, setLoadingFlagged] = useState(false);
  const [allExams, setAllExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [log, setLog] = useState([]);

  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const [confirmId, setConfirmId] = useState(null); // inline confirm instead of browser confirm()

  useEffect(() => {
    fetchStats();
    fetchExams();
  }, []);
  useEffect(() => {
    fetchFlagged();
  }, [flaggedFilter, flaggedPage, selectedExamId]);

  async function fetchExams() {
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();
      if (data.success) setAllExams(data.data || []);
    } catch {}
  }

  async function fetchStats() {
    try {
      const params = new URLSearchParams();
      if (selectedExamId) params.set("examId", selectedExamId);
      const res = await fetch(`/api/questions/validate?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        // Only reset nextStartId from DB when not running AND not paused
        if (!runningRef.current && !pausedRef.current)
          setNextStartId(data.data.nextStartId || 1);
      }
    } catch {}
  }

  async function fetchFlagged() {
    setLoadingFlagged(true);
    try {
      const params = new URLSearchParams({
        status: flaggedFilter,
        page: flaggedPage,
      });
      if (selectedExamId) params.set("examId", selectedExamId);
      const res = await fetch(
        `/api/questions/validate/flagged?${params.toString()}`,
      );
      const data = await res.json();
      if (data.success) {
        setFlaggedQuestions(data.data.questions);
        setFlaggedTotal(data.data.total);
      }
    } catch {
    } finally {
      setLoadingFlagged(false);
    }
  }

  function addLog(msg, type = "info") {
    setLog((prev) => [
      { msg, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 99),
    ]);
  }

  async function startValidation() {
    if (runningRef.current) return;
    runningRef.current = true;
    pausedRef.current = false;
    setRunning(true);
    setPaused(false);

    let currentStartId = nextStartId;
    let totalProcessed = 0;
    addLog(`Starting from question #${currentStartId}`, "info");

    while (runningRef.current && !pausedRef.current) {
      try {
        const res = await fetch(`/api/questions/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchSize,
            startFromId: currentStartId,
            examId: selectedExamId ? parseInt(selectedExamId) : null,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          addLog(`Error: ${data.error}`, "error");
          break;
        }

        const { processed, results, nextStartId: nextId, done } = data.data;
        totalProcessed += processed;

        results.forEach((r) => {
          if (r.status === "fail" && r.hasLatexIssues)
            addLog(
              `#${r.id} FAIL + LaTeX - ${r.chapter}: ${r.summary || ""}`,
              "fail",
            );
          else if (r.status === "fail")
            addLog(
              `#${r.id} FAIL - ${r.chapter}: ${r.summary || "Issue found"}`,
              "fail",
            );
          else if (r.status === "uncertain" && r.hasLatexIssues)
            addLog(`#${r.id} UNCERTAIN + LaTeX - ${r.chapter}`, "uncertain");
          else if (r.status === "uncertain")
            addLog(`#${r.id} UNCERTAIN - ${r.chapter || ""}`, "uncertain");
          else if (r.hasLatexIssues)
            addLog(`#${r.id} LaTeX - ${r.latexIssues[0]}`, "latex");
        });

        const passCount = results.filter((r) => r.status === "pass").length;
        const failCount = results.filter((r) => r.status === "fail").length;
        const latexCount = results.filter((r) => r.hasLatexIssues).length;
        addLog(
          `Batch: ${processed} - ${passCount} pass, ${failCount} fail, ${latexCount} latex. Total: ${totalProcessed}`,
          "info",
        );

        await fetchStats();
        await fetchFlagged(); // auto-refresh flagged list after each batch
        if (done || !nextId) {
          addLog("All questions validated!", "success");
          break;
        }
        currentStartId = nextId;
        setNextStartId(nextId);
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        addLog(`Batch error: ${err.message}`, "error");
        break;
      }
    }

    runningRef.current = false;
    setRunning(false);
    if (pausedRef.current) addLog("Validation paused.", "info");
    fetchStats();
    fetchFlagged();
  }

  function pauseValidation() {
    pausedRef.current = true;
    setPaused(true);
    addLog("Pausing after current batch...", "info");
  }

  // Remove a single question from list without refetching everything
  function removeFromList(questionId) {
    setFlaggedQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setFlaggedTotal((prev) => Math.max(0, prev - 1));
    setStats((prev) =>
      prev ? { ...prev, fail: Math.max(0, prev.fail - 1) } : prev,
    );
  }

  async function patchQuestion(questionId, action, extra = {}) {
    const res = await fetch("/api/questions/validate/flagged", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action, ...extra }),
    });
    return res.json();
  }

  async function handleApprove(questionId) {
    try {
      const data = await patchQuestion(questionId, "approve");
      if (data.success) {
        toast.success("Marked as approved");
        removeFromList(questionId);
      } else toast.error(data.error || "Failed");
    } catch {
      toast.error("Failed");
    }
  }

  async function handleDeactivate(questionId) {
    // Use inline confirm - browser confirm() can cause page reload in some setups
    setConfirmId(questionId);
  }

  async function confirmDeactivate(questionId) {
    setConfirmId(null);
    try {
      const data = await patchQuestion(questionId, "deactivate");
      if (data.success) {
        toast.success("Question deactivated");
        removeFromList(questionId);
      } else toast.error(data.error || "Failed");
    } catch {
      toast.error("Failed");
    }
  }

  async function handleReset(questionId) {
    try {
      const data = await patchQuestion(questionId, "reset");
      if (data.success) {
        toast.success("Reset for re-check");
        removeFromList(questionId);
      } else toast.error(data.error || "Failed");
    } catch {
      toast.error("Failed");
    }
  }

  async function handleFix(questionId, fix) {
    // Always use fixAll - applies both AI content fix AND autoFixLatex together
    try {
      const data = await patchQuestion(questionId, "fixAll", {
        fix: fix || null,
      });
      if (data.success) {
        toast.success("All fixes applied!");
        removeFromList(questionId);
      } else toast.error(data.error || "Fix failed");
    } catch {
      toast.error("Failed to apply fix");
    }
  }

  async function handleFixLatex(questionId) {
    // Even LaTeX-only fix goes through fixAll to ensure both are applied
    try {
      const data = await patchQuestion(questionId, "fixAll", { fix: null });
      if (data.success) {
        toast.success("LaTeX fixed!");
        removeFromList(questionId);
      } else toast.error(data.error || "Fix failed");
    } catch {
      toast.error("Failed to fix LaTeX");
    }
  }

  const [bulkFixing, setBulkFixing] = useState(false);

  async function handleFixAllFlagged() {
    setBulkFixing(true);
    let totalAi = 0;
    let totalLatex = 0;
    let totalFailed = 0;
    try {
      // Process in chunks of 100 (server caps each call) until none remain
      for (let i = 0; i < 200; i++) {
        const res = await fetch("/api/questions/validate/flagged", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "fixAllFlagged",
            status: flaggedFilter,
            examId: selectedExamId ? parseInt(selectedExamId) : null,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.error || "Bulk fix failed");
          break;
        }
        const { appliedAiFix, latexOnly, failed, scanned } = data.data;
        totalAi += appliedAiFix;
        totalLatex += latexOnly;
        totalFailed += failed;
        // Stop when a chunk returns nothing left to process
        if (scanned === 0) break;
        await fetchStats();
      }
      toast.success(
        `Done: ${totalAi} AI fixes + ${totalLatex} LaTeX-only applied` +
          (totalFailed > 0 ? `, ${totalFailed} failed` : ""),
      );
      fetchStats();
      fetchFlagged();
    } catch {
      toast.error("Bulk fix failed");
    } finally {
      setBulkFixing(false);
    }
  }

  const progress = stats
    ? Math.round((stats.validated / Math.max(stats.total, 1)) * 100)
    : 0;

  return (
    <div className="p-6  mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">
          AI Question Validator
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Checks every question for factual correctness + LaTeX issues. AI
          suggests fixes for flagged questions.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Exam</label>
            <select
              className="input-field py-1.5 text-sm"
              style={{ width: 180 }}
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                fetchStats();
              }}
            >
              <option value="">All Exams</option>
              {allExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Batch Size
            </label>
            <select
              className="input-field py-1.5 text-sm"
              style={{ width: 90 }}
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              disabled={running}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {!running && !paused && (
              <button
                onClick={startValidation}
                disabled={stats?.done}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm"
                style={{ background: stats?.done ? "#9CA3AF" : "#0D9488" }}
              >
                <MdPlayArrow style={{ fontSize: 18 }} />
                {stats?.done ? "All Validated" : "Start Validation"}
              </button>
            )}
            {running && !paused && (
              <button
                onClick={pauseValidation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: "#FEF3C7",
                  color: "#92400E",
                  border: "0.5px solid #FCD34D",
                }}
              >
                <MdPause style={{ fontSize: 18 }} /> Pause
              </button>
            )}
            {paused && (
              <button
                onClick={startValidation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm"
                style={{ background: "#0D9488" }}
              >
                <MdPlayArrow style={{ fontSize: 18 }} /> Resume
              </button>
            )}
            <button
              onClick={fetchStats}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "#F8FAFC",
                color: "#64748B",
                border: "0.5px solid #E2E8F0",
              }}
            >
              <MdRefresh style={{ fontSize: 16 }} /> Refresh
            </button>
            <button
              onClick={handleFixAllFlagged}
              disabled={bulkFixing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#0D9488" }}
            >
              <MdAutoFixHigh style={{ fontSize: 16 }} />
              {bulkFixing ? "Applying all fixes..." : "Apply All Fixes"}
            </button>
          </div>
        </div>

        {stats && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-600">
                {running && (
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse mr-1.5" />
                )}
                {stats.validated.toLocaleString()} /{" "}
                {stats.total.toLocaleString()} validated
              </p>
              <p className="text-xs font-bold text-gray-700">{progress}%</p>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #0D9488, #06B6D4)",
                }}
              />
            </div>
            {running && (
              <p className="text-[11px] text-gray-400 mt-1">
                Next: #{nextStartId} - {batchSize} per batch
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            label="Pass"
            value={stats.pass}
            total={stats.validated}
            color="#15803D"
            icon={<MdCheckCircle style={{ fontSize: 20 }} />}
          />
          <StatCard
            label="Fail"
            value={stats.fail}
            total={stats.validated}
            color="#DC2626"
            icon={<MdCancel style={{ fontSize: 20 }} />}
          />
          <StatCard
            label="Uncertain"
            value={stats.uncertain}
            total={stats.validated}
            color="#D97706"
            icon={<MdHelp style={{ fontSize: 20 }} />}
          />
          <StatCard
            label="LaTeX Issues"
            value={stats.latexCount || 0}
            total={stats.validated}
            color="#1D4ED8"
            icon={<MdCode style={{ fontSize: 20 }} />}
            sub="questions with LaTeX errors"
          />
          <StatCard
            label="Not Checked"
            value={stats.notValidated}
            total={stats.total}
            color="#6B7280"
            icon={<MdRefresh style={{ fontSize: 20 }} />}
            sub="pending validation"
          />
        </div>
      )}

      {/* Live log */}
      {log.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">Live Log</p>
            <button
              onClick={() => setLog([])}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          <div className="p-3 space-y-0.5 max-h-44 overflow-y-auto font-mono">
            {log.map((entry, i) => (
              <p
                key={i}
                className="text-[11px]"
                style={{
                  color:
                    entry.type === "fail"
                      ? "#DC2626"
                      : entry.type === "uncertain"
                        ? "#D97706"
                        : entry.type === "latex"
                          ? "#1D4ED8"
                          : entry.type === "success"
                            ? "#15803D"
                            : entry.type === "error"
                              ? "#DC2626"
                              : "#6B7280",
                }}
              >
                <span className="text-gray-300 mr-2">{entry.time}</span>
                {entry.msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Inline deactivate confirm - no browser confirm() */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-900 mb-1">
              Deactivate Question?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              This question will be hidden from all students. You can reactivate
              it from the questions list.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeactivate(confirmId)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-white"
                style={{ background: "#DC2626" }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flagged questions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Flagged Questions
            </h2>
            <p className="text-xs text-gray-500">
              {flaggedTotal} questions need review
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[
              { key: "fail", label: "Failed" },
              { key: "uncertain", label: "Uncertain" },
              { key: "latex", label: "LaTeX" },
              { key: "all", label: "All Issues" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFlaggedFilter(f.key);
                  setFlaggedPage(1);
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: flaggedFilter === f.key ? "#0D9488" : "#F8FAFC",
                  color: flaggedFilter === f.key ? "white" : "#6B7280",
                  border: `0.5px solid ${flaggedFilter === f.key ? "#0D9488" : "#E2E8F0"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loadingFlagged ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
              style={{ borderTopColor: "#0D9488" }}
            />
          </div>
        ) : flaggedQuestions.length === 0 ? (
          <div className="card p-8 text-center">
            <MdCheckCircle
              style={{ fontSize: 40, color: "#15803D", margin: "0 auto 8px" }}
            />
            <p className="text-sm font-semibold text-gray-700">
              No flagged questions
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats?.validated === 0
                ? "Start validation to check your questions"
                : "All validated questions passed or have been reviewed"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                onApprove={handleApprove}
                onDeactivate={handleDeactivate}
                onReset={handleReset}
                onFix={handleFix}
                onFixLatex={handleFixLatex}
              />
            ))}
            {flaggedTotal > 20 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">
                  Page {flaggedPage} of {Math.ceil(flaggedTotal / 20)}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={flaggedPage === 1}
                    onClick={() => setFlaggedPage((p) => p - 1)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-40"
                    style={{ borderColor: "#E2E8F0", color: "#6B7280" }}
                  >
                    Prev
                  </button>
                  <button
                    disabled={flaggedPage >= Math.ceil(flaggedTotal / 20)}
                    onClick={() => setFlaggedPage((p) => p + 1)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-40"
                    style={{ borderColor: "#E2E8F0", color: "#6B7280" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { MdAutoFixHigh } from "react-icons/md";

import ClassificationFields from "./question/ClassificationFields";
import MathEditor from "./question/MathEditor";
import OptionsEditor, { getEmptyOptions } from "./question/OptionsEditor";
import SolutionFields from "./question/SolutionFields";
import FileUpload from "./question/FileUpload";
import TagInput from "./question/TagInput";
import OcrUpload from "./question/ocrUpload";

export default function QuestionForm({
  question,
  exams,
  subjects,
  chapters,
  topics,
}) {
  const router = useRouter();
  const isEdit = !!question;

  const [form, setForm] = useState({
    questionText: question?.questionText || "",
    questionImageUrl: question?.questionImageUrl || "",
    questionType: question?.questionType || "MCQ",
    difficulty: question?.difficulty || "MEDIUM",
    examId: question?.examId || "",
    subjectId: question?.subjectId || "",
    chapterId: question?.chapterId || "",
    topicId: question?.topicId || "",
    solutionText: question?.solutionText || "",
    solutionImageUrl: question?.solutionImageUrl || "",
    solutionAudioUrl: question?.solutionAudioUrl || "",
    solutionVideoUrl: question?.solutionVideoUrl || "",
    integerAnswer: question?.integerAnswer || "",
    isActive: question?.isActive !== false,
    tags: question?.tags || [],
  });

  const [options, setOptions] = useState(
    question?.options || getEmptyOptions(),
  );
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false); // true after AI has run once
  const [duplicate, setDuplicate] = useState(null);
  const [showDupWarning, setShowDupWarning] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const [filterExam, setFilterExam] = useState(String(question?.examId || ""));
  const [filterSub, setFilterSub] = useState(String(question?.subjectId || ""));
  const [filterCh, setFilterCh] = useState(String(question?.chapterId || ""));

  function resetFormForNext() {
    setAiGenerated(false);
    setForm({
      questionText: "",
      questionImageUrl: "",
      questionType: "MCQ",
      difficulty: "MEDIUM",
      examId: form.examId,
      subjectId: form.subjectId,
      chapterId: form.chapterId,
      topicId: form.topicId,
      solutionText: "",
      solutionImageUrl: "",
      solutionAudioUrl: "",
      solutionVideoUrl: "",
      integerAnswer: "",
      isActive: true,
      tags: [],
    });
    setOptions(getEmptyOptions());
    setDuplicate(null);
    setShowDupWarning(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Called when teacher picks a question from OCR modal
  function handleOcrApply(extracted) {
    if (extracted.questionText) {
      const solutionText = (extracted.solutionText || "").replace(/\\n/g, "\n");
      setForm((f) => ({
        ...f,
        questionText: extracted.questionText,
        questionType: extracted.questionType || f.questionType,
        difficulty: extracted.difficulty || f.difficulty,
        solutionText,
        integerAnswer:
          extracted.questionType === "INTEGER"
            ? extracted.correctAnswer || ""
            : f.integerAnswer,
      }));
    }
    if (extracted.options?.length > 0) {
      setOptions(
        extracted.options.map((o, i) => ({
          id: i + 1,
          label: o.label || ["A", "B", "C", "D"][i],
          optionText: o.optionText || "",
          isCorrect: o.isCorrect || false,
          orderIndex: i,
        })),
      );
    }
  }

  // AI Assist - smart mode detection
  // If options are empty → generate everything
  // If options are filled → just convert to LaTeX
  async function handleAiAssist() {
    if (!form.questionText.trim()) {
      toast.error("Type a question first");
      return;
    }

    const hasOptions = options.some((o) => o.optionText.trim());
    const mode = hasOptions ? "convert" : "generate";

    // Get subject/chapter names for context
    const examName =
      exams.find((e) => e.id === parseInt(form.examId))?.name || "";
    const subjectName =
      subjects.find((s) => s.id === parseInt(form.subjectId))?.name || "";
    const chapterName =
      chapters.find((c) => c.id === parseInt(form.chapterId))?.name || "";

    setAiLoading(true);
    try {
      const res = await fetch("/api/questions/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: form.questionText,
          exam: examName,
          subject: subjectName,
          chapter: chapterName,
          hasOptions,
          existingOptions: hasOptions ? options : [],
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "AI generation failed");
        return;
      }

      const result = data.data;

      // Apply AI result to form
      setForm((f) => ({
        ...f,
        questionText: result.questionText || f.questionText,
        solutionText: result.solutionText
          ? result.solutionText.replace(/\\n/g, "\n")
          : f.solutionText,
        difficulty: result.difficulty || f.difficulty,
      }));

      if (result.options?.length > 0) {
        setOptions(
          result.options.map((o, i) => ({
            id: i + 1,
            label: o.label || ["A", "B", "C", "D"][i],
            optionText: o.optionText || "",
            isCorrect: o.isCorrect || false,
            orderIndex: i,
          })),
        );
      }

      if (mode === "generate") {
        toast.success("Question, options and solution generated!");
      } else {
        toast.success("Converted to LaTeX!");
      }
    } catch (err) {
      toast.error("AI failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(skipDuplicateCheck = false) {
    if (!form.questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (!form.examId || !form.subjectId || !form.chapterId) {
      toast.error("Please select Exam, Subject and Chapter");
      return;
    }
    if (form.questionType === "MCQ" || form.questionType === "MULTI_CORRECT") {
      if (!options.some((o) => o.isCorrect)) {
        toast.error("Please mark at least one correct answer");
        return;
      }
      if (!options.every((o) => o.optionText.trim())) {
        toast.error("Please fill all 4 options");
        return;
      }
    }
    if (form.questionType === "INTEGER" && !form.integerAnswer) {
      toast.error("Please enter the correct integer answer");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/questions/${question.id}` : "/api/questions";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          examId: parseInt(form.examId),
          subjectId: parseInt(form.subjectId),
          chapterId: parseInt(form.chapterId),
          topicId: form.topicId ? parseInt(form.topicId) : null,
          tags: form.tags || [],
          options: form.questionType !== "INTEGER" ? options : [],
          skipDuplicateCheck,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.duplicate) {
          setDuplicate(data.existing);
          setShowDupWarning(true);
          return;
        }
      }

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      if (isEdit) {
        toast.success("Question updated!");
        router.push("/admin/questions");
        return;
      }
      setSavedCount((c) => c + 1);
      toast.success("Question saved! Fill the next one.");
      resetFormForNext();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Smart label:
  // - Not yet run → "AI Generate"
  // - Already generated + options filled → "Convert to LaTeX"
  // - Question cleared → back to "AI Generate"
  const hasOptions = options.some((o) => o.optionText.trim());
  const aiButtonLabel = aiLoading
    ? "Generating..."
    : aiGenerated && hasOptions && form.questionText.trim()
      ? "✨ Convert to LaTeX"
      : "✨ AI Generate";

  return (
    <div className="max-w-4xl space-y-5">
      {/* OCR banner - new question only */}
      {!isEdit && (
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE" }}
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Have questions on paper or in a textbook?
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Upload one photo - AI extracts all questions. Go through them one
              by one, fill form and save each.
            </p>
          </div>
          <OcrUpload onApply={handleOcrApply} />
        </div>
      )}

      {/* Duplicate warning */}
      {showDupWarning && duplicate && (
        <div
          className="p-4 rounded-xl"
          style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}
        >
          <p className="text-sm font-semibold text-yellow-800 mb-1">
            ⚠️ Similar question already exists
          </p>
          <p className="text-xs text-yellow-700 mb-3">
            A question with the same text was found in {duplicate.subject?.name}{" "}
            → {duplicate.chapter?.name}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/questions/${duplicate.id}`}
              target="_blank"
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                border: "1px solid #FCD34D",
              }}
            >
              View Existing Question
            </Link>
            <button
              onClick={() => {
                setShowDupWarning(false);
                handleSubmit(true);
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "#0D9488", color: "white" }}
            >
              Save Anyway
            </button>
            <button
              onClick={() => setShowDupWarning(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ClassificationFields
        exams={exams}
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        form={form}
        setForm={setForm}
        filterExam={filterExam}
        setFilterExam={setFilterExam}
        filterSub={filterSub}
        setFilterSub={setFilterSub}
        filterCh={filterCh}
        setFilterCh={setFilterCh}
      />

      {/* Question card with AI Assist button */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Question</h2>
          {/* AI Assist button */}
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading || !form.questionText.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: aiLoading ? "#F5F3FF" : "#EDE9FE",
              color: "#6D28D9",
              border: "0.5px solid #C4B5FD",
            }}
          >
            {aiLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <MdAutoFixHigh style={{ fontSize: 16 }} />
                {aiButtonLabel}
              </>
            )}
          </button>
        </div>

        {/* Helper text explaining AI button */}
        {!isEdit && (
          <p className="text-xs text-gray-400 mb-3 -mt-2">
            {aiGenerated && hasOptions && form.questionText.trim()
              ? "AI already generated — click again to re-convert to LaTeX"
              : "Type question in plain text, click AI Generate to create options and solution automatically"}
          </p>
        )}

        <div className="space-y-4">
          <MathEditor
            label="Question Text *"
            hint="(use virtual keyboard or type shortcuts like x^2)"
            value={form.questionText}
            onChange={(val) => setForm((f) => ({ ...f, questionText: val }))}
            placeholder="Type in plain text, e.g: find the work done when force 10N moves body 5m at 60 degrees..."
            rows={3}
          />
          <FileUpload
            type="image"
            label="Question Image (optional)"
            value={form.questionImageUrl}
            onChange={(val) =>
              setForm((f) => ({ ...f, questionImageUrl: val }))
            }
          />
        </div>
      </div>

      {(form.questionType === "MCQ" ||
        form.questionType === "MULTI_CORRECT") && (
        <OptionsEditor
          questionType={form.questionType}
          options={options}
          setOptions={setOptions}
        />
      )}

      {form.questionType === "INTEGER" && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Integer Answer</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correct Integer Answer *
          </label>
          <input
            type="number"
            className="input-field w-48"
            placeholder="e.g. 42"
            value={form.integerAnswer}
            onChange={(e) =>
              setForm((f) => ({ ...f, integerAnswer: e.target.value }))
            }
          />
        </div>
      )}

      <SolutionFields form={form} setForm={setForm} />

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Tags</h2>
        <p className="text-xs text-gray-400 mb-3">
          Tag by exam year — e.g. JEE Main 2024, NEET 2023
        </p>
        <TagInput
          tags={form.tags}
          onChange={(tags) => setForm((f) => ({ ...f, tags }))}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="w-4 h-4 rounded"
              style={{ accentColor: "#0D9488" }}
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">
                Students can see this question in tests
              </p>
            </div>
          </label>
          <div className="flex items-center gap-3">
            {savedCount > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#DCFCE7", color: "#15803D" }}
              >
                {savedCount} saved
              </span>
            )}
            <button
              type="button"
              onClick={() => router.push("/admin/questions")}
              className="btn-secondary"
            >
              {savedCount > 0 ? "Done" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Update Question"
                  : "Save & Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

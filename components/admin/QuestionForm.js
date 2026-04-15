"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import ClassificationFields from "./question/ClassificationFields";
import MathEditor from "./question/MathEditor";
import OptionsEditor, { getEmptyOptions } from "./question/OptionsEditor";
import SolutionFields from "./question/SolutionFields";
import FileUpload from "./question/FileUpload";

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
  });

  const [options, setOptions] = useState(
    question?.options || getEmptyOptions(),
  );
  const [loading, setLoading] = useState(false);

  const [filterExam, setFilterExam] = useState(String(question?.examId || ""));
  const [filterSub, setFilterSub] = useState(String(question?.subjectId || ""));
  const [filterCh, setFilterCh] = useState(String(question?.chapterId || ""));

  async function handleSubmit() {
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
          options: form.questionType !== "INTEGER" ? options : [],
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success(isEdit ? "Question updated!" : "Question created!");
      router.push("/admin/questions");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
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

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Question</h2>
        <div className="space-y-4">
          <MathEditor
            label="Question Text *"
            hint="(use virtual keyboard or type shortcuts like x^2)"
            value={form.questionText}
            onChange={(val) => setForm((f) => ({ ...f, questionText: val }))}
            placeholder="Type question here..."
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
            <button
              type="button"
              onClick={() => router.push("/admin/questions")}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Update Question"
                  : "Save Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

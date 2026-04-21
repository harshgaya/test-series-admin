// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import toast from "react-hot-toast";

// import StepIndicator from "@/components/admin/test/StepIndicator";
// import StepTestType from "@/components/admin/test/StepTestType";
// import StepBasicDetails from "@/components/admin/test/StepBasicDetails";
// import StepAddQuestions from "@/components/admin/test/StepAddQuestions";
// import StepSettings from "@/components/admin/test/StepSettings";
// import StepReview from "@/components/admin/test/StepReview";

// import {
//   DEFAULT_MARKS_CORRECT,
//   DEFAULT_NEGATIVE_MARKS,
//   DEFAULT_DURATION_MINS,
// } from "@/lib/constants";

// export default function CreateTestClient({
//   exams,
//   subjects,
//   chapters,
//   topics,
// }) {
//   const router = useRouter();
//   const [step, setStep] = useState(0);
//   const [loading, setLoading] = useState(false);

//   const [testType, setTestType] = useState("");

//   const [details, setDetails] = useState({
//     title: "",
//     description: "",
//     examId: "",
//     subjectId: "",
//     chapterId: "",
//     topicId: "",
//     durationMins: DEFAULT_DURATION_MINS,
//     marksCorrect: DEFAULT_MARKS_CORRECT,
//     negativeMarking: DEFAULT_NEGATIVE_MARKS,
//     attemptLimit: 0,
//     price: 0,
//     scheduledAt: "",
//   });

//   // Full question objects — not just IDs
//   const [selectedQuestions, setSelectedQuestions] = useState([]);

//   const [settings, setSettings] = useState({
//     showSolutions: true,
//     showAnswers: true,
//     showRank: true,
//     showLeaderboard: true,
//     status: "DRAFT",
//   });

//   async function handleCreate(publishNow = false) {
//     setLoading(true);
//     try {
//       const res = await fetch("/api/tests", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...details,
//           testType,
//           examId: parseInt(details.examId),
//           subjectId: details.subjectId ? parseInt(details.subjectId) : null,
//           chapterId: details.chapterId ? parseInt(details.chapterId) : null,
//           topicId: details.topicId ? parseInt(details.topicId) : null,
//           ...settings,
//           status: publishNow ? "PUBLISHED" : settings.status,
//           questionIds: selectedQuestions.map((q) => q.id),
//         }),
//       });
//       const data = await res.json();
//       if (!data.success) {
//         toast.error(data.error);
//         return;
//       }
//       toast.success("Test created successfully!");
//       router.push("/admin/tests");
//     } catch {
//       toast.error("Something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="max-w-7xl">
//       <StepIndicator step={step} />

//       {step === 0 && (
//         <StepTestType
//           testType={testType}
//           setTestType={setTestType}
//           onNext={() => setStep(1)}
//         />
//       )}

//       {step === 1 && (
//         <StepBasicDetails
//           details={details}
//           setDetails={setDetails}
//           testType={testType}
//           exams={exams}
//           subjects={subjects}
//           chapters={chapters}
//           topics={topics}
//           onNext={() => setStep(2)}
//           onBack={() => setStep(0)}
//         />
//       )}

//       {step === 2 && (
//         <StepAddQuestions
//           details={details}
//           marksCorrect={details.marksCorrect}
//           subjects={subjects}
//           chapters={chapters}
//           selectedQuestions={selectedQuestions}
//           setSelectedQuestions={setSelectedQuestions}
//           onNext={() => setStep(3)}
//           onBack={() => setStep(1)}
//         />
//       )}

//       {step === 3 && (
//         <StepSettings
//           settings={settings}
//           setSettings={setSettings}
//           onNext={() => setStep(4)}
//           onBack={() => setStep(2)}
//         />
//       )}

//       {step === 4 && (
//         <StepReview
//           testType={testType}
//           details={details}
//           selectedQIds={selectedQuestions.map((q) => q.id)}
//           selectedQuestions={selectedQuestions}
//           settings={settings}
//           onBack={() => setStep(3)}
//           onCreate={handleCreate}
//           loading={loading}
//         />
//       )}
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import StepIndicator from "@/components/admin/test/StepIndicator";
import StepTestType from "@/components/admin/test/StepTestType";
import StepBasicDetails from "@/components/admin/test/StepBasicDetails";
import StepAddQuestions from "@/components/admin/test/StepAddQuestions";
import StepSettings from "@/components/admin/test/StepSettings";
import StepReview from "@/components/admin/test/StepReview";

import {
  DEFAULT_MARKS_CORRECT,
  DEFAULT_NEGATIVE_MARKS,
  DEFAULT_DURATION_MINS,
} from "@/lib/constants";

export default function CreateTestClient({
  exams,
  subjects,
  chapters,
  topics,
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState("");

  const [details, setDetails] = useState({
    title: "",
    description: "",
    examId: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    durationMins: DEFAULT_DURATION_MINS,
    marksCorrect: DEFAULT_MARKS_CORRECT,
    negativeMarking: DEFAULT_NEGATIVE_MARKS,
    attemptLimit: 0,
    price: 0,
    // ❌ removed scheduledAt from here
  });

  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const [settings, setSettings] = useState({
    showSolutions: true,
    showAnswers: true,
    showRank: true,
    showLeaderboard: true,
    status: "DRAFT",
    scheduledAt: "", // ✅ lives here
    endedAt: "", // ✅ lives here
  });

  async function handleCreate(publishNow = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          testType,
          examId: parseInt(details.examId),
          subjectId: details.subjectId ? parseInt(details.subjectId) : null,
          chapterId: details.chapterId ? parseInt(details.chapterId) : null,
          topicId: details.topicId ? parseInt(details.topicId) : null,
          ...settings, // spreads scheduledAt and endedAt correctly
          status: publishNow ? "PUBLISHED" : settings.status,
          questionIds: selectedQuestions.map((q) => q.id),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Test created successfully!");
      router.push("/admin/tests");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl">
      <StepIndicator step={step} />

      {step === 0 && (
        <StepTestType
          testType={testType}
          setTestType={setTestType}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepBasicDetails
          details={details}
          setDetails={setDetails}
          testType={testType}
          exams={exams}
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepAddQuestions
          details={details}
          marksCorrect={details.marksCorrect}
          subjects={subjects}
          chapters={chapters}
          selectedQuestions={selectedQuestions}
          setSelectedQuestions={setSelectedQuestions}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepSettings
          settings={settings}
          setSettings={setSettings}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <StepReview
          testType={testType}
          details={details}
          selectedQIds={selectedQuestions.map((q) => q.id)}
          selectedQuestions={selectedQuestions}
          settings={settings}
          onBack={() => setStep(3)}
          onCreate={handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}

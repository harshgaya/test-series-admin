"use client";

import toast from "react-hot-toast";
import { TEST_TYPES } from "@/lib/constants";

export default function StepTestType({ testType, setTestType, onNext }) {
  function handleNext() {
    if (!testType) {
      toast.error("Please select a test type");
      return;
    }
    onNext();
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Select Test Type</h2>
      <p className="text-sm text-gray-500 mb-5">
        What kind of test do you want to create?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TEST_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTestType(t.value)}
            className="p-3 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: testType === t.value ? "#0D9488" : "#E5E7EB",
              background: testType === t.value ? "#F0FDFA" : "white",
              color: testType === t.value ? "#0F766E" : "#374151",
            }}
          >
            <p className="font-medium text-sm">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleNext} className="btn-primary">
          Next →
        </button>
      </div>
    </div>
  );
}

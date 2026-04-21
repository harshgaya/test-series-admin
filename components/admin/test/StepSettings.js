// "use client";

// export default function StepSettings({
//   settings,
//   setSettings,
//   onNext,
//   onBack,
// }) {
//   const OPTIONS = [
//     {
//       key: "showSolutions",
//       label: "Show Solutions after test",
//       hint: "Students can see detailed solution for each question",
//     },
//     {
//       key: "showAnswers",
//       label: "Show Correct Answers after test",
//       hint: "Students can see which option was correct",
//     },
//     {
//       key: "showRank",
//       label: "Show Rank to students",
//       hint: "Students can see their rank among all attempts",
//     },
//     {
//       key: "showLeaderboard",
//       label: "Show Leaderboard",
//       hint: "Students can see top scorers leaderboard",
//     },
//   ];

//   const VISIBILITY = [
//     {
//       value: "PUBLISHED",
//       label: "Published",
//       hint: "Visible to all students in test listing",
//       color: "#16A34A",
//       bg: "#F0FDF4",
//       border: "#BBF7D0",
//     },
//     {
//       value: "CRASH_ONLY",
//       label: "Crash Course Only",
//       hint: "Only visible inside a crash course — not in public test list",
//       color: "#7C3AED",
//       bg: "#F5F3FF",
//       border: "#DDD6FE",
//     },
//     {
//       value: "DRAFT",
//       label: "Draft",
//       hint: "Not visible to students anywhere",
//       color: "#6B7280",
//       bg: "#F9FAFB",
//       border: "#E5E7EB",
//     },
//   ];

//   return (
//     <div className="space-y-4">
//       {/* Visibility */}
//       <div className="card p-6">
//         <h2 className="font-semibold text-gray-900 mb-1">Test Visibility</h2>
//         <p className="text-sm text-gray-500 mb-4">
//           Who can see and attempt this test?
//         </p>

//         <div className="space-y-2">
//           {VISIBILITY.map((v) => (
//             <label
//               key={v.value}
//               className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all"
//               style={{
//                 borderColor: settings.status === v.value ? v.color : "#E5E7EB",
//                 background: settings.status === v.value ? v.bg : "white",
//               }}
//             >
//               <input
//                 type="radio"
//                 name="visibility"
//                 value={v.value}
//                 checked={settings.status === v.value}
//                 onChange={() => setSettings((s) => ({ ...s, status: v.value }))}
//                 className="mt-0.5 flex-shrink-0"
//                 style={{ accentColor: v.color }}
//               />
//               <div>
//                 <p
//                   className="text-sm font-medium"
//                   style={{
//                     color: settings.status === v.value ? v.color : "#374151",
//                   }}
//                 >
//                   {v.label}
//                 </p>
//                 <p className="text-xs text-gray-400 mt-0.5">{v.hint}</p>
//               </div>
//             </label>
//           ))}
//         </div>
//       </div>

//       {/* After test settings */}
//       <div className="card p-6">
//         <h2 className="font-semibold text-gray-900 mb-1">
//           After Test Settings
//         </h2>
//         <p className="text-sm text-gray-500 mb-4">
//           Control what students see after completing the test
//         </p>

//         <div className="space-y-3">
//           {OPTIONS.map(({ key, label, hint }) => (
//             <label
//               key={key}
//               className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors"
//             >
//               <input
//                 type="checkbox"
//                 checked={settings[key]}
//                 onChange={(e) =>
//                   setSettings((s) => ({ ...s, [key]: e.target.checked }))
//                 }
//                 className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
//                 style={{ accentColor: "#0D9488" }}
//               />
//               <div>
//                 <p className="text-sm font-medium text-gray-700">{label}</p>
//                 <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
//               </div>
//             </label>
//           ))}
//         </div>
//       </div>

//       <div className="flex justify-between">
//         <button onClick={onBack} className="btn-secondary">
//           ← Back
//         </button>
//         <button onClick={onNext} className="btn-primary">
//           Next →
//         </button>
//       </div>
//     </div>
//   );
// }
"use client";

export default function StepSettings({
  settings,
  setSettings,
  onNext,
  onBack,
}) {
  const OPTIONS = [
    {
      key: "showSolutions",
      label: "Show Solutions after test",
      hint: "Students can see detailed solution for each question",
    },
    {
      key: "showAnswers",
      label: "Show Correct Answers after test",
      hint: "Students can see which option was correct",
    },
    {
      key: "showRank",
      label: "Show Rank to students",
      hint: "Students can see their rank among all attempts",
    },
    {
      key: "showLeaderboard",
      label: "Show Leaderboard",
      hint: "Students can see top scorers leaderboard",
    },
  ];

  const VISIBILITY = [
    {
      value: "PUBLISHED",
      label: "Published",
      hint: "Visible to all students in test listing",
      color: "#16A34A",
      bg: "#F0FDF4",
      border: "#BBF7D0",
    },
    {
      value: "CRASH_ONLY",
      label: "Crash Course Only",
      hint: "Only visible inside a crash course — not in public test list",
      color: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    },
    {
      value: "DRAFT",
      label: "Draft",
      hint: "Not visible to students anywhere",
      color: "#6B7280",
      bg: "#F9FAFB",
      border: "#E5E7EB",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Schedule */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Schedule</h2>
        <p className="text-sm text-gray-500 mb-4">
          Set when this test is available. Leave blank to make it always
          available.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Available From
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                (start date & time)
              </span>
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={settings.scheduledAt || ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, scheduledAt: e.target.value }))
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              Students cannot attempt before this time
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Available Until
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                (end date & time)
              </span>
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={settings.endedAt || ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, endedAt: e.target.value }))
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              Test auto-closes after this time
            </p>
          </div>
        </div>

        {settings.scheduledAt && settings.endedAt && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-teal-50 border border-teal-100 rounded-xl">
            <span>🕐</span>
            <p className="text-sm text-teal-700 font-medium">
              {new Date(settings.scheduledAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {" → "}
              {new Date(settings.endedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        )}
        {settings.scheduledAt && !settings.endedAt && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <span>📅</span>
            <p className="text-sm text-blue-700 font-medium">
              Starts:{" "}
              {new Date(settings.scheduledAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · No end time
            </p>
          </div>
        )}
        {!settings.scheduledAt && !settings.endedAt && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <span>♾️</span>
            <p className="text-sm text-gray-500">
              Always available — students can attempt anytime
            </p>
          </div>
        )}
      </div>

      {/* Visibility */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Test Visibility</h2>
        <p className="text-sm text-gray-500 mb-4">
          Who can see and attempt this test?
        </p>
        <div className="space-y-2">
          {VISIBILITY.map((v) => (
            <label
              key={v.value}
              className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all"
              style={{
                borderColor: settings.status === v.value ? v.color : "#E5E7EB",
                background: settings.status === v.value ? v.bg : "white",
              }}
            >
              <input
                type="radio"
                name="visibility"
                value={v.value}
                checked={settings.status === v.value}
                onChange={() => setSettings((s) => ({ ...s, status: v.value }))}
                className="mt-0.5 flex-shrink-0"
                style={{ accentColor: v.color }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{
                    color: settings.status === v.value ? v.color : "#374151",
                  }}
                >
                  {v.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{v.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* After test settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">
          After Test Settings
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Control what students see after completing the test
        </p>
        <div className="space-y-3">
          {OPTIONS.map(({ key, label, hint }) => (
            <label
              key={key}
              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, [key]: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
                style={{ accentColor: "#0D9488" }}
              />
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Next →
        </button>
      </div>
    </div>
  );
}

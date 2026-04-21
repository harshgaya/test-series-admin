// "use client";

// import { useState, useEffect, useCallback } from "react";
// import Link from "next/link";
// import toast from "react-hot-toast";
// import {
//   MdAdd,
//   MdEdit,
//   MdDelete,
//   MdFilterList,
//   MdLiveTv,
// } from "react-icons/md";
// import Badge from "@/components/ui/Badge";
// import AlertDialog from "@/components/ui/AlertDialog";
// import EmptyState from "@/components/ui/EmptyState";
// import Pagination from "@/components/ui/Pagination";
// import { TEST_TYPES, TEST_STATUSES } from "@/lib/constants";

// const STATUS_COLORS = {
//   DRAFT: "gray",
//   PUBLISHED: "green",
//   SCHEDULED: "blue",
//   CANCELLED: "red",
//   CRASH_ONLY: "purple",
// };

// export default function TestsClient({ exams }) {
//   const [tests, setTests] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [totalPages, setTotalPages] = useState(1);
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [showDelete, setShowDelete] = useState(false);
//   const [selected, setSelected] = useState(null);
//   const [delLoading, setDelLoading] = useState(false);

//   const [filterExam, setFilterExam] = useState("");
//   const [filterType, setFilterType] = useState("");
//   const [filterStatus, setFilterStatus] = useState("");

//   const fetchTests = useCallback(async () => {
//     setLoading(true);
//     try {
//       const params = new URLSearchParams({ page, limit: 20 });
//       if (filterExam) params.set("examId", filterExam);
//       if (filterType) params.set("type", filterType);
//       if (filterStatus) params.set("status", filterStatus);

//       const res = await fetch(`/api/tests?${params}`);
//       const data = await res.json();
//       if (data.success) {
//         setTests(data.data.tests);
//         setTotal(data.data.total);
//         setTotalPages(data.data.totalPages);
//       }
//     } catch {
//       toast.error("Failed to load tests");
//     } finally {
//       setLoading(false);
//     }
//   }, [page, filterExam, filterType, filterStatus]);

//   useEffect(() => {
//     fetchTests();
//   }, [fetchTests]);

//   async function handleDelete() {
//     setDelLoading(true);
//     try {
//       const res = await fetch(`/api/tests/${selected.id}`, {
//         method: "DELETE",
//       });
//       const data = await res.json();
//       if (!data.success) {
//         toast.error(data.error);
//         return;
//       }
//       toast.success("Test deleted!");
//       setShowDelete(false);
//       fetchTests();
//     } catch {
//       toast.error("Something went wrong");
//     } finally {
//       setDelLoading(false);
//     }
//   }

//   async function toggleStatus(test) {
//     const newStatus = test.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
//     try {
//       const res = await fetch(`/api/tests/${test.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...test, status: newStatus }),
//       });
//       const data = await res.json();
//       if (!data.success) {
//         toast.error(data.error);
//         return;
//       }
//       setTests(
//         tests.map((t) => (t.id === test.id ? { ...t, status: newStatus } : t)),
//       );
//       toast.success(
//         newStatus === "PUBLISHED" ? "Test published!" : "Test unpublished!",
//       );
//     } catch {
//       toast.error("Something went wrong");
//     }
//   }

//   const testTypeLabel = (val) =>
//     TEST_TYPES.find((t) => t.value === val)?.label || val;

//   return (
//     <>
//       <div className="page-header">
//         <div>
//           <p className="page-title">Tests ({total})</p>
//           <p className="page-subtitle">All test series across all exams</p>
//         </div>
//         <Link href="/admin/tests/new" className="btn-primary">
//           <MdAdd className="text-lg" /> Create Test
//         </Link>
//       </div>

//       {/* Filters */}
//       <div className="card p-4 mb-4">
//         <div className="flex items-center gap-2 w-[500px]">
//           <MdFilterList className="text-gray-400" />
//           <select
//             className="input-field w-36 py-1.5"
//             value={filterExam}
//             onChange={(e) => {
//               setFilterExam(e.target.value);
//               setPage(1);
//             }}
//           >
//             <option value="">All Exams</option>
//             {exams.map((e) => (
//               <option key={e.id} value={e.id}>
//                 {e.name}
//               </option>
//             ))}
//           </select>
//           <select
//             className="input-field w-44 py-1.5"
//             value={filterType}
//             onChange={(e) => {
//               setFilterType(e.target.value);
//               setPage(1);
//             }}
//           >
//             <option value="">All Types</option>
//             {TEST_TYPES.map((t) => (
//               <option key={t.value} value={t.value}>
//                 {t.label}
//               </option>
//             ))}
//           </select>
//           <select
//             className="input-field w-32 py-1.5"
//             value={filterStatus}
//             onChange={(e) => {
//               setFilterStatus(e.target.value);
//               setPage(1);
//             }}
//           >
//             <option value="">All Status</option>
//             {TEST_STATUSES.map((s) => (
//               <option key={s.value} value={s.value}>
//                 {s.label}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       <div className="card overflow-hidden">
//         {loading ? (
//           <div className="flex items-center justify-center py-16">
//             <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
//           </div>
//         ) : tests.length === 0 ? (
//           <EmptyState
//             title="No tests found"
//             message="Create your first test series"
//             action={
//               <Link href="/admin/tests/new" className="btn-primary">
//                 <MdAdd />
//                 Create Test
//               </Link>
//             }
//           />
//         ) : (
//           <>
//             <table className="w-full text-sm">
//               <thead className="bg-gray-50 border-b border-gray-200">
//                 <tr>
//                   {[
//                     "Test",
//                     "Exam",
//                     "Type",
//                     "Questions",
//                     "Duration",
//                     "Price",
//                     "Attempts",
//                     "Status",
//                     "Actions",
//                   ].map((h) => (
//                     <th
//                       key={h}
//                       className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {tests.map((t) => (
//                   <tr key={t.id} className="table-row-hover">
//                     <td className="px-4 py-3">
//                       <p className="font-medium text-gray-900 max-w-xs truncate">
//                         {t.title}
//                       </p>
//                       {t.testType === "LIVE" && (
//                         <span className="text-xs text-red-500 flex items-center gap-1">
//                           <MdLiveTv />
//                           Live
//                         </span>
//                       )}
//                     </td>
//                     <td className="px-4 py-3 text-gray-600 text-xs">
//                       {t.exam?.name}
//                     </td>
//                     <td className="px-4 py-3">
//                       <Badge label={testTypeLabel(t.testType)} color="blue" />
//                     </td>
//                     <td className="px-4 py-3 text-gray-700">
//                       {t._count.testQuestions}
//                     </td>
//                     <td className="px-4 py-3 text-gray-600">
//                       {t.durationMins} min
//                     </td>
//                     <td className="px-4 py-3 text-gray-700">
//                       {Number(t.price) === 0 ? (
//                         <span className="text-green-600 font-medium">Free</span>
//                       ) : (
//                         `₹${t.price}`
//                       )}
//                     </td>
//                     <td className="px-4 py-3 text-gray-700">
//                       {t._count.attempts}
//                     </td>
//                     <td className="px-4 py-3">
//                       <Badge
//                         label={t.status}
//                         color={STATUS_COLORS[t.status] || "gray"}
//                       />
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center justify-end gap-1">
//                         <button
//                           onClick={() => toggleStatus(t)}
//                           className={`text-xs px-2 py-1 rounded font-medium ${
//                             t.status === "PUBLISHED"
//                               ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
//                               : "bg-green-100 text-green-700 hover:bg-green-200"
//                           }`}
//                         >
//                           {t.status === "PUBLISHED" ? "Unpublish" : "Publish"}
//                         </button>
//                         <Link
//                           href={`/admin/tests/${t.id}`}
//                           className="p-1.5 text-gray-400 hover:text-blue-600"
//                         >
//                           <MdEdit className="text-lg" />
//                         </Link>
//                         <button
//                           onClick={() => {
//                             setSelected(t);
//                             setShowDelete(true);
//                           }}
//                           className="p-1.5 text-gray-400 hover:text-red-600"
//                         >
//                           <MdDelete className="text-lg" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             <Pagination
//               page={page}
//               totalPages={totalPages}
//               onPageChange={setPage}
//             />
//           </>
//         )}
//       </div>

//       <AlertDialog
//         isOpen={showDelete}
//         title="Delete Test?"
//         message={`Delete "${selected?.title}"? All student attempts will also be deleted.`}
//         confirmText="Delete"
//         onConfirm={handleDelete}
//         onCancel={() => setShowDelete(false)}
//         loading={delLoading}
//       />
//     </>
//   );
// }
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
  MdLiveTv,
  MdVisibility,
  MdSchedule,
} from "react-icons/md";
import Badge from "@/components/ui/Badge";
import AlertDialog from "@/components/ui/AlertDialog";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { TEST_TYPES, TEST_STATUSES } from "@/lib/constants";

const STATUS_COLORS = {
  DRAFT: "gray",
  PUBLISHED: "green",
  SCHEDULED: "blue",
  CANCELLED: "red",
  CRASH_ONLY: "purple",
};

function fmt(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function ScheduleCell({ scheduledAt, endedAt, startedAt }) {
  const now = new Date();
  const start = scheduledAt ? new Date(scheduledAt) : null;
  const end = endedAt ? new Date(endedAt) : null;

  if (!start && !end)
    return <span className="text-xs text-gray-400">Always</span>;

  const isLive = start && end && now >= start && now <= end;
  const upcoming = start && now < start;
  const ended = end && now > end;

  return (
    <div className="text-xs space-y-1">
      {isLive && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-semibold">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />{" "}
          LIVE NOW
        </span>
      )}
      {upcoming && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">
          <MdSchedule /> Upcoming
        </span>
      )}
      {ended && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-semibold">
          Ended
        </span>
      )}
      {start && <p className="text-gray-500">▶ {fmt(start)}</p>}
      {end && <p className="text-gray-400">■ {fmt(end)}</p>}
      {startedAt && <p className="text-teal-500">👤 {fmt(startedAt)}</p>}
    </div>
  );
}

export default function TestsClient({ exams }) {
  const [tests, setTests] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [filterExam, setFilterExam] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterExam) params.set("examId", filterExam);
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/tests?${params}`);
      const data = await res.json();
      if (data.success) {
        setTests(data.data.tests);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
    } catch {
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, [page, filterExam, filterType, filterStatus]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  async function handleDelete() {
    setDelLoading(true);
    try {
      const res = await fetch(`/api/tests/${selected.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Test deleted!");
      setShowDelete(false);
      fetchTests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDelLoading(false);
    }
  }

  async function toggleStatus(test) {
    const newStatus = test.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...test, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      setTests(
        tests.map((t) => (t.id === test.id ? { ...t, status: newStatus } : t)),
      );
      toast.success(
        newStatus === "PUBLISHED" ? "Test published!" : "Test unpublished!",
      );
    } catch {
      toast.error("Something went wrong");
    }
  }

  const typeLabel = (val) =>
    TEST_TYPES.find((t) => t.value === val)?.label || val;

  const COLS = [
    "Test",
    "Exam",
    "Type",
    "Questions",
    "Duration",
    "Marks",
    "Negative",
    "Price",
    "Attempts",
    "Schedule",
    "Status",
    "Actions",
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-title">Tests ({total})</p>
          <p className="page-subtitle">All test series across all exams</p>
        </div>
        <Link href="/admin/tests/new" className="btn-primary">
          <MdAdd className="text-lg" /> Create Test
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 w-[500px]">
        <div className="flex items-center gap-2 ">
          <MdFilterList className="text-gray-400" />
          <select
            className="input-field w-36 py-1.5"
            value={filterExam}
            onChange={(e) => {
              setFilterExam(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            className="input-field w-44 py-1.5"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            {TEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="input-field w-36 py-1.5"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            {TEST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            title="No tests found"
            message="Create your first test series"
            action={
              <Link href="/admin/tests/new" className="btn-primary">
                <MdAdd /> Create Test
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {COLS.map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === "Actions" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map((t) => (
                    <tr key={t.id} className="table-row-hover">
                      {/* Test */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-gray-900 truncate">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.testType === "LIVE" && (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <MdLiveTv /> Live
                            </span>
                          )}
                          <span className="text-xs text-gray-400">#{t.id}</span>
                        </div>
                      </td>

                      {/* Exam */}
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {t.exam?.name || "—"}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge label={typeLabel(t.testType)} color="blue" />
                      </td>

                      {/* Questions */}
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {t._count?.testQuestions ?? "—"}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {t.durationMins} min
                      </td>

                      {/* Marks */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-green-600 font-medium">
                          +{t.marksCorrect}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          / {t.totalMarks}
                        </span>
                      </td>

                      {/* Negative */}
                      <td className="px-4 py-3 text-red-500 font-medium">
                        {Number(t.negativeMarking)}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {Number(t.price) === 0 ? (
                          <span className="text-green-600 font-medium">
                            Free
                          </span>
                        ) : (
                          <span className="font-medium">
                            ₹{Number(t.price)}
                          </span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="px-4 py-3 text-gray-700">
                        {t._count?.attempts ?? 0}
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3">
                        <ScheduleCell
                          scheduledAt={t.scheduledAt}
                          endedAt={t.endedAt}
                          startedAt={t.startedAt}
                        />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          label={t.status}
                          color={STATUS_COLORS[t.status] || "gray"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleStatus(t)}
                            className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                              t.status === "PUBLISHED"
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {t.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          <Link
                            href={`/admin/tests/${t.id}/preview`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                            title="Preview"
                          >
                            <MdVisibility className="text-lg" />
                          </Link>
                          <Link
                            href={`/admin/tests/${t.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <MdEdit className="text-lg" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelected(t);
                              setShowDelete(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <MdDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <AlertDialog
        isOpen={showDelete}
        title="Delete Test?"
        message={`Delete "${selected?.title}"? All student attempts will also be deleted.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={delLoading}
      />
    </>
  );
}

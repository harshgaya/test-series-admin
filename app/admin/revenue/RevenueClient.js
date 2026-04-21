"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  MdAttachMoney,
  MdTrendingUp,
  MdCalendarToday,
  MdDownload,
} from "react-icons/md";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { PAYMENT_STATUSES } from "@/lib/constants";

const STATUS_COLORS = {
  PENDING: "yellow",
  SUCCESS: "green",
  FAILED: "red",
  REFUNDED: "purple",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function RevenueClient() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    monthRevenue: 0,
    yearRevenue: 0,
    totalRevenue: 0,
  });

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.set("status", filterStatus);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(`/api/revenue?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data.payments);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
        setSummary({
          monthRevenue: data.data.monthRevenue,
          yearRevenue: data.data.yearRevenue,
          totalRevenue: data.data.totalRevenue,
        });
      }
    } catch {
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterFrom, filterTo]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  function exportCSV() {
    if (payments.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Date",
      "Student",
      "Contact",
      "Test",
      "Amount",
      "Status",
      "Order ID",
    ];
    const rows = payments.map((p) => [
      new Date(p.createdAt).toLocaleDateString("en-IN"),
      p.student?.name || "",
      p.student?.email || p.student?.phone || "",
      p.test?.title || "",
      p.amount,
      p.status,
      p.razorpayOrderId || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <MdCalendarToday className="text-white text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">This Month</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.monthRevenue)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MdTrendingUp className="text-white text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">This Year</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.yearRevenue)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <MdAttachMoney className="text-white text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">All Time</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Export */}
      <div className="page-header">
        <div>
          <p className="page-title">Payments ({total})</p>
          <p className="page-subtitle">All Razorpay transactions</p>
        </div>
        <div className="flex items-center gap-2 ">
          <select
            className="input-field w-32 py-2"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input-field w-36 py-2"
            value={filterFrom}
            onChange={(e) => {
              setFilterFrom(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            className="input-field w-36 py-2"
            value={filterTo}
            onChange={(e) => {
              setFilterTo(e.target.value);
              setPage(1);
            }}
          />
          <button onClick={exportCSV} className="btn-secondary">
            <MdDownload className="text-lg" /> Export CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments found"
            message="Payments will appear here after students purchase tests"
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Date",
                    "Student",
                    "Test",
                    "Amount",
                    "Order ID",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      <br />
                      <span className="text-gray-400">
                        {new Date(p.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {p.student?.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.student?.email || p.student?.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{p.test?.title || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${p.status === "SUCCESS" ? "text-green-600" : "text-gray-700"}`}
                      >
                        ₹{p.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {p.razorpayOrderId?.substring(0, 16)}...
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={p.status}
                        color={STATUS_COLORS[p.status] || "gray"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}

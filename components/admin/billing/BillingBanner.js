"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdWarning, MdError, MdClose, MdPayment } from "react-icons/md";

export default function BillingBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function checkBilling() {
      try {
        const res = await fetch("/api/billing?action=status");
        const data = await res.json();
        if (data.success) {
          const { current, latestUnpaid } = data.data;
          setStatus({ current, latestUnpaid });
        }
      } catch {}
    }
    checkBilling();
    // Re-check every 5 minutes
    const interval = setInterval(checkBilling, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status || dismissed) return null;

  const { current, latestUnpaid } = status;

  // Priority 1: Suspended (overdue 7+ days)
  if (latestUnpaid?.status === "overdue") {
    const dueDate = new Date(latestUnpaid.dueDate);
    const daysOverdue = Math.floor(
      (new Date() - dueDate) / (1000 * 60 * 60 * 24),
    );
    const isSuspended = daysOverdue >= 7;

    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium"
        style={{
          background: isSuspended ? "#7F1D1D" : "#991B1B",
          color: "white",
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MdError style={{ fontSize: 18, flexShrink: 0 }} />
          <span className="truncate">
            {isSuspended
              ? `⚠️ System suspended — Bill of ₹${Math.round(latestUnpaid.totalInr)} for ${latestUnpaid.month}/${latestUnpaid.year} overdue by ${daysOverdue} days. AI features are disabled.`
              : `🔴 Payment overdue — ₹${Math.round(latestUnpaid.totalInr)} due for ${latestUnpaid.month}/${latestUnpaid.year}. Pay within ${7 - daysOverdue} days to avoid suspension.`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admin/billing"
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-all"
            style={{ background: "white", color: "#991B1B" }}
          >
            <MdPayment style={{ fontSize: 14 }} /> Pay Now
          </Link>
        </div>
      </div>
    );
  }

  // Priority 2: Pending bill (within 7 days)
  if (latestUnpaid?.status === "pending") {
    const dueDate = new Date(latestUnpaid.dueDate);
    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium"
        style={{ background: "#92400E", color: "white" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MdWarning style={{ fontSize: 18, flexShrink: 0 }} />
          <span className="truncate">
            💳 Bill of ₹{Math.round(latestUnpaid.totalInr)} for{" "}
            {latestUnpaid.month}/{latestUnpaid.year} due in {daysLeft} day
            {daysLeft !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admin/billing"
            className="rounded-lg px-3 py-1 text-xs font-bold"
            style={{ background: "white", color: "#92400E" }}
          >
            Pay Now
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="opacity-70 hover:opacity-100"
          >
            <MdClose style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    );
  }

  // Priority 3: API threshold warning (current month)
  if (current?.apiThresholdBreached && !dismissed) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium"
        style={{ background: "#D97706", color: "white" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MdWarning style={{ fontSize: 18, flexShrink: 0 }} />
          <span className="truncate">
            ⚡ API usage this month: ₹{Math.round(current.apiBilledInr)} —
            exceeded ₹2,000 threshold. Heavy AI usage detected.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admin/billing"
            className="rounded-lg px-3 py-1 text-xs font-bold"
            style={{ background: "white", color: "#D97706" }}
          >
            View Usage
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="opacity-70 hover:opacity-100"
          >
            <MdClose style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

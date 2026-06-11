"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  MdReceiptLong,
  MdPayment,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdRefresh,
  MdBarChart,
  MdPeople,
  MdCode,
} from "react-icons/md";

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function StatusBadge({ status }) {
  const config = {
    paid: { bg: "#DCFCE7", text: "#15803D", label: "Paid" },
    pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
    overdue: { bg: "#FEE2E2", text: "#DC2626", label: "Overdue" },
  }[status] || { bg: "#F1F5F9", text: "#64748B", label: status };

  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "#0D9488",
  warn = false,
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: warn ? "#FEF3C7" : "#F0FDFA" }}
      >
        <span style={{ color: warn ? "#D97706" : color, fontSize: 20 }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function BillingDashboard() {
  const [data, setData] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(null); // billId being paid

  async function fetchData() {
    try {
      const [statusRes, usageRes] = await Promise.all([
        fetch("/api/billing?action=status"),
        fetch("/api/billing?action=usage"),
      ]);
      const statusData = await statusRes.json();
      const usageData = await usageRes.json();
      if (statusData.success) setData(statusData.data);
      if (usageData.success) setUsage(usageData.data.logs);
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function generateBill() {
    setGenerating(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error);
        return;
      }
      toast.success("Bill generated successfully!");
      fetchData();
    } catch {
      toast.error("Failed to generate bill");
    } finally {
      setGenerating(false);
    }
  }

  async function payBill(bill) {
    setPaying(bill.id);
    try {
      // Create Razorpay order
      const res = await fetch("/api/billing/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: bill.id }),
      });
      const orderData = await res.json();
      if (!orderData.success) {
        toast.error(orderData.error);
        return;
      }

      const { orderId, amount, currency, keyId, description } = orderData.data;

      // Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: "RB Academy",
        description,
        order_id: orderId,
        handler: async function (response) {
          // Verify payment
          const verifyRes = await fetch("/api/billing/pay", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              billId: bill.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Payment successful! Bill marked as paid.");
            fetchData();
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: { name: "Admin", email: "admin@rbacademy.in" },
        theme: { color: "#0D9488" },
        modal: { ondismiss: () => setPaying(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Payment failed");
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
          style={{ borderTopColor: "#0D9488" }}
        />
      </div>
    );
  }

  const { current, history, latestUnpaid } = data || {};
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevBillExists = history?.some(
    (b) => b.month === prevMonth && b.year === prevYear,
  );

  return (
    <>
      {/* Load Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="space-y-6">
        {/* Current month live stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">
              Current Month — {MONTH_NAMES[current?.month]} {current?.year}
            </h2>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
            >
              <MdRefresh style={{ fontSize: 15 }} /> Refresh
            </button>
          </div>

          {/* API threshold warning */}
          {current?.apiThresholdBreached && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl mb-4"
              style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D" }}
            >
              <MdWarning style={{ fontSize: 20, color: "#D97706" }} />
              <div>
                <p className="text-sm font-bold text-yellow-800">
                  API usage exceeded ₹2,000 threshold
                </p>
                <p className="text-xs text-yellow-700">
                  Current API billing: ₹{Math.round(current.apiBilledInr)}.
                  Consider reducing AI feature usage this month.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<MdCode />}
              label="API Cost (Claude)"
              value={`₹${Math.round(current?.apiBilledInr || 0)}`}
              warn={current?.apiThresholdBreached}
            />
            <StatCard
              icon={<MdPeople />}
              label="Unique Students"
              value={current?.uniqueStudents || 0}
              sub={`₹${current?.studentBilledInr || 0} (×₹25 each)`}
            />
            <StatCard
              icon={<MdReceiptLong />}
              label="Estimated Bill"
              value={`₹${Math.round(current?.totalInr || 0)}`}
              sub="API + Students"
            />
            <StatCard
              icon={<MdBarChart />}
              label="USD/INR Rate"
              value={`₹${current?.usdToInr || 95}`}
              sub="Live rate"
            />
          </div>
        </div>

        {/* API usage breakdown */}
        {usage && usage.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">
              API Usage Breakdown — This Month
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">
                      Route
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">
                      Model
                    </th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">
                      Calls
                    </th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">
                      Tokens
                    </th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">
                      Cost (USD)
                    </th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">
                      Billed (INR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usage.map((log, i) => {
                    // Displayed USD already includes the markup, so USD x rate = INR cleanly.
                    const displayUsd = (log._sum.costUsd || 0) * 2;
                    const billedInr = displayUsd * (current?.usdToInr || 95);
                    return (
                      <tr key={i}>
                        <td className="py-2.5 font-medium text-gray-700">
                          {log.route}
                        </td>
                        <td className="py-2.5 text-xs text-gray-500">
                          {log.model.replace("claude-", "")}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          {log._count.id}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          {(
                            (log._sum.inputTokens + log._sum.outputTokens) /
                            1000
                          ).toFixed(1)}
                          K
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          ${displayUsd.toFixed(4)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-800">
                          ₹{Math.round(billedInr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="py-2.5 font-bold text-gray-700">
                      Total
                    </td>
                    <td className="py-2.5 text-right font-bold text-gray-800">
                      $
                      {(
                        usage.reduce((s, l) => s + (l._sum.costUsd || 0), 0) * 2
                      ).toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-teal-700">
                      ₹{Math.round(current?.apiBilledInr || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Generate bill */}
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">
              Generate Bill for {MONTH_NAMES[prevMonth]} {prevYear}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {prevBillExists
                ? "Bill already generated for this month"
                : "Generate the bill for the previous month to send for payment"}
            </p>
          </div>
          <button
            onClick={generateBill}
            disabled={generating || prevBillExists}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: prevBillExists ? "#9CA3AF" : "#0D9488" }}
          >
            <MdReceiptLong style={{ fontSize: 16 }} />
            {generating
              ? "Generating..."
              : prevBillExists
                ? "Already Generated"
                : "Generate Bill"}
          </button>
        </div>

        {/* Bill history */}
        {history && history.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Billing History</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {history.map((bill) => {
                const isOverdue = bill.status === "overdue";
                const isPending = bill.status === "pending";
                const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                const daysLeft = dueDate
                  ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800">
                          {MONTH_NAMES[bill.month]} {bill.year}
                        </p>
                        <StatusBadge status={bill.status} />
                        {isOverdue && (
                          <span className="text-xs text-red-500 font-medium">
                            Overdue!
                          </span>
                        )}
                        {isPending && daysLeft !== null && daysLeft > 0 && (
                          <span className="text-xs text-yellow-600 font-medium">
                            Due in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>API: ₹{Math.round(bill.apiBilledInr)}</span>
                        <span>
                          Students: {bill.uniqueStudents} × ₹25 = ₹
                          {bill.studentBilledInr}
                        </span>
                        <span className="font-bold text-gray-700">
                          Total: ₹{Math.round(bill.totalInr)}
                        </span>
                      </div>
                      {bill.paidAt && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Paid on{" "}
                          {new Date(bill.paidAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>

                    {(isPending || isOverdue) && (
                      <button
                        onClick={() => payBill(bill)}
                        disabled={paying === bill.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all flex-shrink-0"
                        style={{
                          background: isOverdue ? "#DC2626" : "#0D9488",
                        }}
                      >
                        <MdPayment style={{ fontSize: 16 }} />
                        {paying === bill.id
                          ? "Opening..."
                          : `Pay ₹${Math.round(bill.totalInr)}`}
                      </button>
                    )}

                    {bill.status === "paid" && (
                      <MdCheckCircle
                        style={{
                          fontSize: 24,
                          color: "#15803D",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!history || history.length === 0) && (
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">
              No bills generated yet
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Generate the first bill for last month above
            </p>
          </div>
        )}
      </div>
    </>
  );
}

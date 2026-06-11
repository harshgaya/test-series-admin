import { prisma } from "@/lib/prisma";

// Claude pricing per 1M tokens (as of 2025)
const PRICING = {
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
};

// Calculate cost in USD using exact token counts from data.usage
export function calcCostUsd(model, inputTokens, outputTokens) {
  // Match by partial name in case model string varies
  let price = PRICING[model];
  if (!price) {
    if (model.includes("haiku")) price = { input: 0.8, output: 4.0 };
    else if (model.includes("opus")) price = { input: 15.0, output: 75.0 };
    else price = { input: 3.0, output: 15.0 }; // sonnet default
  }
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}

// Log a Claude API call to DB
export async function logApiUsage({ route, model, inputTokens, outputTokens }) {
  try {
    const costUsd = calcCostUsd(model, inputTokens, outputTokens);
    const now = new Date();
    await prisma.apiUsageLog.create({
      data: {
        route,
        model,
        inputTokens,
        outputTokens,
        costUsd,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    });
    return costUsd;
  } catch (err) {
    console.error("Failed to log API usage:", err);
    return 0;
  }
}

// Get current month API cost in USD
export async function getCurrentMonthApiCost() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await prisma.apiUsageLog.aggregate({
    where: { month, year },
    _sum: { costUsd: true },
  });

  return result._sum.costUsd || 0;
}

// Get current month unique students who attempted any test
export async function getCurrentMonthUniqueStudents() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const result = await prisma.testAttempt.findMany({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ["SUBMITTED", "TIMED_OUT"] },
    },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  return result.length;
}

// Fetch live USD to INR rate
export async function getUsdToInr() {
  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 3600 } }, // cache 1 hour
    );
    const data = await res.json();
    return data.rates?.INR || 95;
  } catch {
    return 95; // fallback
  }
}

// Check if system is suspended (overdue > 7 days)
export async function isSystemSuspended() {
  try {
    const overdue = await prisma.billingCycle.findFirst({
      where: {
        status: "overdue",
        dueDate: { lt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    return !!overdue;
  } catch {
    return false;
  }
}

// Get billing status for banner
export async function getBillingStatus() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Current month API cost in INR
    const apiCostUsd = await getCurrentMonthApiCost();
    const usdToInr = 95; // use fixed for quick check, full rate fetched on billing page
    const apiCostInr = apiCostUsd * usdToInr * 2; // ×2 markup

    // Latest unpaid bill
    const latestBill = await prisma.billingCycle.findFirst({
      where: { status: { in: ["pending", "overdue"] } },
      orderBy: { createdAt: "desc" },
    });

    // Check overdue
    let isOverdue = false;
    let isSuspended = false;
    let daysOverdue = 0;

    if (latestBill?.dueDate) {
      const diffMs = now - new Date(latestBill.dueDate);
      daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        isOverdue = true;
        // Mark as overdue in DB
        await prisma.billingCycle.update({
          where: { id: latestBill.id },
          data: { status: "overdue" },
        });
      }
      if (daysOverdue >= 7) isSuspended = true;
    }

    return {
      apiCostInr,
      apiThresholdBreached: apiCostInr > 2000,
      isOverdue,
      isSuspended,
      daysOverdue,
      overdueAmount: latestBill?.totalInr || 0,
      overdueMonth: latestBill
        ? `${latestBill.month}/${latestBill.year}`
        : null,
    };
  } catch {
    return {
      apiCostInr: 0,
      apiThresholdBreached: false,
      isOverdue: false,
      isSuspended: false,
      daysOverdue: 0,
      overdueAmount: 0,
      overdueMonth: null,
    };
  }
}

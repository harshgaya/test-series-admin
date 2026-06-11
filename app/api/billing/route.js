import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";
import {
  getCurrentMonthApiCost,
  getCurrentMonthUniqueStudents,
  getUsdToInr,
} from "@/lib/billing";

// GET /api/billing - get billing status, current month, history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    if (action === "status") {
      // Current month live stats
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [apiCostUsd, uniqueStudents, usdToInr, history] = await Promise.all(
        [
          getCurrentMonthApiCost(),
          getCurrentMonthUniqueStudents(),
          getUsdToInr(),
          prisma.billingCycle.findMany({
            orderBy: { createdAt: "desc" },
            take: 12,
          }),
        ],
      );

      const apiCostInr = apiCostUsd * usdToInr;
      const apiBilledInr = apiCostInr * 2; // 2× markup
      const studentBilledInr = uniqueStudents * 25;
      const totalInr = apiBilledInr + studentBilledInr;

      // Check for overdue bills and update status
      const overdueBills = await prisma.billingCycle.findMany({
        where: {
          status: "pending",
          dueDate: { lt: now },
        },
      });

      if (overdueBills.length > 0) {
        await prisma.billingCycle.updateMany({
          where: { id: { in: overdueBills.map((b) => b.id) } },
          data: { status: "overdue" },
        });
      }

      // Current month bill if already generated
      const currentBill = await prisma.billingCycle.findUnique({
        where: { month_year: { month, year } },
      });

      return successResponse({
        current: {
          month,
          year,
          apiCostUsd,
          apiCostInr: Math.round(apiCostInr * 100) / 100,
          apiBilledInr: Math.round(apiBilledInr * 100) / 100,
          uniqueStudents,
          studentBilledInr,
          totalInr: Math.round(totalInr * 100) / 100,
          usdToInr,
          apiThresholdBreached: apiBilledInr > 2000,
          alreadyGenerated: !!currentBill,
        },
        history,
        // Latest unpaid
        latestUnpaid:
          history.find((b) => ["pending", "overdue"].includes(b.status)) ||
          null,
      });
    }

    // API usage breakdown for current month
    if (action === "usage") {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const logs = await prisma.apiUsageLog.groupBy({
        by: ["route", "model"],
        where: { month, year },
        _sum: { costUsd: true, inputTokens: true, outputTokens: true },
        _count: { id: true },
      });

      return successResponse({ logs });
    }

    return errorResponse("Invalid action");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch billing data", 500);
  }
}

// POST /api/billing - generate bill for previous month
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "generate") {
      const now = new Date();
      // Previous month
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear =
        now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      // Check if already generated
      const existing = await prisma.billingCycle.findUnique({
        where: { month_year: { month: prevMonth, year: prevYear } },
      });
      if (existing) {
        return errorResponse("Bill for this month already generated");
      }

      // Fetch live USD/INR rate
      const usdToInr = await getUsdToInr();

      // API cost for prev month
      const apiResult = await prisma.apiUsageLog.aggregate({
        where: { month: prevMonth, year: prevYear },
        _sum: { costUsd: true },
      });
      const apiCostUsd = apiResult._sum.costUsd || 0;
      const apiCostInr = apiCostUsd * usdToInr;
      const apiBilledInr = apiCostInr * 2;

      // Unique students for prev month
      const startOfMonth = new Date(prevYear, prevMonth - 1, 1);
      const endOfMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59);

      const uniqueStudentsResult = await prisma.testAttempt.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        select: { studentId: true },
        distinct: ["studentId"],
      });

      const uniqueStudents = uniqueStudentsResult.length;
      const studentBilledInr = uniqueStudents * 25;
      const totalInr = apiBilledInr + studentBilledInr;

      // Due date = 7 days from now
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const bill = await prisma.billingCycle.create({
        data: {
          month: prevMonth,
          year: prevYear,
          apiCostUsd,
          apiCostInr: Math.round(apiCostInr * 100) / 100,
          apiBilledInr: Math.round(apiBilledInr * 100) / 100,
          uniqueStudents,
          studentBilledInr,
          totalInr: Math.round(totalInr * 100) / 100,
          usdToInr,
          status: "pending",
          dueDate,
        },
      });

      return successResponse(bill, 201);
    }

    return errorResponse("Invalid action");
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to generate bill", 500);
  }
}

// PATCH /api/billing - mark as paid manually
export async function PATCH(request) {
  try {
    const { id } = await request.json();
    const bill = await prisma.billingCycle.update({
      where: { id: parseInt(id) },
      data: { status: "paid", paidAt: new Date() },
    });
    return successResponse(bill);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to update bill", 500);
  }
}

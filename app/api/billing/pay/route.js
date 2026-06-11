import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";
import Razorpay from "razorpay";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/billing/pay - create Razorpay order for a bill
export async function POST(request) {
  try {
    const { billId } = await request.json();

    const bill = await prisma.billingCycle.findUnique({
      where: { id: parseInt(billId) },
    });
    if (!bill) return errorResponse("Bill not found", 404);
    if (bill.status === "paid") return errorResponse("Already paid");

    const razorpay = getRazorpay();

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(bill.totalInr * 100), // paise
      currency: "INR",
      receipt: `bill_${bill.id}_${bill.month}_${bill.year}`,
      notes: {
        billId: bill.id,
        month: bill.month,
        year: bill.year,
      },
    });

    // Save order ID to bill
    await prisma.billingCycle.update({
      where: { id: bill.id },
      data: { razorpayOrderId: order.id },
    });

    return successResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      billId: bill.id,
      description: `RB Academy Billing - ${bill.month}/${bill.year}`,
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create payment order", 500);
  }
}

// PUT /api/billing/pay - verify payment and mark bill as paid
export async function PUT(request) {
  try {
    const { billId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      await request.json();

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return errorResponse("Payment verification failed", 400);
    }

    // Mark as paid
    const bill = await prisma.billingCycle.update({
      where: { id: parseInt(billId) },
      data: {
        status: "paid",
        paidAt: new Date(),
        razorpayPaymentId,
      },
    });

    return successResponse(bill);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to verify payment", 500);
  }
}

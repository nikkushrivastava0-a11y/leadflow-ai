import { NextResponse } from "next/server";
// @ts-ignore
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  try {
    // ₹499 ka order create kar rahe hain (Razorpay paise me amount leta hai, toh 499 * 100)
    const order = await razorpay.orders.create({
      amount: 49900, 
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}
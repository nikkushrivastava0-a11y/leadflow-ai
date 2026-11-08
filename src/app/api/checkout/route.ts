import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// @ts-ignore - the installed Razorpay package types may vary
import Razorpay from "razorpay";

/**
 * A public order-creation endpoint can be abused even if it does not charge
 * the caller directly. Require a verified Supabase user BEFORE creating an
 * order. This is not a subscription/payment-verification implementation.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sign in to start checkout." },
        { status: 401 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Checkout is not configured." },
        { status: 503 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Only the server chooses the plan amount. 499 INR is in paise.
    const order = await razorpay.orders.create({
      amount: 49900,
      currency: "INR",
      receipt: `lf_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
    });

    return NextResponse.json(
      { orderId: order.id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Checkout initiation failed:", error);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 503 }
    );
  }
}

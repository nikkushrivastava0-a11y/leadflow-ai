import { NextResponse } from "next/server";

/**
 * Launch gate: there is not yet a verified order->owner entitlement flow.
 * Authenticated order creation alone cannot prove a captured payment.
 * Keep checkout unavailable until signed, idempotent webhooks, captured
 * amount/currency and persistent tenant entitlements are verified in staging.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Paid upgrades are not available yet." },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

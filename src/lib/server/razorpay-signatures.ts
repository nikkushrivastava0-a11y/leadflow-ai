import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-only payment signature primitives.
 *
 * These functions ONLY establish HMAC authenticity. They do not prove:
 * - checkout order belongs to the authenticated customer,
 * - payment has been captured/settled,
 * - the expected amount/currency was paid,
 * - a webhook has not already been processed,
 * - paid entitlement should be activated.
 *
 * NEVER accept the expected order ID solely from browser input. Retrieve
 * it from the authenticated server-owned order mapping in the database.
 * See: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */

const ID_PATTERN = /^(?:order|pay)_[A-Za-z0-9]{5,100}$/;
const HEX_SHA256 = /^[0-9a-fA-F]{64}$/;
const MAX_WEBHOOK_BYTES = 1024 * 1024;

function safeHmacMatch(
  input: string | Buffer,
  hexSignature: unknown,
  secret: unknown
): boolean {
  if (
    typeof secret !== "string" ||
    secret.length === 0 ||
    typeof hexSignature !== "string" ||
    !HEX_SHA256.test(hexSignature)
  ) {
    return false;
  }

  const provided = Buffer.from(hexSignature, "hex");
  const expected = createHmac("sha256", secret)
    .update(input)
    .digest();

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export function verifyCheckoutSignature(
  serverOwnedOrderId: unknown,
  razorpayPaymentId: unknown,
  razorpaySignature: unknown,
  keySecret: unknown
): boolean {
  if (
    typeof serverOwnedOrderId !== "string" ||
    typeof razorpayPaymentId !== "string" ||
    !ID_PATTERN.test(serverOwnedOrderId) ||
    !serverOwnedOrderId.startsWith("order_") ||
    !ID_PATTERN.test(razorpayPaymentId) ||
    !razorpayPaymentId.startsWith("pay_")
  ) {
    return false;
  }

  return safeHmacMatch(
    `${serverOwnedOrderId}|${razorpayPaymentId}`,
    razorpaySignature,
    keySecret
  );
}

/**
 * Verify the EXACT raw request body (bytes/string received by server).
 * Parse JSON only after this returns true. Use a dedicated webhook secret,
 * not the Razorpay API key secret.
 *
 * Delivery replay protection must be handled by a unique event ID in a
 * transactionally durable database before updating paid entitlements.
 */
export function verifyWebhookSignature(
  rawBody: unknown,
  razorpaySignature: unknown,
  webhookSecret: unknown
): boolean {
  if (
    !(typeof rawBody === "string" || Buffer.isBuffer(rawBody))
  ) return false;
  if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES) return false;

  return safeHmacMatch(rawBody, razorpaySignature, webhookSecret);
}

import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/lib/server/razorpay-signatures.ts";

const order = "order_abc123456";
const payment = "pay_def123456";
const secret = "not-a-real-razorpay-secret";
const sign = (input: string, key: string) =>
  createHmac("sha256", key).update(input).digest("hex");

test("accepts a correct server-owned checkout signature", () => {
  const signature = sign(`${order}|${payment}`, secret);
  assert.equal(
    verifyCheckoutSignature(order, payment, signature, secret),
    true
  );
  assert.equal(
    verifyCheckoutSignature(order, payment, signature.toUpperCase(), secret),
    true
  );
});

test("rejects replayed/tampered IDs, wrong secret, invalid signature", () => {
  const signature = sign(`${order}|${payment}`, secret);
  assert.equal(
    verifyCheckoutSignature("order_another123", payment, signature, secret),
    false
  );
  assert.equal(
    verifyCheckoutSignature(order, "pay_other12345", signature, secret),
    false
  );
  assert.equal(
    verifyCheckoutSignature(order, payment, signature, "wrong-secret"),
    false
  );
  assert.equal(
    verifyCheckoutSignature(order, payment, "nothex", secret),
    false
  );
  assert.equal(
    verifyCheckoutSignature(order, payment, null, secret),
    false
  );
  assert.equal(
    verifyCheckoutSignature("../etc/passwd", payment, signature, secret),
    false
  );
});

test("webhook requires exact RAW request body bytes", () => {
  const raw = Buffer.from('{"event":"payment.captured","payload":{"id":"pay_test"}}');
  const webhookSecret = "fake-webhook-key";
  const signature = sign(raw.toString(), webhookSecret);

  assert.equal(verifyWebhookSignature(raw, signature, webhookSecret), true);
  assert.equal(
    verifyWebhookSignature(raw.toString(), signature, webhookSecret),
    true
  );
  assert.equal(
    verifyWebhookSignature(raw.toString() + "\n", signature, webhookSecret),
    false
  );
  assert.equal(
    verifyWebhookSignature(Buffer.from(raw).reverse(), signature, webhookSecret),
    false
  );
  assert.equal(verifyWebhookSignature(raw, signature, secret), false);
  assert.equal(verifyWebhookSignature(raw, "x", webhookSecret), false);
});

test("webhook rejects oversized payload before calculating HMAC", () => {
  assert.equal(
    verifyWebhookSignature("a".repeat(1024 * 1024 + 1), "a".repeat(64), "test"),
    false
  );
});

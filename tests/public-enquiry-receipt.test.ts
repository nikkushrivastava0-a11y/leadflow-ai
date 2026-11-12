import assert from "node:assert/strict";
import test from "node:test";
import { createEnquiryReceipt, verifyEnquiryReceipt, ENQUIRY_RECEIPT_SECONDS } from "../src/lib/server/public-enquiry-receipt.ts";

const secret = "synthetic-receipt-secret-not-used-live";
const now = 1794510000000;

test("only a recent signed receipt for the same business proves a save", () => {
  const receipt = createEnquiryReceipt("business-a", secret, now)!;
  assert.equal(verifyEnquiryReceipt(receipt, "business-a", secret, now), true);
  assert.equal(verifyEnquiryReceipt(receipt, "business-b", secret, now), false);
  assert.equal(verifyEnquiryReceipt(receipt, "business-a", "different-synthetic-long-secret-value", now), false);
  assert.equal(verifyEnquiryReceipt(receipt, "business-a", secret, now + ENQUIRY_RECEIPT_SECONDS * 1000), false);
  assert.equal(verifyEnquiryReceipt(receipt, "business-a", secret, now - 1000), false);
  assert.equal(verifyEnquiryReceipt(receipt.replace("business-a", "business-b"), "business-b", secret, now), false);
});

test("missing, malformed or unsigned receipt fails closed without throwing", () => {
  for (const value of [undefined, "true", "a.b.c", "x".repeat(1000), "business-a.1794510000.ff"]) {
    assert.equal(verifyEnquiryReceipt(value, "business-a", secret, now), false);
  }
  assert.equal(createEnquiryReceipt("business-a", undefined, now), null);
  assert.equal(createEnquiryReceipt("../poison", secret, now), null);
  assert.equal(verifyEnquiryReceipt(createEnquiryReceipt("business-a", secret, now)!, "business-a", undefined, now), false);
});

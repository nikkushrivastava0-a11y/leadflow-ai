import { createHmac, timingSafeEqual } from "node:crypto";

export const ENQUIRY_RECEIPT_COOKIE = "leadflow-enquiry-receipt";
export const ENQUIRY_RECEIPT_SECONDS = 300;

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update("enquiry-receipt-v1:" + value).digest("hex");
}

/** Contains no contact data or database IDs. This is evidence of a recent save,
 * not an authorization token, an exactly-once guarantee or a delivery promise. */
export function createEnquiryReceipt(slug: string, secret: string | undefined, now = Date.now()): string | null {
  if (!secret || secret.length < 32 || !/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const value = `${slug}.${Math.floor(now / 1000)}`;
  return `${value}.${sign(value, secret)}`;
}

export function verifyEnquiryReceipt(receipt: string | undefined, slug: string, secret: string | undefined, now = Date.now()): boolean {
  if (!secret || secret.length < 32 || !receipt || receipt.length > 150) return false;
  const parts = receipt.split(".");
  if (parts.length !== 3 || parts[0] !== slug || !/^\d{10}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const age = Math.floor(now / 1000) - Number(parts[1]);
  if (age < 0 || age >= ENQUIRY_RECEIPT_SECONDS) return false;
  return timingSafeEqual(Buffer.from(parts[2], "hex"), Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret), "hex"));
}

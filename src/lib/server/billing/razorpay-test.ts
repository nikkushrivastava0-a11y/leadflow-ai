import type { BillingConfig, Provider, ProviderPayment } from "./core.ts";
import { BillingError, providerId } from "./core.ts";

/** Official test-mode API adapter. No live-key support, retries, capture or refund operations. */
export function createRazorpayTestProvider(config: BillingConfig, fetcher: typeof fetch = fetch): Provider {
  if (!/^rzp_test_[A-Za-z0-9]+$/.test(config.keyId)) throw new BillingError("Only Razorpay test keys are supported.", 503);
  async function request(path: string, body?: object) {
    const response = await fetcher(`https://api.razorpay.com/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) throw new BillingError("Test payment provider unavailable.", 502);
    return response.json();
  }
  return {
    async createOrder(input) { return request("orders", { ...input, partial_payment: false }); },
    async fetchPayment(id) {
      if (!providerId(id, "pay_")) throw new BillingError("Invalid payment ID.");
      return await request(`payments/${encodeURIComponent(id)}`) as ProviderPayment;
    },
  };
}

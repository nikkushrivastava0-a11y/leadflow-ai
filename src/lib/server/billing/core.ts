import { createHmac, timingSafeEqual, randomUUID, createHash } from "node:crypto";

export type TestPlan = { amount: number; currency: "INR"; durationDays: number };
export type BillingConfig = { keyId: string; keySecret: string; webhookSecret: string; plans: Record<string, TestPlan> };
export type Owner = { userId: string; slug: string };
export type LedgerOrder = Owner & TestPlan & { id: string; providerOrderId: string; plan: string };
export type ProviderPayment = { id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean; amount_refunded: number };
export type Provider = {
  createOrder(input: { amount: number; currency: string; receipt: string }): Promise<{ id: string; amount: number; currency: string; receipt: string }>;
  fetchPayment(id: string): Promise<ProviderPayment>;
};
export type Store = {
  reserveAttempt(owner: Owner, receipt: string): Promise<void>;
  createOrder(order: LedgerOrder): Promise<void>;
  getOrder(id: string): Promise<LedgerOrder | null>;
  process(input: { eventId: string; bodyHash: string; orderId: string; paymentId: string; amount: number; currency: string; state: "captured" | "revoked" }): Promise<"applied" | "duplicate" | "revoked">;
};
export class BillingError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const providerId = (v: unknown, prefix: "pay_" | "order_"): v is string => typeof v === "string" && v.startsWith(prefix) && /^[A-Za-z0-9_]{5,100}$/.test(v);
export function readBillingConfig(env: Record<string, string | undefined>): BillingConfig | null {
  if (env.LEADFLOW_BILLING_MODE !== "razorpay-test" || !/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID || "") || (env.RAZORPAY_KEY_SECRET?.length || 0) < 16 || (env.RAZORPAY_WEBHOOK_SECRET?.length || 0) < 24) return null;
  try {
    const parsed: unknown = JSON.parse(env.LEADFLOW_TEST_PLAN_CATALOGUE || "");
    if (!object(parsed) || Object.keys(parsed).length < 1 || Object.keys(parsed).length > 10) return null;
    const plans: Record<string, TestPlan> = {};
    for (const [id, plan] of Object.entries(parsed)) {
      if (!/^[a-z][a-z0-9_-]{0,39}$/.test(id) || !object(plan) || !Number.isSafeInteger(plan.amount) || Number(plan.amount) < 100 || Number(plan.amount) > 10000000 || plan.currency !== "INR" || !Number.isSafeInteger(plan.durationDays) || Number(plan.durationDays) < 1 || Number(plan.durationDays) > 366) return null;
      plans[id] = { amount: Number(plan.amount), currency: "INR", durationDays: Number(plan.durationDays) };
    }
    return { keyId: env.RAZORPAY_KEY_ID!, keySecret: env.RAZORPAY_KEY_SECRET!, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET!, plans };
  } catch { return null; }
}
export function signatureValid(message: string | Buffer, signature: unknown, secret: string) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
function ensurePayment(payment: ProviderPayment, order: LedgerOrder, paymentId: string) {
  if (payment.id !== paymentId || payment.order_id !== order.providerOrderId || payment.amount !== order.amount || payment.currency !== order.currency || !Number.isSafeInteger(payment.amount_refunded) || payment.amount_refunded < 0 || payment.amount_refunded > payment.amount) throw new BillingError("Payment does not match the stored order.");
}
export async function checkout(owner: Owner | null, body: unknown, config: BillingConfig, provider: Provider, store: Store) {
  if (!owner) throw new BillingError("Sign in with a verified business account.", 401);
  if (!object(body) || typeof body.plan !== "string" || Object.keys(body).some(k => k !== "plan") || !Object.hasOwn(config.plans, body.plan)) throw new BillingError("Choose a configured test plan.");
  const plan = config.plans[body.plan];
  const id = randomUUID();
  // Durable atomic throttle is consumed before provider work; failed attempts stay counted.
  await store.reserveAttempt(owner, id);
  const created = await provider.createOrder({ amount: plan.amount, currency: plan.currency, receipt: id });
  if (!providerId(created.id, "order_") || created.amount !== plan.amount || created.currency !== plan.currency || created.receipt !== id) throw new BillingError("Test payment provider returned an invalid order.", 502);
  await store.createOrder({ ...owner, ...plan, id, providerOrderId: created.id, plan: body.plan });
  return { mode: "test", ledgerOrderId: id, orderId: created.id, amount: plan.amount, currency: plan.currency, keyId: config.keyId };
}
export async function verify(owner: Owner | null, body: unknown, config: BillingConfig, provider: Provider, store: Store) {
  if (!owner) throw new BillingError("Sign in with a verified business account.", 401);
  if (!object(body) || typeof body.ledgerOrderId !== "string" || !providerId(body.paymentId, "pay_")) throw new BillingError("Invalid payment confirmation.");
  const order = await store.getOrder(body.ledgerOrderId);
  if (!order || order.userId !== owner.userId || order.slug !== owner.slug) throw new BillingError("Order unavailable.", 404);
  if (!signatureValid(`${order.providerOrderId}|${body.paymentId}`, body.signature, config.keySecret)) throw new BillingError("Invalid payment signature.");
  const payment = await provider.fetchPayment(body.paymentId);
  ensurePayment(payment, order, body.paymentId);
  if (payment.captured !== true || payment.status !== "captured" || payment.amount_refunded !== 0) throw new BillingError("Payment has not been captured without refund.", 409);
  const result = await store.process({ eventId: `verify:${payment.id}`, bodyHash: createHash("sha256").update(`${order.id}|${payment.id}|captured`).digest("hex"), orderId: order.providerOrderId, paymentId: payment.id, amount: payment.amount, currency: payment.currency, state: "captured" });
  return { mode: "test", status: result };
}
export async function webhook(raw: Buffer, signature: unknown, eventId: unknown, config: BillingConfig, provider: Provider, store: Store) {
  if (!signatureValid(raw, signature, config.webhookSecret)) throw new BillingError("Invalid webhook signature.");
  if (typeof eventId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) throw new BillingError("Missing or invalid webhook event ID.");
  let event: unknown;
  try { event = JSON.parse(raw.toString("utf8")); } catch { throw new BillingError("Invalid webhook payload."); }
  if (!object(event) || typeof event.event !== "string") throw new BillingError("Invalid webhook payload.");
  const disputed = ["payment.dispute.created", "payment.dispute.lost", "payment.dispute.under_review", "payment.dispute.action_required"].includes(event.event);
  if (!["payment.captured", "refund.processed"].includes(event.event) && !disputed) return { mode: "test", status: "ignored" };
  if (!object(event.payload)) throw new BillingError("Invalid webhook payment.");
  const item = disputed ? event.payload.dispute : event.event === "refund.processed" ? event.payload.refund : event.payload.payment;
  if (!object(item) || !object(item.entity)) throw new BillingError("Invalid webhook payment.");
  const paymentId = disputed || event.event === "refund.processed" ? item.entity.payment_id : item.entity.id;
  if (!providerId(paymentId, "pay_")) throw new BillingError("Invalid webhook payment.");
  const payment = await provider.fetchPayment(paymentId);
  if (!providerId(payment.order_id, "order_")) throw new BillingError("Invalid provider order.");
  // Lookups are by exact provider order ID; the database independently checks every field.
  if (payment.id !== paymentId || !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.currency !== "INR" || !Number.isSafeInteger(payment.amount_refunded) || payment.amount_refunded < 0 || payment.amount_refunded > payment.amount) throw new BillingError("Invalid provider payment.");
  let state: "captured" | "revoked";
  if (disputed || payment.amount_refunded > 0) state = "revoked";
  else if (event.event === "refund.processed") throw new BillingError("Refund not confirmed by provider.", 409);
  else if (payment.captured === true && payment.status === "captured") state = "captured";
  else throw new BillingError("Payment capture not confirmed by provider.", 409);
  const result = await store.process({ eventId: `webhook:${eventId}`, bodyHash: createHash("sha256").update(raw).digest("hex"), orderId: payment.order_id, paymentId, amount: payment.amount, currency: payment.currency, state });
  return { mode: "test", status: result };
}

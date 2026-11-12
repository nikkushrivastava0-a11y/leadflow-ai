import { LEAD_SOURCES, LEAD_STATUSES } from "./types.ts";

type ManualLeadFields = {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
};

export type ValidatedManualLead = {
  name: string;
  email: string | null;
  phone: string | null;
  source: (typeof LEAD_SOURCES)[number];
  notes: string | null;
};

export type LeadInputResult =
  | { ok: true; value: ValidatedManualLead }
  | { ok: false; reason: string };

const leadUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validLeadId(input: unknown): input is string {
  return typeof input === "string" && leadUuid.test(input);
}

export function validLeadStatus(input: unknown): input is (typeof LEAD_STATUSES)[number] {
  return typeof input === "string" && LEAD_STATUSES.some((s) => s === input);
}

export function validateManualLead(input: ManualLeadFields): LeadInputResult {
  if (!input || typeof input !== "object") {
    return { ok: false, reason: "Missing lead details." };
  }

  const fields = ["name", "email", "phone", "source", "notes"] as const;
  if (fields.some((field) => typeof input[field] !== "string")) {
    return { ok: false, reason: "Invalid lead details." };
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const source = input.source.trim();
  const notes = input.notes.trim();
  if (name.length < 2 || name.length > 100) {
    return { ok: false, reason: "Name must have 2–100 characters." };
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, reason: "Enter a valid email address." };
  }
  if (phone && (phone.length > 25 ||
      !/^[+\d\s()\-]+$/.test(phone) ||
      phone.replace(/\D/g, "").length < 10 ||
      phone.replace(/\D/g, "").length > 15)) {
    return { ok: false, reason: "Enter a valid phone number." };
  }
  if (!email && !phone) {
    return { ok: false, reason: "Provide at least an email or phone number." };
  }
  if (!LEAD_SOURCES.some((allowed) => allowed === source)) {
    return { ok: false, reason: "Invalid enquiry source." };
  }
  if (notes.length > 1000) {
    return { ok: false, reason: "Notes must not exceed 1000 characters." };
  }

  return {
    ok: true,
    value: { name, email: email || null, phone: phone || null,
      source: source as (typeof LEAD_SOURCES)[number], notes: notes || null },
  };
}

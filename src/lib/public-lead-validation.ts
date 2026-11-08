/**
 * Pure validation for the public enquiry endpoint.
 * A public form is inherently untrusted. Never rely on HTML required fields
 * alone: direct requests can bypass browser validation.
 */
export type PublicLeadInput = {
  name: unknown;
  email: unknown;
  phone: unknown;
};

export type PublicLeadValidation =
  | { ok: true; value: { name: string; email: string; phone: string } }
  | { ok: false; error: "invalid_name" | "invalid_email" | "invalid_phone" };

export function isValidClientSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 2 &&
    value.length <= 64 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function validatePublicLead(
  input: PublicLeadInput
): PublicLeadValidation {
  // Reject files and non-text fields, rather than casting to string.
  if (typeof input.name !== "string") {
    return { ok: false, error: "invalid_name" };
  }
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "invalid_name" };
  }

  if (typeof input.email !== "string") {
    return { ok: false, error: "invalid_email" };
  }
  const email = input.email.trim().toLowerCase();
  if (
    email.length < 5 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, error: "invalid_email" };
  }

  if (typeof input.phone !== "string") {
    return { ok: false, error: "invalid_phone" };
  }
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (
    phone.length > 24 ||
    !/^\+?[0-9()\s-]+$/.test(phone) ||
    digits.length < 10 ||
    digits.length > 15
  ) {
    return { ok: false, error: "invalid_phone" };
  }

  return { ok: true, value: { name, email, phone } };
}

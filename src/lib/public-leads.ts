export type ValidatedPublicLead = {
  name: string;
  email: string;
  phone: string;
};

export type ValidationResult =
  | { ok: true; value: ValidatedPublicLead }
  | { ok: false };

function readText(form: FormData, key: string): string | null {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : null;
}

export function isValidBusinessSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug);
}

/** Pure parsing: no database calls and no trust in browser-side required flags. */
export function validatePublicLead(form: FormData): ValidationResult {
  const name = readText(form, "name");
  const email = readText(form, "email");
  const phone = readText(form, "phone");

  if (
    !name ||
    name.length < 2 ||
    name.length > 100 ||
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !phone ||
    phone.length > 25 ||
    !/^[+\d\s()\-]+$/.test(phone)
  ) return { ok: false };

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
    },
  };
}

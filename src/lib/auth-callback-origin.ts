/**
 * Safe auth callback destinations. Never redirect to a Host header,
 * x-forwarded-host, "next" query param or arbitrary request URL directly.
 *
 * Request origin is used ONLY when it matches a pre-approved deployment
 * origin from server-controlled environment or the known canonical host.
 */
const PRODUCTION_ORIGIN = "https://leadflow-ai-flame.vercel.app";

type AuthHostConfig = {
  callbackOrigin?: string;
  vercelUrl?: string;
  environment?: string;
};

export function safeHttpsOrigin(candidate: string | undefined): string | null {
  if (!candidate || candidate.length > 400) return null;
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      !parsed.hostname ||
      parsed.port
    ) return null;

    return parsed.origin;
  } catch {
    return null;
  }
}

function deploymentOrigin(host: string | undefined): string | null {
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/i.test(host)) return null;
  // Vercel deployments only, never accept generic or attacker-controlled hosts.
  if (!host.toLowerCase().endsWith(".vercel.app")) return null;
  return safeHttpsOrigin("https://" + host);
}

export function trustedAuthOrigin(
  rawRequestUrl: string,
  config: AuthHostConfig = {}
): string {
  const production = PRODUCTION_ORIGIN;
  const explicit = safeHttpsOrigin(config.callbackOrigin);
  const deployed = deploymentOrigin(config.vercelUrl);
  const local = config.environment === "development"
    ? "http://localhost:3000"
    : null;

  const trusted = [explicit, production, deployed, local].filter(
    (value): value is string => Boolean(value)
  );

  // The caller's URL may have originated from a forwarded Host header,
  // so it can only select from this strict list, not introduce a new origin.
  try {
    const received = new URL(rawRequestUrl).origin;
    if (trusted.includes(received)) return received;
  } catch {
    // Malformed request URL: canonical fallback below.
  }

  return explicit || local || production;
}

export function callbackRedirectUrl(
  rawRequestUrl: string,
  success: boolean,
  config: AuthHostConfig = {}
): URL {
  return new URL(
    success ? "/dashboard" : "/auth/auth-code-error",
    trustedAuthOrigin(rawRequestUrl, config)
  );
}

export function extractPkceCode(rawRequestUrl: string): string | null {
  try {
    const code = new URL(rawRequestUrl).searchParams.get("code");
    // Never accept empty, multiline, or unbounded auth codes.
    return code && code.length <= 4096 && /^[\x21-\x7E]+$/.test(code)
      ? code
      : null;
  } catch {
    return null;
  }
}

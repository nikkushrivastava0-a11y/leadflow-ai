export type AuthSubmissionResult = {
  error: { message: string } | null;
  data: {
    user?: unknown | null;
    session?: unknown | null;
  } | null;
};

export type AuthSubmissionOutcome =
  | { state: "failed"; message: string }
  | { state: "verify_email"; message: string }
  | { state: "signed_in"; message: string };

/**
 * Supabase can create a user without providing a session when email
 * confirmation is required. Never claim the person has logged in if
 * there is no session. Avoid exposing account-existence signals.
 *
 * Business membership is separate from Auth signup. A real Supabase
 * session does NOT imply a provisioned business in the clients table.
 */
export function classifyAuthSubmission(
  mode: "sign_up" | "sign_in",
  outcome: AuthSubmissionResult
): AuthSubmissionOutcome {
  if (outcome.error) {
    return {
      state: "failed",
      message: outcome.error.message || "Authentication could not be completed.",
    };
  }

  if (outcome.data?.session && outcome.data?.user) {
    return {
      state: "signed_in",
      message: mode === "sign_up"
        ? "Account created and signed in. Your business workspace may still require setup."
        : "Signed in successfully.",
    };
  }

  if (mode === "sign_up" && outcome.data?.user) {
    return {
      state: "verify_email",
      message:
        "If this email can register, follow the verification link in your inbox. " +
        "You will not be signed in until verification succeeds.",
    };
  }

  return {
    state: "failed",
    message: mode === "sign_in"
      ? "Sign-in could not be confirmed. Please try again."
      : "Registration could not be confirmed. Please try again.",
  };
}

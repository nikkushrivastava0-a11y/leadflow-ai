import assert from "node:assert/strict";
import test from "node:test";
import { classifyAuthSubmission } from "../src/lib/auth-submission-outcome.ts";

const syntheticUser = { id: "synthetic-uuid", email: "owner@example.test" };
const syntheticSession = { access_token: "synthetic-test-token" };

test("signup with no session never claims the account is signed in", () => {
  const outcome = classifyAuthSubmission("sign_up", {
    error: null,
    data: { user: syntheticUser, session: null },
  });

  assert.equal(outcome.state, "verify_email");
  assert.match(outcome.message, /verification link/i);
  assert.doesNotMatch(outcome.message, /logged in|signed in successfully/i);
});

test("signup with session succeeds but does not promise a business profile", () => {
  const outcome = classifyAuthSubmission("sign_up", {
    error: null,
    data: { user: syntheticUser, session: syntheticSession },
  });

  assert.equal(outcome.state, "signed_in");
  assert.match(outcome.message, /workspace.*setup/i);
});

test("signup failure never falsely reports success", () => {
  const outcome = classifyAuthSubmission("sign_up", {
    error: { message: "Email signups are disabled" },
    data: { user: syntheticUser, session: syntheticSession },
  });

  assert.deepEqual(outcome, {
    state: "failed",
    message: "Email signups are disabled",
  });
});

test("sign-in must have both a user and a session", () => {
  const noSession = classifyAuthSubmission("sign_in", {
    error: null,
    data: { user: syntheticUser, session: null },
  });
  assert.equal(noSession.state, "failed");

  const noUser = classifyAuthSubmission("sign_in", {
    error: null,
    data: { user: null, session: syntheticSession },
  });
  assert.equal(noUser.state, "failed");

  const both = classifyAuthSubmission("sign_in", {
    error: null,
    data: { user: syntheticUser, session: syntheticSession },
  });
  assert.equal(both.state, "signed_in");
});

test("an empty or malformed successful response fails closed", () => {
  for (const mode of ["sign_up", "sign_in"]) {
    const outcome = classifyAuthSubmission(mode, {
      error: null,
      data: { user: null, session: null },
    });
    assert.equal(outcome.state, "failed");
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { makePitchDrafts, cliMain } from "../scripts/pitch-writer.mjs";

const example = {
  business: "Demo Coaching Academy",
  verifiedFact: "the academy offers JEE preparation batches",
  niche: "coaching",
  channel: "all",
};

test("creates three truthful, permission-based outreach drafts", () => {
  const d = makePitchDrafts(example);
  assert.match(d.whatsapp, /Demo Coaching Academy/);
  assert.match(d.whatsapp, /JEE preparation batches/);
  assert.match(d.whatsapp, /Would two quick questions be okay/);
  assert.match(d.linkedin, /Would you be open/);
  assert.ok(d.linkedin.length < 300);
  assert.match(d.email.subject, /enquiry workflow question/);
  assert.match(d.email.body, /10-minute chat/);
  assert.doesNotMatch(JSON.stringify(d), /guarantee|30% more|automatically sent/i);
});

test("channel selection returns only the requested draft", () => {
  const d = makePitchDrafts({ ...example, channel: "email" });
  assert.deepEqual(Object.keys(d), ["email"]);
});

test("rejects private contact data even when presented as a public fact", () => {
  for (const verifiedFact of [
    "owner email is private.person@example.com",
    "the owner number is +91 98765 43210",
  ]) {
    assert.throws(
      () => makePitchDrafts({ ...example, verifiedFact }),
      /personal contact details/
    );
  }
});

test("prevents unsupported channels, niches, multiline input and invalid lengths", () => {
  assert.throws(
    () => makePitchDrafts({ ...example, channel: "send" }),
    /Unsupported channel/
  );
  assert.throws(
    () => makePitchDrafts({ ...example, niche: "enterprise" }),
    /Unsupported niche/
  );
  assert.throws(
    () => makePitchDrafts({ ...example, verifiedFact: "test\nnew line" }),
    /unsupported characters/
  );
  assert.throws(
    () => makePitchDrafts({ ...example, business: " " }),
    /Business name/
  );
});

test("CLI produces drafts but never uses network or messaging APIs", () => {
  const output = cliMain([
    "--business", "Demo Coaching Academy",
    "--verified-fact", "the academy offers JEE preparation batches",
    "--channel", "whatsapp",
  ]);
  assert.match(output, /DRAFTS ONLY \(NO MESSAGES SENT\)/);
  assert.match(output, /WHATSAPP/);
  assert.doesNotMatch(output, /EMAIL SUBJECT/);
});

test("help text makes approval and source verification explicit", () => {
  assert.match(cliMain(["--help"]), /Verify public facts/);
  assert.match(cliMain(["--help"]), /No prospect is contacted/);
});

import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const CHANNELS = ["all", "whatsapp", "linkedin", "email"];
const NICHES = ["coaching", "gym", "salon", "other"];

const NICHE_WORDS = {
  coaching: "coaching centres",
  gym: "gyms",
  salon: "salons",
  other: "local businesses",
};

function clean(value, max, label) {
  if (typeof value !== "string") throw new Error(label + " is required.");
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > max) {
    throw new Error(label + " must have 2–" + max + " characters.");
  }
  if (/[\r\n<>]/.test(value)) throw new Error(label + " contains unsupported characters.");
  return trimmed;
}

/**
 * Pure draft composer. No API calls, contacts, scraping, queue or messaging.
 * A public business fact must be genuinely verified by the human operator.
 */
export function makePitchDrafts({
  business,
  verifiedFact,
  niche = "coaching",
  channel = "all",
}) {
  const name = clean(business, 90, "Business name");
  const fact = clean(verifiedFact, 180, "Verified public fact");

  if (!NICHES.includes(niche)) throw new Error("Unsupported niche.");
  if (!CHANNELS.includes(channel)) throw new Error("Unsupported channel.");

  // Avoid accidentally incorporating an individual prospect's private data
  // into an output that may later be shared.
  if (/\b[\w.+-]+@[\w.-]+\.\w+\b/.test(fact) ||
      /(?:\+?\d[\d\s()-]{8,}\d)/.test(fact)) {
    throw new Error("Verified public fact must not contain personal contact details.");
  }

  const audience = NICHE_WORDS[niche];
  const line = "I noticed " + fact.replace(/[.!?]+$/, "") + ".";
  const opener = "Hi " + name + " team, " + line;
  const product = "I'm building LeadFlow AI, an early-stage tool focused on organising enquiries and follow-ups for " + audience + ".";
  const question = "How do you currently track new enquiries and callbacks?";

  const whatsapp = [
    opener,
    "",
    product,
    "I'm speaking with a few local businesses to understand their process. " +
      question + " Would two quick questions be okay?",
  ].join("\n");

  const linkedin = [
    "Hi " + name + " team, " + line,
    "I'm learning how " + audience + " track enquiries and follow-ups. " +
      "Would you be open to two quick questions?",
  ].join(" ");

  const email = {
    subject: "Quick enquiry workflow question — " + name,
    body: [
      "Hello " + name + " team,",
      "",
      line,
      "",
      product,
      "I'm researching the day-to-day process before offering anyone a pilot.",
      question,
      "",
      "If it is relevant, I'd be happy to share a short walkthrough once the product is verified.",
      "Would a 10-minute chat work for someone who handles admissions or enquiries?",
      "",
      "Best,",
      "LeadFlow AI",
    ].join("\n"),
  };

  const all = { whatsapp, linkedin, email };
  return channel === "all" ? all : { [channel]: all[channel] };
}

export function cliMain(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      business: { type: "string" },
      "verified-fact": { type: "string" },
      niche: { type: "string", default: "coaching" },
      channel: { type: "string", default: "all" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    return [
      "LeadFlow AI — permission-based pitch drafts (never sent)",
      "Usage:",
      'node scripts/pitch-writer.mjs --business "Example Coaching" --verified-fact "the centre advertises JEE batches" --channel all',
      "",
      "Optional: --niche coaching|gym|salon|other, --channel all|whatsapp|linkedin|email",
      "Verify public facts, human review and recipient consent before sending. No prospect is contacted by this tool.",
    ].join("\n");
  }

  const drafts = makePitchDrafts({
    business: values.business,
    verifiedFact: values["verified-fact"],
    niche: values.niche,
    channel: values.channel,
  });

  const lines = [
    "LEADFLOW AI — DRAFTS ONLY (NO MESSAGES SENT)",
    "Fact verification and permission to contact must be checked by a human.",
    "",
  ];
  if (drafts.whatsapp) lines.push("WHATSAPP / BUSINESS DM", drafts.whatsapp, "");
  if (drafts.linkedin) lines.push("LINKEDIN", drafts.linkedin, "");
  if (drafts.email) lines.push("EMAIL SUBJECT", drafts.email.subject, "", "EMAIL BODY", drafts.email.body, "");
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(cliMain());
  } catch (error) {
    console.error("Unable to compose draft:", error instanceof Error ? error.message : "Unknown issue");
    process.exitCode = 1;
  }
}

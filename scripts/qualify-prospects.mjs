#!/usr/bin/env node
// Offline, no-network qualification of founder-supplied public business records.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const allowed = new Set(["businessName", "area", "service", "officialUrl", "sourceUrl", "verifiedAt"]);
const clean = (v) => typeof v === "string" ? v.trim() : "";
function publicHttps(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      !["localhost", "127.0.0.1", "::1"].includes(host) &&
      !host.endsWith(".local") && !host.endsWith(".internal") &&
      !/^10\.|^127\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(host) && host.includes(".");
  } catch { return false; }
}
export function qualifyProspects(records) {
  if (!Array.isArray(records) || records.length > 200) throw new Error("Expected an array of at most 200 public business records");
  const seen = new Set();
  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`Invalid record at index ${index}`);
    const unexpected = Object.keys(record).filter(k => !allowed.has(k));
    if (unexpected.length) throw new Error(`Disallowed fields at index ${index}: ${unexpected.join(", ")}; no personal contact data permitted`);
    const name = clean(record.businessName), area = clean(record.area), service = clean(record.service);
    if (!name || name.length > 120 || area.length > 120 || service.length > 120) throw new Error(`Invalid business fields at index ${index}`);
    const key = `${name.toLowerCase().replace(/\s+/g, " ")}|${area.toLowerCase().replace(/\s+/g, " ")}`;
    const duplicate = seen.has(key);
    seen.add(key);
    const sourceVerified = publicHttps(clean(record.sourceUrl));
    const officialSite = publicHttps(clean(record.officialUrl));
    const recent = /^\d{4}-\d{2}-\d{2}$/.test(clean(record.verifiedAt)) &&
      !Number.isNaN(Date.parse(record.verifiedAt)) &&
      Date.parse(record.verifiedAt) <= Date.now() &&
      Date.now() - Date.parse(record.verifiedAt) <= 30 * 86400000;
    return { businessName: name, area, service, officialUrl: officialSite ? record.officialUrl : null,
      sourceUrl: sourceVerified ? record.sourceUrl : null, verifiedAt: recent ? record.verifiedAt : null,
      status: duplicate ? "duplicate" : sourceVerified && recent ? "needs_founder_review" : "needs_source_verification",
      reasons: [...(duplicate ? ["duplicate_business_and_area"] : []),
        ...(!sourceVerified ? ["missing_public_https_source"] : []),
        ...(!recent ? ["source_not_verified_in_last_30_days"] : []),
        ...(record.officialUrl && !officialSite ? ["invalid_official_https_url"] : [])] };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: node scripts/qualify-prospects.mjs <local-public-businesses.json>");
    const raw = readFileSync(process.argv[2], "utf8");
    if (Buffer.byteLength(raw) > 200_000) throw new Error("Input file exceeds 200 KB");
    process.stdout.write(JSON.stringify(qualifyProspects(JSON.parse(raw)), null, 2) + "\n");
  } catch (error) { process.stderr.write(`Qualification failed: ${error.message}\n`); process.exitCode = 1; }
}

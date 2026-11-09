// Offline, synthetic-only coaching centre landing page generator.
// No network calls, no publishing, no data persistence.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected a business object");
  const allowed = ["name", "city", "courses", "contactUrl", "description"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw new Error("Unexpected business field");
  for (const field of ["name", "city", "description"]) {
    if (typeof input[field] !== "string" || !input[field].trim() || input[field].length > 240) {
      throw new Error("Invalid " + field);
    }
  }
  if (!Array.isArray(input.courses) || input.courses.length < 1 || input.courses.length > 8 ||
      input.courses.some((item) => typeof item !== "string" || !item.trim() || item.length > 80)) {
    throw new Error("Invalid courses");
  }
  if (typeof input.contactUrl !== "string") throw new Error("Invalid contact URL");
  let url;
  try { url = new URL(input.contactUrl); } catch { throw new Error("Invalid contact URL"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
    throw new Error("Contact URL must be public HTTPS");
  }
  return url.href;
}
function generateSite(input) {
  const contactUrl = validate(input);
  const name = escapeHtml(input.name.trim());
  const city = escapeHtml(input.city.trim());
  const description = escapeHtml(input.description.trim());
  const courses = input.courses.map((course) => "<li>" + escapeHtml(course.trim()) + "</li>").join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${name} | Courses in ${city}</title>
<meta name="description" content="${description}">
<style>
:root{font-family:system-ui,sans-serif;color:#19212d;background:#f8f5ed}
body{margin:0}header,main,footer{max-width:960px;margin:auto;padding:24px}
header{border-bottom:1px solid #c9c6bc}main{padding-top:64px;padding-bottom:64px}
h1{font-size:clamp(2.5rem,7vw,5rem);line-height:1.05;max-width:16ch}
p{font-size:1.15rem;line-height:1.7;max-width:65ch}
a.cta{display:inline-block;background:#174cff;color:white;padding:14px 22px;border-radius:4px}
li{margin:12px 0}a:focus-visible{outline:3px solid #111;outline-offset:4px}
</style>
</head>
<body>
<header><strong>${name}</strong></header>
<main>
<p>Coaching in ${city}</p>
<h1>Find the right course for your next step.</h1>
<p>${description}</p>
<h2>Courses</h2>
<ul>${courses}</ul>
<p><a class="cta" href="${escapeHtml(contactUrl)}" rel="noopener noreferrer">Enquire with ${name}</a></p>
</main>
<footer><small>Draft preview. Course details and contact link require owner approval before publication.</small></footer>
</body>
</html>`;
}
module.exports = { generateSite, validate };
if (require.main === module) {
  const fs = require("node:fs");
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error("Usage: node scripts/coaching-site-generator.cjs input.json output.html");
    process.exitCode = 1;
  } else {
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    fs.writeFileSync(outputPath, generateSite(input), { flag: "wx" });
    console.log("Created local noindex draft: " + outputPath);
  }
}

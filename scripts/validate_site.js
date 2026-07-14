const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith(".html")).sort();
const contentPages = htmlFiles.filter((file) => !file.startsWith("google"));

function localPathFor(file, reference) {
  const clean = reference.split(/[?#]/)[0];
  if (clean.startsWith("/")) return path.join(ROOT, clean.slice(1));
  return path.resolve(ROOT, path.dirname(file), clean.replace(/^\.\//, ""));
}

for (const file of contentPages) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const required of [/<title>[^<]+<\/title>/i, /name=["']description["']/i, /rel=["']canonical["']/i]) {
    if (!required.test(html)) errors.push(`${file} is missing required SEO metadata`);
  }

  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (!reference || reference.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const local = localPathFor(file, reference);
    if (!fs.existsSync(local)) errors.push(`${file} references missing file ${reference}`);
  }

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${file} contains invalid JSON-LD: ${error.message}`);
    }
  }

  for (const form of html.matchAll(/<form\b[\s\S]*?<\/form>/gi)) {
    if (!/\bdata-lead-form\b/i.test(form[0])) continue;
    const requiredCount = (form[0].match(/\brequired\b/g) || []).length;
    if (requiredCount > 7) errors.push(`${file} lead form has ${requiredCount} required fields; maximum is 7`);
    if (!/name=["']fax_number["']/i.test(form[0])) errors.push(`${file} lead form is missing the honeypot field`);
    if (!/name=["']email["'][^>]*type=["']email["']|type=["']email["'][^>]*name=["']email["']/i.test(form[0])) {
      errors.push(`${file} lead form is missing the optional typed email field`);
    }
    if (!/name=["']whatsapp_consent["'][^>]*required|required[^>]*name=["']whatsapp_consent["']/i.test(form[0])) {
      errors.push(`${file} lead form is missing required WhatsApp consent`);
    }
  }
}

const formScript = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
for (const marker of ["minimumFormFillMs", "fax_number", "form_started_at"]) {
  if (!formScript.includes(marker)) errors.push(`script.js is missing form anti-spam marker ${marker}`);
}

const webhookScript = fs.readFileSync(path.join(ROOT, "scripts/google_apps_script_lead_webhook.gs"), "utf8");
for (const marker of ["validatePayload_", "consumeRateLimit_", "safeSheetValue_", "LockService.getScriptLock"]) {
  if (!webhookScript.includes(marker)) errors.push(`Apps Script webhook is missing server control ${marker}`);
}
if (!/const DEFAULT_CRM_WEBHOOK_TOKEN\s*=\s*(["'])\1;/.test(webhookScript)) {
  errors.push("Apps Script webhook must not contain a default CRM token");
}

const garmentPage = fs.readFileSync(path.join(ROOT, "garments.html"), "utf8");
if (!/AI style references, not production photography/i.test(garmentPage)) {
  errors.push("garments.html must retain the AI-image disclosure");
}
if (/\bARTIE\b|artieshop|detail\.1688\.com/i.test(garmentPage)) {
  errors.push("garments.html exposes a source brand or source marketplace URL");
}

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const sitemapUrls = (sitemap.match(/<loc>/g) || []).length;
if (sitemapUrls < 7) errors.push("sitemap.xml contains fewer than seven public URLs");

const result = {
  ok: errors.length === 0,
  htmlFiles: contentPages.length,
  sitemapUrls,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

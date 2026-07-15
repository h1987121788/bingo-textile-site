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
for (const marker of [
  "minimumFormFillMs",
  "fax_number",
  "form_started_at",
  "submissionId",
  "bingo-crm-result",
  "CRM confirmation timed out"
]) {
  if (!formScript.includes(marker)) errors.push(`script.js is missing form anti-spam marker ${marker}`);
}
if (!formScript.includes("isCrmTestMode") || !/is_test:\s*isCrmTestMode/.test(formScript)) {
  errors.push("script.js must mark explicit crm_test=1 submissions as is_test");
}
if (/mode:\s*["']no-cors["']|navigator\.sendBeacon/.test(formScript)) {
  errors.push("script.js must not claim CRM success through an unreadable no-cors or beacon request");
}
if (!formScript.includes("isTrustedCrmResponseOrigin") || /event\.source\s*!==\s*iframe\.contentWindow/.test(formScript)) {
  errors.push("script.js must validate the Apps Script sandbox origin instead of requiring the outer iframe as event.source");
}

const webhookScript = fs.readFileSync(path.join(ROOT, "scripts/google_apps_script_lead_webhook.gs"), "utf8");
for (const marker of [
  "validatePayload_",
  "consumeRateLimit_",
  "safeSheetValue_",
  "LockService.getScriptLock",
  "isDuplicateSubmission_",
  "responseOutput_",
  "HtmlService.XFrameOptionsMode.ALLOWALL"
]) {
  if (!webhookScript.includes(marker)) errors.push(`Apps Script webhook is missing server control ${marker}`);
}
if (!/'is_test'/.test(webhookScript) || !/normalizeBooleanText_/.test(webhookScript)) {
  errors.push("Apps Script webhook must persist the is_test CRM field");
}
if (!/const DEFAULT_CRM_WEBHOOK_TOKEN\s*=\s*(["'])\1;/.test(webhookScript)) {
  errors.push("Apps Script webhook must not contain a default CRM token");
}

const garmentPage = fs.readFileSync(path.join(ROOT, "garments.html"), "utf8");
if (!/AI style references, not production photography/i.test(garmentPage)) {
  errors.push("garments.html must retain the AI-image disclosure");
}

const marketingConfig = fs.readFileSync(path.join(ROOT, "config/marketing-config.js"), "utf8");
if (!/ga4MeasurementId:\s*["']G-[A-Z0-9]{6,}["']/.test(marketingConfig) || /G-XXXXXXXXXX/.test(marketingConfig)) {
  errors.push("config/marketing-config.js is missing a configured GA4 Measurement ID");
}
if (!/metaPixelId:\s*["']\d{10,20}["']/.test(marketingConfig) || /PIXEL_ID/.test(marketingConfig)) {
  errors.push("config/marketing-config.js is missing a configured Meta Pixel ID");
}
const trackingScript = fs.readFileSync(path.join(ROOT, "scripts/marketing-tracking.js"), "utf8");
for (const eventName of ["generate_lead", "contact_whatsapp", "product_interest"]) {
  if (!trackingScript.includes(eventName) || !formScript.includes(eventName)) {
    errors.push(`marketing event wiring is missing ${eventName}`);
  }
}
if (/\bARTIE\b|artieshop|detail\.1688\.com/i.test(garmentPage)) {
  errors.push("garments.html exposes a source brand or source marketplace URL");
}
if (!/garment-review-status\.js/i.test(garmentPage)) {
  errors.push("garments.html must load the public garment review gate");
}
if (/public USD prices|USD settlement prices|compare base-style prices/i.test(garmentPage)) {
  errors.push("garments.html advertises unverified public prices");
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

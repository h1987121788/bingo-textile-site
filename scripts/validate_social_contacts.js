#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "config", "social-contact.json");
const envPath = path.join(root, ".env.social.local");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

function normalizeWebsite(value) {
  return String(value || "").trim().replace(/\/+$/, "") + "/";
}

function normalizeWhatsAppBase(value) {
  return String(value || "").trim().split("?")[0].replace(/\/+$/, "");
}

function fail(messages) {
  console.error("CONTACT CHECK FAILED");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

const contact = readJson(configPath);
const env = readEnv(envPath);
const errors = [];

if (contact.confirmed !== true) {
  errors.push("config/social-contact.json is not confirmed.");
}

for (const field of [
  "company",
  "contactPerson",
  "website",
  "whatsappUrl",
  "whatsappDisplay",
  "phoneDisplay",
  "wechat",
  "email",
]) {
  if (!String(contact[field] || "").trim()) {
    errors.push(`${field} is missing in config/social-contact.json.`);
  }
}

if (contact.website && normalizeWebsite(contact.website) !== "https://www.bingofabric.com/") {
  errors.push("website must be https://www.bingofabric.com/.");
}

if (contact.whatsappUrl && !/^https:\/\/wa\.me\/[1-9]\d{7,14}(\?.*)?$/.test(contact.whatsappUrl)) {
  errors.push("whatsappUrl must be a valid https://wa.me/ link with country code.");
}

if (contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) {
  errors.push("email is not a valid email address.");
}

if (contact.productIntroAttachment) {
  const attachment = contact.productIntroAttachment;
  const attachmentPath = path.resolve(root, String(attachment.path || ""));
  if (!String(attachment.path || "").trim()) {
    errors.push("productIntroAttachment.path is missing in config/social-contact.json.");
  } else if (!fs.existsSync(attachmentPath)) {
    errors.push(`productIntroAttachment.path does not exist: ${attachment.path}`);
  }
  if (!String(attachment.filename || "").trim()) {
    errors.push("productIntroAttachment.filename is missing in config/social-contact.json.");
  }
  if (!String(attachment.contentType || "").trim()) {
    errors.push("productIntroAttachment.contentType is missing in config/social-contact.json.");
  }
}

if (env.SITE_URL && normalizeWebsite(env.SITE_URL) !== normalizeWebsite(contact.website)) {
  errors.push("SITE_URL in .env.social.local does not match config/social-contact.json.");
}

if (
  env.WA_BUSINESS_URL &&
  contact.whatsappUrl &&
  normalizeWhatsAppBase(env.WA_BUSINESS_URL) !== normalizeWhatsAppBase(contact.whatsappUrl)
) {
  errors.push("WA_BUSINESS_URL in .env.social.local does not match config/social-contact.json.");
}

if (errors.length) fail(errors);

console.log("CONTACT CHECK PASSED");
console.log(`Company: ${contact.company}`);
console.log(`Contact person: ${contact.contactPerson}`);
console.log(`Website: ${normalizeWebsite(contact.website)}`);
console.log(`WhatsApp: ${contact.whatsappDisplay} (${normalizeWhatsAppBase(contact.whatsappUrl)})`);
console.log(`Phone: ${contact.phoneDisplay}`);
console.log(`WeChat: ${contact.wechat}`);
console.log(`Email: ${contact.email}`);
if (contact.productIntroAttachment) {
  console.log(`Product intro: ${contact.productIntroAttachment.path}`);
}

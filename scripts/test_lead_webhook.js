const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.resolve(__dirname, "google_apps_script_lead_webhook.gs");
const source = fs.readFileSync(sourcePath, "utf8");
const cacheValues = new Map();
const context = {
  console,
  Session: { getScriptTimeZone: () => "UTC" },
  Utilities: {
    Charset: { UTF_8: "UTF_8" },
    DigestAlgorithm: { SHA_256: "SHA_256" },
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString("base64url"),
    computeDigest: (_algorithm, value) => Array.from(Buffer.from(String(value), "utf8")),
    formatDate: (date) => date.toISOString().slice(0, 10)
  },
  CacheService: {
    getScriptCache: () => ({
      get: (key) => cacheValues.get(key) || null,
      put: (key, value) => cacheValues.set(key, value)
    })
  }
};

vm.createContext(context);
vm.runInContext(
  `${source}\n;globalThis.__webhookTest = { validatePayload_, consumeRateLimit_, safeSheetValue_, rowFromPayload_ };`,
  context,
  { filename: sourcePath }
);

const { validatePayload_, consumeRateLimit_, safeSheetValue_, rowFromPayload_ } = context.__webhookTest;
const submittedAt = new Date();
const formStartedAt = new Date(submittedAt.getTime() - 5000);
const basePayload = {
  submittedAt: submittedAt.toISOString(),
  form_started_at: formStartedAt.toISOString(),
  service_type: "Private label garments",
  brand: "Example Streetwear",
  country: "United States",
  garment_type: "Heavyweight / boxy T-shirt",
  reference: "BG-GM-001",
  quantity: "100 pieces per color",
  whatsapp: "+1 202 555 0123",
  whatsapp_consent: "Yes"
};

assert.strictEqual(validatePayload_(basePayload).ok, true);
assert.strictEqual(
  validatePayload_({ ...basePayload, service_type: "", garment_type: "", page_topic: "Heavyweight T-shirt fabric" }).ok,
  true
);
assert.strictEqual(validatePayload_({ ...basePayload, fax_number: "123" }).field, "fax_number");
assert.strictEqual(
  validatePayload_({ ...basePayload, form_started_at: new Date(submittedAt.getTime() - 500).toISOString() }).field,
  "form_timing"
);
assert.strictEqual(validatePayload_({ ...basePayload, whatsapp: "123" }).field, "whatsapp");
assert.strictEqual(validatePayload_({ ...basePayload, email: "not-an-email" }).field, "email");
assert.strictEqual(safeSheetValue_("=IMPORTXML(\"https://example.com\")"), "'=IMPORTXML(\"https://example.com\")");

const row = rowFromPayload_(
  { ...basePayload, brand: "+SUM(1,1)", crmSubmitToken: "must-not-be-stored" },
  new Date(),
  ["brand", "crmSubmitToken", "fax_number"]
);
assert.deepStrictEqual(Array.from(row), ["'+SUM(1,1)", "", ""]);

const rateChecks = Array.from({ length: 6 }, () => consumeRateLimit_(basePayload));
assert.deepStrictEqual(rateChecks, [true, true, true, true, true, false]);

console.log(JSON.stringify({ ok: true, tests: 9 }, null, 2));

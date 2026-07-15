const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.resolve(__dirname, "google_apps_script_lead_webhook.gs");
const source = fs.readFileSync(sourcePath, "utf8");
const cacheValues = new Map();
const appendedRows = [];
const testSheet = {
  appendRow: (row) => appendedRows.push(Array.from(row)),
  getLastRow: () => appendedRows.length,
  getLastColumn: () => appendedRows[0]?.length || 0,
  getRange: (row, column, rowCount = 1, columnCount = 1) => ({
    getValues: () => appendedRows
      .slice(row - 1, row - 1 + rowCount)
      .map((values) => values.slice(column - 1, column - 1 + columnCount)),
    setValues: () => {},
    createTextFinder: (searchValue) => {
      const finder = {
        matchEntireCell() { return finder; },
        findNext() {
          const values = appendedRows
            .slice(row - 1, row - 1 + rowCount)
            .map((entry) => entry[column - 1]);
          return values.includes(searchValue) ? { found: true } : null;
        }
      };
      return finder;
    }
  })
};
const testSpreadsheet = {
  getSheetByName: () => testSheet,
  insertSheet: () => testSheet,
  getId: () => "test-sheet-id"
};
const context = {
  console,
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => key === "CRM_WEBHOOK_TOKEN" ? "test-token" : "test-sheet-id",
      setProperty: () => {}
    })
  },
  SpreadsheetApp: {
    openById: () => testSpreadsheet,
    create: () => testSpreadsheet
  },
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
  },
  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: "ALLOWALL" },
    createHtmlOutput: (html) => ({
      html,
      frameMode: "",
      setXFrameOptionsMode(mode) {
        this.frameMode = mode;
        return this;
      }
    })
  },
  ContentService: {
    MimeType: { JSON: "JSON" },
    createTextOutput: (text) => ({
      text,
      setMimeType() { return this; }
    })
  }
};

vm.createContext(context);
vm.runInContext(
  `${source}\n;globalThis.__webhookTest = { doPost, validatePayload_, consumeRateLimit_, safeSheetValue_, rowFromPayload_, parsePayload_, responseOutput_, isDuplicateSubmission_, rememberSubmission_ };`,
  context,
  { filename: sourcePath }
);

const {
  validatePayload_,
  doPost,
  consumeRateLimit_,
  safeSheetValue_,
  rowFromPayload_,
  parsePayload_,
  responseOutput_,
  isDuplicateSubmission_,
  rememberSubmission_
} = context.__webhookTest;
const submittedAt = new Date();
const formStartedAt = new Date(submittedAt.getTime() - 5000);
const basePayload = {
  submissionId: "test_submission_20260715",
  responseMode: "iframe",
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
assert.strictEqual(validatePayload_({ ...basePayload, submissionId: "" }).field, "submissionId");
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

assert.strictEqual(
  JSON.stringify(parsePayload_({ parameter: { payload: JSON.stringify(basePayload) } })),
  JSON.stringify(basePayload)
);
assert.strictEqual(isDuplicateSubmission_(basePayload), false);
rememberSubmission_(basePayload);
assert.strictEqual(isDuplicateSubmission_(basePayload), true);

const iframeResponse = responseOutput_(basePayload, { ok: true });
assert.strictEqual(iframeResponse.frameMode, "ALLOWALL");
assert.match(iframeResponse.html, /bingo-crm-result/);
assert.match(iframeResponse.html, /test_submission_20260715/);

const fullPayload = {
  ...basePayload,
  submissionId: "full_submission_20260715",
  crmSubmitToken: "test-token",
  brand: "Full Flow Brand",
  whatsapp: "+1 415 555 0199"
};
const acceptedResponse = doPost({ parameter: { payload: JSON.stringify(fullPayload) } });
assert.strictEqual(appendedRows.length, 2);
assert.match(acceptedResponse.html, /"ok":true/);

const duplicateResponse = doPost({ parameter: { payload: JSON.stringify(fullPayload) } });
assert.strictEqual(appendedRows.length, 2);
assert.match(duplicateResponse.html, /"duplicate":true/);

cacheValues.clear();
const durableDuplicateResponse = doPost({ parameter: { payload: JSON.stringify(fullPayload) } });
assert.strictEqual(appendedRows.length, 2);
assert.match(durableDuplicateResponse.html, /"duplicate":true/);

console.log(JSON.stringify({ ok: true, tests: 22 }, null, 2));

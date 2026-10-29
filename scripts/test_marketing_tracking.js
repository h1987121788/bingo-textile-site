const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const loadedScripts = [];
const firstScript = {
  parentNode: {
    insertBefore(script) {
      loadedScripts.push(script.src);
    },
  },
};
const context = {
  console,
  URLSearchParams,
  localStorage: {
    getItem: (key) => (key === "bingoMarketingConsent" ? "accept" : null),
    setItem: () => {},
  },
  document: {
    head: {
      appendChild(script) {
        loadedScripts.push(script.src);
      },
    },
    body: { appendChild: () => {} },
    createElement: () => ({ setAttribute() {} }),
    getElementsByTagName: () => [firstScript],
    querySelector: () => null,
    addEventListener: (eventName, callback) => {
      if (eventName === "DOMContentLoaded") callback();
    },
  },
};
context.window = context;
vm.createContext(context);

const configSource = fs.readFileSync(path.resolve(__dirname, "../config/marketing-config.js"), "utf8");
const trackingSource = fs.readFileSync(path.resolve(__dirname, "marketing-tracking.js"), "utf8");
vm.runInContext(configSource, context, { filename: "marketing-config.js" });
vm.runInContext(trackingSource, context, { filename: "marketing-tracking.js" });

assert.strictEqual(context.bingoMarketingConfig.ga4MeasurementId, "G-4W8V1TXJGH");
assert.strictEqual(context.bingoMarketingConfig.metaPixelId, "2194479431494146");
assert(loadedScripts.some((url) => url.includes("googletagmanager.com/gtag/js?id=G-4W8V1TXJGH")));
assert(loadedScripts.some((url) => url.includes("connect.facebook.net/en_US/fbevents.js")));

context.bingoTrackEvent("product_interest", { product_interest: "BG-GM-001" });
context.bingoTrackEvent("contact_whatsapp", { link_url: "https://wa.me/8613827719946" });
context.bingoTrackEvent("generate_lead", { form_name: "Garment wholesale inquiry" });

const gaCalls = context.dataLayer.map((entry) => Array.from(entry));
assert(gaCalls.some((entry) => entry[0] === "config" && entry[1] === "G-4W8V1TXJGH"));
assert(gaCalls.some((entry) => entry[0] === "event" && entry[1] === "product_interest"));
assert(gaCalls.some((entry) => entry[0] === "event" && entry[1] === "contact_whatsapp"));
assert(gaCalls.some((entry) => entry[0] === "event" && entry[1] === "generate_lead"));

const metaCalls = context.fbq.queue.map((entry) => Array.from(entry));
assert(metaCalls.some((entry) => entry[0] === "init" && entry[1] === "2194479431494146"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "ViewContent"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "Contact"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "Lead"));

const stored = new Map();
function visit(search, storageAvailable = true) {
  const scripts = [];
  const target = {
    URLSearchParams,
    location: { hostname: "www.bingofabric.com", protocol: "https:", search },
    bingoMarketingConfig: { ga4MeasurementId: "G-TEST", metaPixelId: "123", requireMarketingConsent: false },
    sessionStorage: {
      getItem: (key) => { if (!storageAvailable) throw new Error("blocked"); return stored.get(key) || null; },
      setItem: (key, value) => { if (!storageAvailable) throw new Error("blocked"); stored.set(key, value); },
      removeItem: (key) => { if (!storageAvailable) throw new Error("blocked"); stored.delete(key); },
    },
    localStorage: { getItem: () => "accept" },
    document: {
      head: { appendChild: (script) => scripts.push(script.src) },
      body: { appendChild: () => {} },
      createElement: () => ({ setAttribute() {} }),
      getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => scripts.push(script.src) } }],
      querySelector: () => null,
      addEventListener: (name, callback) => { if (name === "DOMContentLoaded") callback(); },
    },
  };
  target.window = target;
  vm.createContext(target);
  vm.runInContext(trackingSource, target);
  target.bingoTrackEvent("generate_lead", {});
  target.bingoTrackEvent("contact_whatsapp", {});
  return { target, scripts };
}
const testVisit = visit("?crm_test=1");
assert.strictEqual(testVisit.target.bingoCrmTestMode, true);
assert.deepStrictEqual(testVisit.scripts, []);
assert.strictEqual(testVisit.target.gtag, undefined);
assert.strictEqual(testVisit.target.fbq, undefined);
const continuedVisit = visit("");
assert.strictEqual(continuedVisit.target.bingoCrmTestMode, true);
assert.deepStrictEqual(continuedVisit.scripts, []);
const normalVisit = visit("?crm_test=0");
assert.strictEqual(normalVisit.target.bingoCrmTestMode, false);
assert.strictEqual(normalVisit.scripts.length, 2);
assert(normalVisit.target.dataLayer.some((entry) => entry[0] === "event" && entry[1] === "generate_lead"));
assert(normalVisit.target.fbq.queue.some((entry) => entry[0] === "track" && entry[1] === "Lead"));
const blockedStorage = visit("?crm_test=1", false);
assert.strictEqual(blockedStorage.target.bingoCrmTestMode, true);
assert.deepStrictEqual(blockedStorage.scripts, []);

console.log(JSON.stringify({ ok: true, tests: 24 }, null, 2));

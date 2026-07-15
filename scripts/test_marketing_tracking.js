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
assert.strictEqual(context.bingoMarketingConfig.metaPixelId, "2252311015604509");
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
assert(metaCalls.some((entry) => entry[0] === "init" && entry[1] === "2252311015604509"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "ViewContent"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "Contact"));
assert(metaCalls.some((entry) => entry[0] === "track" && entry[1] === "Lead"));

console.log(JSON.stringify({ ok: true, tests: 12 }, null, 2));

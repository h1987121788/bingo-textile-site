const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const scriptPath = path.resolve(__dirname, "discover_public_outreach_candidates.cjs");
const source = fs.readFileSync(scriptPath, "utf8");
const { independentEvidenceFromOfficialPages } = require("./discover_public_outreach_candidates.cjs");

assert(source.includes("https://api.search.brave.com/res/v1/web/search"));
assert(source.includes('source: "brave-search-api+official-brand-pages"'));
assert(source.includes('approvalStatus: "pending_review"'));
assert(!source.includes("https://search.brave.com/search"));
assert(!source.includes("https://duckduckgo.com/html"));
assert(!source.includes("https://www.bing.com/search"));
assert(!source.includes("https://r.jina.ai/"));
assert(!source.includes('independentBrandEvidence: "official direct-to-consumer apparel storefront'));

const independentEvidence = independentEvidenceFromOfficialPages(
  new Map([
    [
      "https://northstar.example/pages/about",
      "Northstar is an independently owned streetwear brand producing limited apparel collections.",
    ],
  ])
);
assert.match(independentEvidence, /northstar\.example\/pages\/about/);
assert.match(independentEvidence, /independently owned streetwear brand/i);
assert.strictEqual(
  independentEvidenceFromOfficialPages(
    new Map([["https://northstar.example/pages/about", "Shop our latest streetwear collection and contact our store."]])
  ),
  ""
);

const noKey = spawnSync(process.execPath, [scriptPath, "--env", path.join(__dirname, "missing.env")], {
  cwd: path.resolve(__dirname, ".."),
  encoding: "utf8",
  env: { ...process.env, BRAVE_SEARCH_API_KEY: "" },
});
assert.notStrictEqual(noKey.status, 0);
assert.match(`${noKey.stdout}\n${noKey.stderr}`, /BRAVE_SEARCH_API_KEY is required/);

const overLimit = spawnSync(process.execPath, [scriptPath, "--limit", "6"], {
  cwd: path.resolve(__dirname, ".."),
  encoding: "utf8",
  env: { ...process.env, BRAVE_SEARCH_API_KEY: "test-only" },
});
assert.notStrictEqual(overLimit.status, 0);
assert.match(`${overLimit.stdout}\n${overLimit.stderr}`, /cannot exceed the daily review limit of 5/);

console.log(JSON.stringify({ ok: true, tests: 15 }, null, 2));

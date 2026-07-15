const assert = require("assert");
const {
  dedupeCandidates,
  isSuppressed,
  qualityIssues,
  selectQualifiedCandidates,
  targetCountry,
} = require("./outreach_quality.cjs");
const {
  filterCandidatesByQuality,
  filterCandidatesByTargetMarket,
  selectDailyLeads,
} = require("./b2b_outreach.js");

function candidate(index = 1, overrides = {}) {
  const host = `northstar-${index}.com`;
  return {
    brandName: `Northstar ${index}`,
    country: "United States",
    website: `https://${host}`,
    businessEmail: `wholesale@${host}`,
    productType: "independent streetwear hoodies and heavyweight tees",
    recentSignal: "new drop and limited collection",
    sourceLinks: [`https://${host}/collections/new`],
    checkedPages: [`https://${host}/pages/contact`],
    emailSource: `https://${host}/pages/contact`,
    contactSource: `https://${host}/pages/contact`,
    independentBrandEvidence: `https://${host}/pages/about | Official About page states this is an independently owned streetwear brand.`,
    personalEmailAllowed: "false",
    approvalStatus: "pending_review",
    score: 82,
    ...overrides,
  };
}

assert.strictEqual(targetCountry("USA"), "United States");
assert.strictEqual(targetCountry("Japan"), "Japan");
assert.strictEqual(targetCountry("India"), "");

const valid = candidate();
assert.deepStrictEqual(qualityIssues(valid), []);
assert.deepStrictEqual(qualityIssues(valid, { requireApproval: true }), ["manual_approval"]);
assert.deepStrictEqual(qualityIssues({ ...valid, approvalStatus: "approved" }, { requireApproval: true }), []);
assert(qualityIssues({ ...valid, country: "India" }).includes("target_country"));
assert(qualityIssues({ ...valid, website: "https://instagram.com/northstar" }).includes("official_website"));
assert(qualityIssues({ ...valid, businessEmail: "not-an-email" }).includes("public_business_email"));
assert(
  qualityIssues({
    ...valid,
    independentBrandEvidence: "",
    productType: "streetwear hoodies and heavyweight tees",
    recentSignal: "",
  }).includes("independent_brand")
);
assert(
  qualityIssues({
    ...valid,
    independentBrandEvidence: "official direct-to-consumer apparel storefront",
  }).includes("independent_brand")
);
assert(qualityIssues({ ...valid, sourceLinks: [], checkedPages: [], emailSource: "", contactSource: "" }).includes("source_evidence"));
assert(qualityIssues({ ...valid, emailSource: "", contactSource: "" }).includes("public_email_evidence"));

const freeEmail = candidate(2, {
  businessEmail: "northstarbrand@gmail.com",
  personalEmailAllowed: "true",
});
assert.deepStrictEqual(qualityIssues(freeEmail), []);
assert(qualityIssues({ ...freeEmail, personalEmailAllowed: "false" }).includes("public_business_email"));

const suppression = new Set(["northstar-1.com"]);
assert.strictEqual(isSuppressed(valid, suppression), true);
assert(qualityIssues(valid, { suppression }).includes("suppressed"));

const duplicate = { ...valid, businessEmail: "hello@northstar-1.com" };
assert.strictEqual(dedupeCandidates([valid, duplicate]).length, 1);

const sixCandidates = Array.from({ length: 6 }, (_value, index) => candidate(index + 1));
assert.strictEqual(selectQualifiedCandidates(sixCandidates, 5).length, 5);
assert.strictEqual(selectDailyLeads(sixCandidates, 5).length, 5);
assert.strictEqual(selectDailyLeads([valid, { ...candidate(7), businessEmail: "" }], 5).length, 1);

const marketResult = filterCandidatesByTargetMarket([valid, { ...candidate(8), country: "India" }]);
assert.strictEqual(marketResult.accepted.length, 1);
assert.strictEqual(marketResult.rejected.length, 1);

const qualityResult = filterCandidatesByQuality([valid, { ...candidate(9), emailSource: "", contactSource: "" }]);
assert.strictEqual(qualityResult.accepted.length, 1);
assert.strictEqual(qualityResult.rejected.length, 1);

console.log(JSON.stringify({ ok: true, tests: 25 }, null, 2));

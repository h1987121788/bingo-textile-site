const TARGET_COUNTRIES = new Map([
  ["united states", "United States"],
  ["united states of america", "United States"],
  ["usa", "United States"],
  ["us", "United States"],
  ["canada", "Canada"],
  ["united kingdom", "United Kingdom"],
  ["uk", "United Kingdom"],
  ["great britain", "United Kingdom"],
  ["england", "United Kingdom"],
  ["scotland", "United Kingdom"],
  ["wales", "United Kingdom"],
  ["ireland", "Ireland"],
  ["germany", "Germany"],
  ["france", "France"],
  ["netherlands", "Netherlands"],
  ["italy", "Italy"],
  ["spain", "Spain"],
  ["belgium", "Belgium"],
  ["switzerland", "Switzerland"],
  ["austria", "Austria"],
  ["portugal", "Portugal"],
  ["poland", "Poland"],
  ["czech republic", "Czech Republic"],
  ["czechia", "Czech Republic"],
  ["greece", "Greece"],
  ["luxembourg", "Luxembourg"],
  ["iceland", "Iceland"],
  ["sweden", "Sweden"],
  ["denmark", "Denmark"],
  ["norway", "Norway"],
  ["finland", "Finland"],
  ["japan", "Japan"],
  ["south korea", "South Korea"],
  ["korea", "South Korea"],
  ["singapore", "Singapore"],
  ["australia", "Australia"],
  ["new zealand", "New Zealand"],
]);

const BLOCKED_WEBSITE_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "threads.net",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "reddit.com",
  "amazon.com",
  "etsy.com",
  "ebay.com",
  "alibaba.com",
  "aliexpress.com",
  "temu.com",
  "shein.com",
  "stockx.com",
  "grailed.com",
  "ssense.com",
  "farfetch.com",
  "endclothing.com",
  "shopify.com",
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "brave.com",
  "example.com",
];

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "qq.com",
]);

const REJECT_EMAIL_LOCAL_PARTS = [
  "noreply",
  "no-reply",
  "donotreply",
  "privacy",
  "abuse",
  "legal",
  "postmaster",
  "webmaster",
  "newsletter",
  "unsubscribe",
];

const NON_BRAND_PATTERN =
  /\b(manufacturer|manufacturing|factory|supplier|sourcing agent|marketing agency|e-?commerce agency|web design|software|saas|marketplace|print on demand|wholesale blanks?|blank apparel|uniform supplier|lead generation|contact database|email finder|scraper|crawler)\b/i;
const APPAREL_PATTERN =
  /\b(streetwear|apparel|clothing|fashion|garment|hoodie|sweatshirt|sweatpants|joggers?|t-?shirts?|tees?|jersey|polo|rugby|collection|lookbook|menswear|womenswear|unisex)\b/i;
const INDEPENDENT_BRAND_PATTERN =
  /\b(independent(?:ly)?(?: owned| operated| run)?|founder[- ]led|owner[- ]operated|family[- ]owned|woman[- ]owned|women[- ]owned|minority[- ]owned|black[- ]owned|latino[- ]owned|asian[- ]owned|small[- ]business|self[- ]funded|bootstrapped)\b/i;

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/[?].*$/, "")
    .replace(/[^\w.%+-@]/g, "");
}

function toUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function canonicalHost(value) {
  const url = value instanceof URL ? value : toUrl(value);
  return url ? url.hostname.toLowerCase().replace(/^www\./, "") : String(value || "").toLowerCase().replace(/^www\./, "");
}

function registrableDomain(hostValue) {
  const host = canonicalHost(hostValue);
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  if (/^(co|com|net|org|ac)\.[a-z]{2}$/.test(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

function countryKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function targetCountry(value) {
  return TARGET_COUNTRIES.get(countryKey(value)) || "";
}

function isBlockedHost(host) {
  return BLOCKED_WEBSITE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function officialWebsite(candidate) {
  const url = toUrl(candidate && candidate.website);
  if (!url) return null;
  const host = canonicalHost(url);
  if (!host.includes(".") || isBlockedHost(host)) return null;
  return { url, host, domain: registrableDomain(host) };
}

function normalizeLinks(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[;\n]+/);
  return values.map((item) => toUrl(item)).filter(Boolean);
}

function evidenceLinks(candidate) {
  return [
    ...normalizeLinks(candidate && candidate.sourceLinks),
    ...normalizeLinks(candidate && candidate.checkedPages),
    ...normalizeLinks(candidate && candidate.emailSource),
    ...normalizeLinks(candidate && candidate.contactSource),
  ];
}

function linksToOfficialWebsite(candidate) {
  const website = officialWebsite(candidate);
  if (!website) return [];
  return evidenceLinks(candidate).filter((url) => registrableDomain(url.hostname) === website.domain);
}

function hasIndependentBrandEvidence(candidate) {
  const explicitEvidence = cleanText(candidate && candidate.independentBrandEvidence);
  const website = officialWebsite(candidate);
  if (!website || !explicitEvidence || !INDEPENDENT_BRAND_PATTERN.test(explicitEvidence)) return false;

  const evidenceUrls = explicitEvidence.match(/https?:\/\/[^\s|]+/gi) || [];
  const hasOfficialEvidenceUrl = evidenceUrls
    .map((value) => toUrl(value))
    .filter(Boolean)
    .some((url) => registrableDomain(url.hostname) === website.domain);
  if (!hasOfficialEvidenceUrl) return false;

  const text = [
    candidate && candidate.brandName,
    candidate && candidate.productType,
    candidate && candidate.recentSignal,
    candidate && candidate.notes,
    candidate && candidate.whyFit,
    candidate && candidate.profileText,
    explicitEvidence,
  ]
    .map(cleanText)
    .join("\n");

  if (!cleanText(candidate && candidate.brandName) || !cleanText(candidate && candidate.productType)) return false;
  if (NON_BRAND_PATTERN.test(text)) return false;
  return APPAREL_PATTERN.test(text);
}

function publicBusinessEmail(candidate) {
  const email = cleanEmail(candidate && candidate.businessEmail);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "";
  const [localPart, emailHost] = email.split("@");
  const compactLocal = localPart.replace(/[^a-z]/g, "");
  if (REJECT_EMAIL_LOCAL_PARTS.some((part) => compactLocal.includes(part.replace(/[^a-z]/g, "")))) return "";

  const website = officialWebsite(candidate);
  if (!website) return "";
  if (FREE_EMAIL_DOMAINS.has(emailHost)) {
    return /^(1|true|yes|y|on)$/i.test(cleanText(candidate && candidate.personalEmailAllowed)) ? email : "";
  }
  return registrableDomain(emailHost) === website.domain ? email : "";
}

function hasPublicEmailEvidence(candidate) {
  const website = officialWebsite(candidate);
  if (!website) return false;
  const sources = [candidate && candidate.emailSource, candidate && candidate.contactSource]
    .map(toUrl)
    .filter(Boolean);
  return sources.some((url) => registrableDomain(url.hostname) === website.domain);
}

function suppressionKeys(candidate) {
  const keys = new Set();
  const email = cleanEmail(candidate && candidate.businessEmail);
  const website = officialWebsite(candidate);
  if (email) {
    keys.add(email);
    const emailHost = email.split("@")[1];
    if (emailHost) {
      keys.add(emailHost);
      keys.add(registrableDomain(emailHost));
    }
  }
  if (website) {
    keys.add(website.host);
    keys.add(website.domain);
  }
  return [...keys].filter(Boolean);
}

function isSuppressed(candidate, suppression) {
  if (!suppression || typeof suppression.has !== "function") return false;
  return suppressionKeys(candidate).some((key) => suppression.has(String(key).toLowerCase()));
}

function qualityIssues(candidate, options = {}) {
  const issues = [];
  if (!targetCountry(candidate && candidate.country)) issues.push("target_country");
  if (!officialWebsite(candidate)) issues.push("official_website");
  if (!hasIndependentBrandEvidence(candidate)) issues.push("independent_brand");
  if (!publicBusinessEmail(candidate)) issues.push("public_business_email");
  if (linksToOfficialWebsite(candidate).length === 0) issues.push("source_evidence");
  if (!hasPublicEmailEvidence(candidate)) issues.push("public_email_evidence");
  if (isSuppressed(candidate, options.suppression)) issues.push("suppressed");
  if (options.requireApproval && cleanText(candidate && candidate.approvalStatus).toLowerCase() !== "approved") {
    issues.push("manual_approval");
  }
  return [...new Set(issues)];
}

function candidateIdentity(candidate) {
  const website = officialWebsite(candidate);
  if (website) return `domain:${website.domain}`;
  const email = cleanEmail(candidate && candidate.businessEmail);
  if (email) return `email:${email}`;
  const brand = cleanText(candidate && candidate.brandName).toLowerCase();
  return brand ? `brand:${brand}` : "";
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates || []) {
    const key = candidateIdentity(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function selectQualifiedCandidates(candidates, limit, options = {}) {
  return dedupeCandidates(candidates)
    .filter((candidate) => qualityIssues(candidate, options).length === 0)
    .slice(0, Math.max(0, Number(limit) || 0));
}

module.exports = {
  candidateIdentity,
  dedupeCandidates,
  evidenceLinks,
  hasIndependentBrandEvidence,
  hasPublicEmailEvidence,
  isSuppressed,
  linksToOfficialWebsite,
  officialWebsite,
  publicBusinessEmail,
  qualityIssues,
  selectQualifiedCandidates,
  suppressionKeys,
  targetCountry,
};

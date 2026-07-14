#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_LEAD_FILE = "data/outreach_leads.csv";
const DEFAULT_SUPPRESSION_FILE = "data/outreach_suppression.csv";
const DEFAULT_REPORT_DIR = "reports";

const TARGET_COUNTRIES = new Set([
  "united states",
  "united states of america",
  "usa",
  "us",
  "canada",
  "united kingdom",
  "uk",
  "great britain",
  "england",
  "scotland",
  "wales",
  "ireland",
  "germany",
  "france",
  "netherlands",
  "italy",
  "spain",
  "belgium",
  "switzerland",
  "austria",
  "portugal",
  "poland",
  "czech republic",
  "czechia",
  "greece",
  "luxembourg",
  "iceland",
  "sweden",
  "denmark",
  "norway",
  "finland",
  "europe",
  "european union",
  "eu",
  "japan",
  "south korea",
  "korea",
  "singapore",
  "australia",
  "new zealand",
]);

const AFRICAN_COUNTRIES = new Set(
  [
    "Algeria",
    "Angola",
    "Benin",
    "Botswana",
    "Burkina Faso",
    "Burundi",
    "Cameroon",
    "Cape Verde",
    "Central African Republic",
    "Chad",
    "Comoros",
    "Congo",
    "Democratic Republic of the Congo",
    "Djibouti",
    "Egypt",
    "Equatorial Guinea",
    "Eritrea",
    "Eswatini",
    "Ethiopia",
    "Gabon",
    "Gambia",
    "Ghana",
    "Guinea",
    "Guinea-Bissau",
    "Ivory Coast",
    "Kenya",
    "Lesotho",
    "Liberia",
    "Libya",
    "Madagascar",
    "Malawi",
    "Mali",
    "Mauritania",
    "Mauritius",
    "Morocco",
    "Mozambique",
    "Namibia",
    "Niger",
    "Nigeria",
    "Rwanda",
    "Sao Tome and Principe",
    "Senegal",
    "Seychelles",
    "Sierra Leone",
    "Somalia",
    "South Africa",
    "South Sudan",
    "Sudan",
    "Tanzania",
    "Togo",
    "Tunisia",
    "Uganda",
    "Zambia",
    "Zimbabwe",
  ].map(normalizeKey)
);

const COUNTRY_ALIASES = new Map([
  ["usa", "united states"],
  ["us", "united states"],
  ["u.s.", "united states"],
  ["u.s.a.", "united states"],
  ["united states of america", "united states"],
  ["uk", "united kingdom"],
  ["great britain", "united kingdom"],
  ["korea", "south korea"],
]);

const LOW_QUALITY_RULES = [
  {
    id: "media_or_publisher",
    pattern: /\b(newspaper|magazine|media company|radio|podcast|press outlet|journal|editorial)\b/i,
    reason: "media/publisher, not a direct apparel brand buyer",
  },
  {
    id: "resale_or_marketplace",
    pattern: /\b(preowned|pre-owned|resale|reseller|consignment|thrift|vintage shop|marketplace|sneaker marketplace|stadium goods)\b/i,
    reason: "resale/marketplace signal, low private-label garment development fit",
  },
  {
    id: "generic_retail_or_boutique",
    pattern: /\b(boutique|closet|cabana|ski shop|gift shop|general store|department store|stockist)\b/i,
    reason: "generic retail/boutique signal without clear streetwear production fit",
  },
  {
    id: "service_vendor_not_brand",
    pattern: /\b(screen ?print|printing|embroidery|dtg|print on demand|dropship|web design|marketing agency|directory)\b/i,
    reason: "service/vendor/directory, not a target brand buyer",
  },
  {
    id: "non_apparel_core",
    pattern: /\b(supplements|nutrition|food|jewelry only|bags only|shoes only|sneakers only|equipment)\b/i,
    reason: "non-apparel core business signal",
  },
];

const STRONG_BRAND_SIGNAL =
  /\b(streetwear|activewear|hoodie|hoodies|sweatshirt|sweatshirts|heavyweight|tee|t-shirt|t shirt|jersey|french terry|rib|garment dye|cut and sew|collection|drop|apparel brand|clothing brand)\b/i;

function parseArgs(argv) {
  const args = {
    leadFile: DEFAULT_LEAD_FILE,
    suppressionFile: DEFAULT_SUPPRESSION_FILE,
    reportDir: DEFAULT_REPORT_DIR,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--lead-file") args.leadFile = requireValue(argv, ++i, arg);
    else if (arg === "--suppression-file") args.suppressionFile = requireValue(argv, ++i, arg);
    else if (arg === "--report-dir") args.reportDir = requireValue(argv, ++i, arg);
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/cleanup_outreach_leads.js [--dry-run]");
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return args;
}

function requireValue(argv, index, flag) {
  if (!argv[index]) throw new Error(`${flag} requires a value`);
  return argv[index];
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCountry(value) {
  const key = normalizeKey(value);
  return COUNTRY_ALIASES.get(key) || key;
}

function classifyLead(row) {
  const reasons = [];
  const country = normalizeCountry(row.country);

  if (!country || country === "unknown" || country === "global") {
    reasons.push({ id: "unknown_or_global_market", reason: "market is unknown/global and needs manual confirmation" });
  } else if (country === "india") {
    reasons.push({ id: "excluded_market_india", reason: "India is outside the fixed target market" });
  } else if (AFRICAN_COUNTRIES.has(country)) {
    reasons.push({ id: "excluded_market_africa", reason: `${row.country} is outside the fixed target market` });
  } else if (!isTargetCountryValue(country)) {
    reasons.push({ id: "outside_target_market", reason: `${row.country} is outside the fixed target market` });
  }

  const text = [
    row.brandName,
    row.website,
    row.businessEmail,
    row.productType,
    row.priceTier,
    row.recentSignal,
    row.whyFit,
    row.searchQuery,
    row.notes,
    row.sourceLinks,
    row.checkedPages,
  ].join("\n");

  for (const rule of LOW_QUALITY_RULES) {
    if (!rule.pattern.test(text)) continue;
    if (rule.id === "generic_retail_or_boutique" && STRONG_BRAND_SIGNAL.test(text)) continue;
    if (rule.id === "non_apparel_core" && STRONG_BRAND_SIGNAL.test(text)) continue;
    reasons.push({ id: rule.id, reason: rule.reason });
  }

  if (hasMediaOnlySignal(row)) {
    reasons.push({ id: "media_or_publisher", reason: "media/press contact or publisher signal, not a sourcing buyer" });
  }

  return reasons;
}

function isTargetCountryValue(country) {
  if (TARGET_COUNTRIES.has(country)) return true;
  const parts = country
    .split(/[\/,;&]+|\band\b/i)
    .map((part) => normalizeCountry(part))
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => TARGET_COUNTRIES.has(part));
}

function hasMediaOnlySignal(row) {
  const email = String(row.businessEmail || "").trim().toLowerCase();
  if (/^(press|media|pr|editorial|collabs?|partnerships?)@/.test(email)) return true;

  const brandText = [row.brandName, row.website, row.productType, row.whyFit, row.notes].join("\n");
  if (/\b(news|newspaper|magazine|media|radio|podcast|journal|editorial)\b/i.test(brandText)) {
    return !STRONG_BRAND_SIGNAL.test(brandText);
  }
  return false;
}

function suppressionKeysFor(row) {
  const keys = [];
  const email = String(row.businessEmail || "").trim().toLowerCase();
  if (email) {
    keys.push(email);
    const emailDomain = email.split("@")[1];
    if (emailDomain && !isCommonMailboxDomain(emailDomain)) keys.push(emailDomain);
  }
  const websiteDomain = domainFromUrl(row.website);
  if (websiteDomain) keys.push(websiteDomain);
  return unique(keys);
}

function isCommonMailboxDomain(domain) {
  return /^(gmail|outlook|hotmail|yahoo|icloud|aol|qq)\./i.test(domain);
}

function domainFromUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function appendCleanupNote(row, reasons, stamp) {
  const note = `[cleanup ${stamp.slice(0, 10)}: ${reasons.map((item) => item.id).join("; ")}]`;
  const current = String(row.notes || "");
  return current.includes(note) ? current : [current, note].filter(Boolean).join(" ");
}

function readSuppression(file) {
  const existing = new Set();
  if (!fs.existsSync(file)) return existing;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const value = line.split(",")[0].trim().toLowerCase();
    if (value && !value.startsWith("#")) existing.add(value);
  }
  return existing;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift() || [];
  return {
    header,
    records: rows
      .filter((items) => items.some((item) => String(item || "").trim()))
      .map((items) => Object.fromEntries(header.map((name, index) => [name, items[index] || ""]))),
  };
}

function writeCsv(file, header, records) {
  const lines = [header.join(",")];
  for (const record of records) {
    lines.push(header.map((field) => csvEscape(record[field] || "")).join(","));
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

function csvEscape(value) {
  const text = String(value || "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function localStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function buildMarkdown(report) {
  const lines = [
    `# Outreach Lead Cleanup - ${report.runAt}`,
    "",
    `- Dry run: ${report.dryRun ? "yes" : "no"}`,
    `- Input leads: ${report.totalRows}`,
    `- Marked do-not-contact: ${report.markedRows}`,
    `- Suppression keys added: ${report.suppressionAdded}`,
    `- Lead backup: ${report.backups.leads || "not written"}`,
    `- Suppression backup: ${report.backups.suppression || "not written"}`,
    "",
    "## Reason counts",
  ];
  for (const [reason, count] of Object.entries(report.reasonCounts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  lines.push("", "## Sample marked rows");
  for (const item of report.marked.slice(0, 50)) {
    lines.push(
      `- ${item.brandName || "(no brand)"} | ${item.country || "unknown"} | ${
        item.businessEmail || item.website || "no contact"
      } | ${item.reasons.join("; ")}`
    );
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const stamp = localStamp();
  const runAt = new Date().toISOString();
  const leadCsv = parseCsv(fs.readFileSync(args.leadFile, "utf8"));
  const suppression = readSuppression(args.suppressionFile);
  const reasonCounts = {};
  const marked = [];
  const suppressionLines = [];

  for (const row of leadCsv.records) {
    const reasons = classifyLead(row);
    if (!reasons.length) continue;

    row.doNotContact = "true";
    row.status = "do_not_contact";
    row.notes = appendCleanupNote(row, reasons, stamp);
    marked.push({
      leadId: row.leadId,
      brandName: row.brandName,
      country: row.country,
      website: row.website,
      businessEmail: row.businessEmail,
      reasons: reasons.map((item) => item.id),
    });

    for (const reason of reasons) {
      reasonCounts[reason.id] = (reasonCounts[reason.id] || 0) + 1;
    }
    for (const key of suppressionKeysFor(row)) {
      if (suppression.has(key)) continue;
      suppression.add(key);
      suppressionLines.push([key, reasons.map((item) => item.id).join(";"), runAt].map(csvEscape).join(","));
    }
  }

  const report = {
    ok: true,
    dryRun: args.dryRun,
    runAt,
    totalRows: leadCsv.records.length,
    markedRows: marked.length,
    suppressionAdded: suppressionLines.length,
    reasonCounts,
    files: {
      leads: args.leadFile,
      suppression: args.suppressionFile,
    },
    backups: {
      leads: "",
      suppression: "",
    },
    marked,
  };

  fs.mkdirSync(args.reportDir, { recursive: true });
  const reportJson = path.join(args.reportDir, `outreach-lead-cleanup-${stamp}.json`);
  const reportMd = path.join(args.reportDir, `outreach-lead-cleanup-${stamp}.md`);

  if (!args.dryRun) {
    report.backups.leads = args.leadFile.replace(/\.csv$/i, `.backup-${stamp}.csv`);
    fs.copyFileSync(args.leadFile, report.backups.leads);
    if (fs.existsSync(args.suppressionFile)) {
      report.backups.suppression = args.suppressionFile.replace(/\.csv$/i, `.backup-${stamp}.csv`);
      fs.copyFileSync(args.suppressionFile, report.backups.suppression);
    }
    writeCsv(args.leadFile, leadCsv.header, leadCsv.records);
    if (suppressionLines.length) {
      fs.appendFileSync(args.suppressionFile, `${suppressionLines.join("\n")}\n`);
    }
  }

  fs.writeFileSync(reportJson, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportMd, buildMarkdown(report));
  console.log(JSON.stringify({ ok: true, reportJson, reportMd, ...report }, null, 2));
}

main();

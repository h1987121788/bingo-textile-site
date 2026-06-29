#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_KEYWORD_BANK = "data/outreach_keyword_bank.local.json";
const DEFAULT_KEYWORDS_CSV = "data/outreach_keywords.local.csv";

const LEARNED_SEARCH_QUERIES = [
  "\"Contact information\" \"Email:\" \"streetwear\" \"Powered by Shopify\"",
  "\"Contact information\" \"Email:\" \"hoodie\" \"Powered by Shopify\" \"Instagram\"",
  "\"Contact information\" \"Email:\" \"new drop\" \"streetwear\" \"Powered by Shopify\"",
  "\"streetwear\" \"gmail.com\" \"Powered by Shopify\" \"Contact information\"",
  "\"Contact information\" \"Email:\" \"premium streetwear\" \"Powered by Shopify\"",
  "\"heavyweight tee\" \"contact information\" \"Powered by Shopify\"",
  "\"French terry\" \"streetwear\" \"contact information\"",
  "\"garment dyed\" \"tee\" \"contact information\" \"brand\"",
];

const POSITIVE_QUALITY_SIGNALS = [
  "Powered by Shopify plus a public contact information page",
  "Direct domain email published on the official brand website",
  "Public free-mail address published on the official brand website",
  "Recent drop, new release, preorder, early access or coming soon language",
  "Review count or recent product activity visible on product pages",
  "Heavyweight tee, oversized tee, hoodie, fleece, French terry, garment dyed, mesh jersey or knit polo product language",
  "Founder, owner, creative director, designer, production or sourcing contact is public",
];

const NEGATIVE_QUALITY_SIGNALS = [
  "Email domain mismatch between extracted email and official website",
  "Search-summary email from another website mixed into a brand result",
  "PNG/image filename captured as an email address",
  "Example, privacy, GDPR, legal, abuse, noreply or shopify system mailbox",
  "Web design, law, health, calculator, news, tutorial, marketplace or resale sites",
  "Bing/RSS generic results without a verified official contact page",
];

const EMAIL_QUALITY_RULES = [
  "Reject non-free-mail addresses when the email domain does not match the website domain.",
  "Allow Gmail, Yahoo, Outlook, Hotmail, iCloud or Me only when the address appears on the official brand page.",
  "Reject privacy, legal, GDPR, abuse, noreply, no-reply, shopify and support.com style generic/system addresses.",
  "Reject malformed addresses such as .con domains or image artifacts such as @2x.png.",
  "Require contactSource to be the official website contact, about, wholesale, policy or product page.",
];

const PROVIDER_SENDING_RULES = [
  "For QQ personal SMTP, stop immediately on the first SMTP 550.",
  "For QQ personal SMTP, cap daily accepted outreach at 45 or lower until a warmed domain mailbox is ready.",
  "Keep at least 20 seconds between messages; 60 seconds is safer for cold outreach.",
  "If immediate bounce rate exceeds 5%, tighten email validation before the next send.",
];

const LEARNED_RECENT_SIGNALS = [
  "exclusive drop",
  "early access",
  "new release",
  "review activity signal",
  "back in stock",
  "limited release",
];

const LEARNED_EXCLUDE_TERMS = [
  "sitescorechecker",
  "web design agency",
  "law firm",
  "health assessment",
  "calculator",
  "news article",
  "tutorial",
  "discountfootballkits",
  "zoomtan",
  "leehwawedding",
  "chicme",
  "simpleshoes",
  "lewa.org",
  "priceupay",
  "trueref",
  "gdpr@",
  "privacy@",
  "legal@",
  "abuse@",
  "noreply@",
  "no-reply@",
  "shopify@",
  "support.com",
  "beispiel.com",
  ".png email artifact",
  "email domain mismatch",
];

const KEYWORD_CSV_ROWS = [
  ["learning", "successful search query", "en", "Contact information Email streetwear Powered by Shopify", "5", "Post-run discovery query pattern"],
  ["learning", "successful search query", "en", "heavyweight tee contact information Powered by Shopify", "5", "Post-run discovery query pattern"],
  ["quality", "positive signal", "en", "Powered by Shopify contact information", "5", "High-quality public contact signal"],
  ["quality", "positive signal", "en", "direct domain email on official site", "5", "Email quality rule"],
  ["quality", "positive signal", "en", "public free-mail on official brand page", "4", "Email quality rule"],
  ["recent", "recent activity", "en", "exclusive drop", "4", "Recent drop"],
  ["recent", "recent activity", "en", "early access", "4", "Recent drop"],
  ["recent", "recent activity", "en", "new release", "5", "Recent drop"],
  ["recent", "recent activity", "en", "review activity signal", "4", "Recent activity"],
  ["exclude", "irrelevant", "en", "sitescorechecker", "5", "Reject"],
  ["exclude", "irrelevant", "en", "web design agency", "5", "Reject"],
  ["exclude", "irrelevant", "en", "law firm", "5", "Reject"],
  ["exclude", "irrelevant", "en", "health assessment", "5", "Reject"],
  ["exclude", "bad email", "en", ".png email artifact", "5", "Reject"],
  ["exclude", "bad email", "en", "email domain mismatch", "5", "Reject"],
  ["exclude", "bad email", "en", "gdpr@", "5", "Reject"],
  ["exclude", "bad email", "en", "privacy@", "5", "Reject"],
];

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.summary) die("Usage: node scripts/outreach_postrun_learning.cjs --summary reports/outreach-...-summary.json [--cleaning file] [--discovery file]");

  const summary = readJson(args.summary);
  const cleaning = args.cleaning && fs.existsSync(args.cleaning) ? readJson(args.cleaning) : null;
  const discovery = args.discovery && fs.existsSync(args.discovery) ? readJson(args.discovery) : null;
  const outputs = outputPaths(args.summary, args.outputJson, args.outputMd);
  const learning = buildLearning({ summary, cleaning, discovery, files: { ...args, ...outputs } });

  ensureDir(path.dirname(outputs.outputJson));
  fs.writeFileSync(outputs.outputJson, `${JSON.stringify(learning, null, 2)}\n`);
  fs.writeFileSync(outputs.outputMd, buildMarkdown(learning));

  const bankResult = updateKeywordBank(args.keywordBank || DEFAULT_KEYWORD_BANK, learning, args.dryRun);
  const csvResult = updateKeywordCsv(args.keywordsCsv || DEFAULT_KEYWORDS_CSV, args.dryRun);

  console.log(
    JSON.stringify(
      {
        ok: true,
        learningJson: outputs.outputJson,
        learningMarkdown: outputs.outputMd,
        keywordBank: bankResult,
        keywordsCsv: csvResult,
      },
      null,
      2
    )
  );
}

function parseArgs(argv) {
  const args = {
    summary: "",
    cleaning: "",
    discovery: "",
    keywordBank: DEFAULT_KEYWORD_BANK,
    keywordsCsv: DEFAULT_KEYWORDS_CSV,
    outputJson: "",
    outputMd: "",
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--summary") args.summary = requireValue(argv, ++i, arg);
    else if (arg === "--cleaning") args.cleaning = requireValue(argv, ++i, arg);
    else if (arg === "--discovery") args.discovery = requireValue(argv, ++i, arg);
    else if (arg === "--keyword-bank") args.keywordBank = requireValue(argv, ++i, arg);
    else if (arg === "--keywords-csv") args.keywordsCsv = requireValue(argv, ++i, arg);
    else if (arg === "--output-json") args.outputJson = requireValue(argv, ++i, arg);
    else if (arg === "--output-md") args.outputMd = requireValue(argv, ++i, arg);
    else if (arg === "--dry-run") args.dryRun = true;
    else die(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) die(`${flag} requires a value.`);
  return value;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    die(`Cannot read JSON ${file}: ${error.message}`);
  }
}

function outputPaths(summaryPath, explicitJson, explicitMd) {
  const parsed = path.parse(summaryPath);
  const stem = parsed.name.replace(/-summary$/, "");
  return {
    outputJson: explicitJson || path.join(parsed.dir || ".", `${stem}-learning.json`),
    outputMd: explicitMd || path.join(parsed.dir || ".", `${stem}-learning.md`),
  };
}

function buildLearning(context) {
  const { summary, cleaning, discovery, files } = context;
  const metrics = metricsFromSummary(summary);
  const rejection = rejectionAnalysis(cleaning);
  const cleanedRows = Array.isArray(cleaning && cleaning.cleanedRows) ? cleaning.cleanedRows : [];
  const domainEmailCount = cleanedRows.filter((row) => isDomainMatchedEmail(row.businessEmail, row.website)).length;
  const publicFreeMailCount = cleanedRows.filter((row) => isFreeMail(row.businessEmail)).length;
  const productFocus = topValues(cleanedRows.flatMap((row) => splitProductTypes(row.productType)), 10);
  const recentFocus = topValues(cleanedRows.map((row) => row.recentSignal).filter(Boolean), 10);

  const batch = summary.batch || batchFromFile(files.summary);
  const generatedAt = new Date().toISOString();
  const localDate = summary.localDate || generatedAt.slice(0, 10);
  const bounceRate = metrics.smtpAccepted ? round(metrics.bouncedRemoved / metrics.smtpAccepted, 4) : 0;
  const cleanRate = metrics.rawTopSelected ? round(metrics.cleanedCandidates / metrics.rawTopSelected, 4) : 0;
  const smtpFailureRate = metrics.attempted ? round(metrics.smtpFailed / metrics.attempted, 4) : 0;

  return {
    generatedAt,
    localDate,
    batch,
    sourceFiles: {
      summary: files.summary,
      cleaning: files.cleaning || "",
      discovery: files.discovery || "",
    },
    metrics: {
      ...metrics,
      cleanRate,
      bounceRate,
      smtpFailureRate,
      discoverySeeds: numberFrom(discovery && discovery.seeds),
      discoveryRawCandidates: numberFrom(discovery && discovery.rawCandidates),
    },
    qualityAnalysis: {
      cleanedRows: cleanedRows.length,
      domainMatchedEmails: domainEmailCount,
      publicFreeMailEmails: publicFreeMailCount,
      productFocus,
      recentFocus,
      rejectedReasonCounts: rejection.reasonCounts,
      rejectedSamples: rejection.samples,
    },
    learnedSearchQueries: LEARNED_SEARCH_QUERIES,
    positiveQualitySignals: POSITIVE_QUALITY_SIGNALS,
    negativeQualitySignals: NEGATIVE_QUALITY_SIGNALS,
    emailQualityRules: EMAIL_QUALITY_RULES,
    providerSendingRules: PROVIDER_SENDING_RULES,
    keywordUpdates: {
      recentDropSignals: LEARNED_RECENT_SIGNALS,
      excludeTerms: LEARNED_EXCLUDE_TERMS,
    },
    recommendations: recommendationsFor(metrics, bounceRate, cleanRate),
  };
}

function metricsFromSummary(summary) {
  const totals = summary && summary.totals && typeof summary.totals === "object" ? summary.totals : {};
  const sendResults = Array.isArray(summary && summary.sendResults) ? summary.sendResults : [];
  const statuses = Array.isArray(summary && summary.statuses) ? summary.statuses : [];
  const bounceCleanup = summary && summary.bounceCleanup && typeof summary.bounceCleanup === "object" ? summary.bounceCleanup : {};
  const errors = [...sendResults, ...statuses].map((item) => item.error || "").filter(Boolean);

  return {
    searchSeeds: numberFrom(totals.searchSeeds, numberFrom(summary && summary.candidatePoolCount)),
    rawCandidates: numberFrom(totals.rawCandidates),
    rawTopSelected: numberFrom(totals.rawTopSelected, numberFrom(summary && summary.selectedCount)),
    cleanedCandidates: numberFrom(totals.cleanedCandidates, numberFrom(summary && summary.selectedCount)),
    rejectedByQualityCount: numberFrom(totals.rejectedByQualityCount),
    primaryQueue: numberFrom(totals.primaryQueue),
    extraQueue: numberFrom(totals.extraQueue),
    totalSendQueue: numberFrom(totals.totalSendQueue),
    attempted: numberFrom(totals.attempted, sendResults.length || statuses.length),
    smtpAccepted: numberFrom(totals.smtpAccepted, sendResults.filter((item) => item.ok).length || statuses.filter((item) => /sent|accepted/i.test(item.status || "")).length),
    smtpFailed: numberFrom(totals.smtpFailed, sendResults.filter((item) => item.ok === false).length || statuses.filter((item) => /failed|550/i.test(item.status || "")).length),
    smtp550: numberFrom(totals.smtp550, errors.filter((error) => /\b550\b/.test(error)).length),
    stoppedOn550: Boolean(totals.stoppedOn550 || errors.some((error) => /\b550\b/.test(error))),
    first550AttemptNumber: numberFrom(totals.first550AttemptNumber),
    first550Email: totals.first550Email || firstStatusWith550(statuses, sendResults).email || firstStatusWith550(statuses, sendResults).to || "",
    first550Brand: totals.first550Brand || firstStatusWith550(statuses, sendResults).brandName || "",
    notSentAfter550: numberFrom(totals.notSentAfter550),
    bouncedRemoved: numberFrom(totals.bouncedRemoved, Array.isArray(bounceCleanup.removedEmails) ? bounceCleanup.removedEmails.length : 0),
    netAcceptedMinusImmediateBounces: numberFrom(totals.netAcceptedMinusImmediateBounces),
    todaySendRows: numberFrom(totals.todaySendRows),
    todayOk: numberFrom(totals.todayOk),
    today550: numberFrom(totals.today550),
  };
}

function firstStatusWith550(statuses, sendResults) {
  return [...statuses, ...sendResults].find((item) => /\b550\b/.test(item.error || "")) || {};
}

function rejectionAnalysis(cleaning) {
  const rejected = Array.isArray(cleaning && cleaning.rejected) ? cleaning.rejected : [];
  const reasonCounts = {};
  for (const item of rejected) {
    const reason = item.reason || "unknown";
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }
  return {
    reasonCounts,
    samples: rejected.slice(0, 12).map((item) => ({
      brand: item.brand || item.brandName || "",
      email: item.email || item.businessEmail || "",
      website: item.website || "",
      reason: item.reason || "unknown",
    })),
  };
}

function recommendationsFor(metrics, bounceRate, cleanRate) {
  const items = [];
  if (metrics.stoppedOn550) {
    items.push(`QQ reached SMTP 550 at attempt ${metrics.first550AttemptNumber || "unknown"}; use a hard cap below this level next time.`);
  }
  if (metrics.smtpAccepted >= 45) {
    items.push("Set the next QQ daily cap to 30-45 accepted emails until a warmed domain mailbox is ready.");
  }
  if (bounceRate > 0.05) {
    items.push(`Immediate bounce rate was ${percentage(bounceRate)}; prefer domain-matched emails and re-check free-mail leads.`);
  }
  if (cleanRate && cleanRate < 0.7) {
    items.push(`Only ${percentage(cleanRate)} of raw top candidates survived cleaning; add stricter host and email mismatch filters earlier in discovery.`);
  }
  items.push("Use the Shopify contact-information query family first, then expand to founder/designer queries after contact validation.");
  items.push("Keep public website proof for personal emails; skip any address that only appears in mixed search snippets.");
  return items;
}

function updateKeywordBank(file, learning, dryRun) {
  if (!fs.existsSync(file)) {
    return { path: file, updated: false, reason: "missing" };
  }
  const bank = readJson(file);
  const before = JSON.stringify(bank);

  bank.lastLearningAt = learning.generatedAt;
  bank.learnedSearchQueries = unique([...(bank.learnedSearchQueries || []), ...learning.learnedSearchQueries]);
  bank.searchQueries = unique([...(bank.searchQueries || []), ...learning.learnedSearchQueries]);
  bank.positiveQualitySignals = unique([...(bank.positiveQualitySignals || []), ...learning.positiveQualitySignals]);
  bank.negativeQualitySignals = unique([...(bank.negativeQualitySignals || []), ...learning.negativeQualitySignals]);
  bank.emailQualityRules = unique([...(bank.emailQualityRules || []), ...learning.emailQualityRules]);
  bank.providerSendingRules = unique([...(bank.providerSendingRules || []), ...learning.providerSendingRules]);
  bank.recentDropSignals = unique([...(bank.recentDropSignals || []), ...learning.keywordUpdates.recentDropSignals]);
  bank.excludeTerms = unique([...(bank.excludeTerms || []), ...learning.keywordUpdates.excludeTerms]);
  bank.batchLearnings = uniqueBatchLearnings([...(bank.batchLearnings || []), batchLearningSummary(learning)]).slice(-30);

  const after = JSON.stringify(bank, null, 2);
  if (!dryRun && before !== JSON.stringify(bank)) fs.writeFileSync(file, `${after}\n`);
  return {
    path: file,
    updated: before !== JSON.stringify(bank),
    learnedSearchQueries: learning.learnedSearchQueries.length,
    batchLearnings: bank.batchLearnings.length,
  };
}

function batchLearningSummary(learning) {
  return {
    batch: learning.batch,
    generatedAt: learning.generatedAt,
    cleanedCandidates: learning.metrics.cleanedCandidates,
    smtpAccepted: learning.metrics.smtpAccepted,
    smtp550: learning.metrics.smtp550,
    bouncedRemoved: learning.metrics.bouncedRemoved,
    cleanRate: learning.metrics.cleanRate,
    bounceRate: learning.metrics.bounceRate,
    first550AttemptNumber: learning.metrics.first550AttemptNumber,
    recommendation: learning.recommendations[0] || "",
  };
}

function uniqueBatchLearnings(items) {
  const byBatch = new Map();
  for (const item of items) {
    if (!item || !item.batch) continue;
    byBatch.set(item.batch, item);
  }
  return [...byBatch.values()];
}

function updateKeywordCsv(file, dryRun) {
  const header = "category,label,language,keyword,priority,usage";
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : `${header}\n`;
  const existing = new Set();
  for (const line of content.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const key = csvKey(cells[0], cells[1], cells[3]);
    existing.add(key);
  }

  const rowsToAdd = KEYWORD_CSV_ROWS.filter((row) => !existing.has(csvKey(row[0], row[1], row[3])));
  if (rowsToAdd.length && !dryRun) {
    const prefix = content.endsWith("\n") ? content : `${content}\n`;
    fs.writeFileSync(file, `${prefix}${rowsToAdd.map(formatCsvRow).join("\n")}\n`);
  }

  return { path: file, addedRows: rowsToAdd.length };
}

function buildMarkdown(learning) {
  const lines = [];
  lines.push(`# Outreach Post-run Learning - ${learning.batch}`);
  lines.push("");
  lines.push(`Generated: ${learning.generatedAt}`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- Raw candidates saved: ${learning.metrics.rawTopSelected || learning.metrics.rawCandidates || 0}`);
  lines.push(`- Cleaned candidates: ${learning.metrics.cleanedCandidates}`);
  lines.push(`- Quality rejections: ${learning.metrics.rejectedByQualityCount}`);
  lines.push(`- Attempted sends: ${learning.metrics.attempted}`);
  lines.push(`- SMTP accepted: ${learning.metrics.smtpAccepted}`);
  lines.push(`- SMTP 550: ${learning.metrics.smtp550}${learning.metrics.first550AttemptNumber ? ` at attempt ${learning.metrics.first550AttemptNumber}` : ""}`);
  lines.push(`- Immediate bounces removed: ${learning.metrics.bouncedRemoved}`);
  lines.push(`- Clean rate: ${percentage(learning.metrics.cleanRate)}`);
  lines.push(`- Bounce rate: ${percentage(learning.metrics.bounceRate)}`);
  lines.push("");
  lines.push("## Best Signals To Reuse");
  lines.push("");
  for (const item of learning.positiveQualitySignals) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Filters To Tighten");
  lines.push("");
  for (const item of learning.negativeQualitySignals) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Search Queries To Prioritize");
  lines.push("");
  for (const query of learning.learnedSearchQueries) lines.push(`- \`${query}\``);
  lines.push("");
  lines.push("## Rejection Counts");
  lines.push("");
  for (const [reason, count] of Object.entries(learning.qualityAnalysis.rejectedReasonCounts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  if (!Object.keys(learning.qualityAnalysis.rejectedReasonCounts).length) lines.push("- No cleaning rejection data available.");
  lines.push("");
  lines.push("## Sending Rules");
  lines.push("");
  for (const item of learning.providerSendingRules) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Next-run Recommendations");
  lines.push("");
  for (const item of learning.recommendations) lines.push(`- ${item}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function splitProductTypes(value) {
  return String(value || "")
    .split(/[;,/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function topValues(values, limit) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function isDomainMatchedEmail(email, website) {
  const domain = emailDomain(email);
  const host = websiteHost(website);
  if (!domain || !host || isFreeMail(email)) return false;
  return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
}

function isFreeMail(email) {
  const domain = emailDomain(email);
  return ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "me.com", "qq.com"].includes(domain);
}

function emailDomain(email) {
  const value = String(email || "").trim().toLowerCase();
  const match = value.match(/@([^@\s>]+)$/);
  return match ? match[1].replace(/[),.;]+$/, "") : "";
}

function websiteHost(website) {
  try {
    return new URL(String(website || "")).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_error) {
    return "";
  }
}

function batchFromFile(file) {
  const name = path.basename(file || "");
  return name.replace(/^outreach-/, "").replace(/-summary\.json$/, "").replace(/\.json$/, "") || "unknown";
}

function numberFrom(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function percentage(value) {
  if (!Number.isFinite(Number(value))) return "0%";
  return `${round(Number(value) * 100, 2)}%`;
}

function unique(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const value = String(item || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value);
  return cells;
}

function formatCsvRow(row) {
  return row.map(csvCell).join(",");
}

function csvCell(value) {
  const text = String(value == null ? "" : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function csvKey(category, label, keyword) {
  return [category, label, keyword].map((item) => String(item || "").trim().toLowerCase()).join("|");
}

function ensureDir(dir) {
  if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function die(message) {
  console.error(message);
  process.exit(1);
}

main();

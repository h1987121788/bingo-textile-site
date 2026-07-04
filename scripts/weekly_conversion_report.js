#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_REPORT_DIR = "reports";
const DEFAULT_SENT_LOG = "data/outreach_sent_log.csv";
const DEFAULT_REPLY_LOG = "data/outreach_reply_log.csv";
const DEFAULT_BOUNCE_LOG = "data/outreach_bounces.csv";
const DEFAULT_SMTP_REJECTIONS = "data/outreach_smtp_rejections.csv";

function usage() {
  console.log(`Usage:
  node scripts/weekly_conversion_report.js [--week-start YYYY-MM-DD] [--week-end YYYY-MM-DD]
  node scripts/weekly_conversion_report.js --crm-csv data/website_leads_export_YYYY-MM-DD.csv --visits 120 --whatsapp-clicks 18

Options:
  --crm-csv PATH          Google Sheet CSV export for Website Leads.
  --visits N             GA4 sessions/users for the week, entered manually.
  --whatsapp-clicks N    GA4/Meta Contact event count for WhatsApp clicks, entered manually.
  --week-start DATE      Inclusive start date. Defaults to current Monday.
  --week-end DATE        Inclusive end date. Defaults to week-start + 6 days.
  --output PATH          Markdown output path. Defaults to reports/weekly-conversion-START_to_END.md.
  --help                 Show this help.
`);
}

function parseArgs(argv) {
  const args = {
    crmCsv: "",
    visits: null,
    whatsappClicks: null,
    weekStart: "",
    weekEnd: "",
    output: "",
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--crm-csv") args.crmCsv = requireValue(argv, ++i, arg);
    else if (arg === "--visits") args.visits = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--whatsapp-clicks") args.whatsappClicks = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--week-start") args.weekStart = requireValue(argv, ++i, arg);
    else if (arg === "--week-end") args.weekEnd = requireValue(argv, ++i, arg);
    else if (arg === "--output") args.output = requireValue(argv, ++i, arg);
    else die(`Unknown argument: ${arg}`);
  }

  return args;
}

function requireValue(argv, index, flag) {
  if (index >= argv.length || argv[index].startsWith("--")) {
    die(`${flag} requires a value.`);
  }
  return argv[index];
}

function numberArg(value, flag) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) die(`${flag} requires a non-negative number.`);
  return n;
}

function die(message) {
  console.error(message);
  process.exit(2);
}

function startOfCurrentWeek() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function parseDateOnly(value) {
  const date = dateOnlyToUtc(value);
  if (!date) {
    die(`Invalid date: ${value}. Use YYYY-MM-DD.`);
  }
  return date;
}

function dateOnlyToUtc(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inRange(value, start, endExclusive) {
  const date = parseFlexibleDate(value);
  return date && date >= start && date < endExclusive;
}

function parseFlexibleDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const exactDateOnly = dateOnlyToUtc(text);
  if (exactDateOnly) return exactDateOnly;
  const datePrefix = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePrefix) return dateOnlyToUtc(datePrefix[1]);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
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

  return rows.filter((items) => items.some((item) => String(item || "").trim()));
}

function readCsvRecords(file) {
  if (!file || !fs.existsSync(file)) return [];
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const headers = rows.shift() || [];
  return rows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return record;
  });
}

function field(record, names) {
  for (const name of names) {
    if (record[name] !== undefined && String(record[name]).trim()) return record[name];
  }
  return "";
}

function countBy(records, names) {
  const counts = {};
  for (const record of records) {
    const value = String(field(record, names) || "(blank)").trim() || "(blank)";
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function countTruth(records, names) {
  return records.filter((record) => /^(1|true|yes|y|on)$/i.test(String(field(record, names) || "").trim())).length;
}

function sumQuotedValue(records) {
  let sum = 0;
  let count = 0;
  for (const record of records) {
    const value = String(field(record, ["quoted_value", "quotedValue"]) || "").replace(/[^0-9.-]/g, "");
    if (!value) continue;
    const n = Number(value);
    if (Number.isFinite(n)) {
      sum += n;
      count += 1;
    }
  }
  return { count, sum };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, " ")).join(" | ")} |`),
  ].join("\n");
}

function topRows(counts, limit = 10) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const start = args.weekStart ? parseDateOnly(args.weekStart) : startOfCurrentWeek();
  const end = args.weekEnd ? parseDateOnly(args.weekEnd) : addDays(start, 6);
  const endExclusive = addDays(end, 1);
  const startLabel = isoDate(start);
  const endLabel = isoDate(end);

  const crmRows = readCsvRecords(args.crmCsv).filter((record) =>
    inRange(field(record, ["receivedAt", "submittedAt", "createdAt", "date"]), start, endExclusive)
  );
  const sentRows = readCsvRecords(DEFAULT_SENT_LOG).filter((record) =>
    inRange(field(record, ["sentAt", "date"]), start, endExclusive)
  );
  const replyRows = readCsvRecords(DEFAULT_REPLY_LOG).filter((record) =>
    inRange(field(record, ["receivedAt", "checkedAt", "date"]), start, endExclusive)
  );
  const bounceRows = readCsvRecords(DEFAULT_BOUNCE_LOG).filter((record) =>
    inRange(field(record, ["bouncedAt", "date"]), start, endExclusive)
  );
  const smtpRejectionRows = readCsvRecords(DEFAULT_SMTP_REJECTIONS).filter((record) =>
    inRange(field(record, ["rejectedAt", "date"]), start, endExclusive)
  );

  const quoted = sumQuotedValue(crmRows);
  const sampleRequests = countTruth(crmRows, ["sample_requested", "sampleRequested"]);
  const crmReplyRows = crmRows.filter((record) => /repl|respond/i.test(field(record, ["lead_status", "leadStatus", "status"])));
  const quoteRows = crmRows.filter((record) => /quot/i.test(field(record, ["lead_status", "leadStatus", "status"])));

  const funnelRows = [
    ["Visits", args.visits ?? "N/A", args.visits === null ? "Add GA4 value with --visits" : "Manual GA4 input"],
    ["Form submissions", crmRows.length || "N/A", args.crmCsv ? args.crmCsv : "Export Google Sheet CSV with --crm-csv"],
    ["WhatsApp clicks", args.whatsappClicks ?? "N/A", args.whatsappClicks === null ? "Add GA4/Meta Contact count with --whatsapp-clicks" : "Manual GA4/Meta input"],
    ["Sheet rows", crmRows.length || "N/A", args.crmCsv ? args.crmCsv : "CRM CSV not provided"],
    ["Replies", replyRows.length + crmReplyRows.length, "outreach_reply_log + CRM status"],
    ["Sample requests", sampleRequests, "CRM sample_requested"],
    ["Quotes", Math.max(quoted.count, quoteRows.length), "CRM quoted_value or quote status"],
  ];

  const markdown = [
    `# Weekly Conversion Report - ${startLabel} to ${endLabel}`,
    "",
    "## Funnel",
    "",
    markdownTable(["Step", "Count", "Source"], funnelRows),
    "",
    "## CRM Pipeline",
    "",
    crmRows.length
      ? markdownTable(["lead_status", "count"], topRows(countBy(crmRows, ["lead_status", "leadStatus", "status"])))
      : "No CRM CSV supplied. Export the Website Leads sheet and rerun with `--crm-csv data/website_leads_export_YYYY-MM-DD.csv`.",
    "",
    "## Source Channels",
    "",
    crmRows.length
      ? markdownTable(["source_channel", "count"], topRows(countBy(crmRows, ["source_channel", "sourceChannel", "utm_source", "utmSource"])))
      : "No CRM source-channel data available.",
    "",
    "## Outreach Support Signals",
    "",
    markdownTable(
      ["Metric", "Count"],
      [
        ["Outreach emails logged", sentRows.length],
        ["Positive reply log rows", replyRows.length],
        ["Bounce rows", bounceRows.length],
        ["SMTP rejection rows", smtpRejectionRows.length],
      ]
    ),
    "",
    "## Quote Value",
    "",
    `- Quoted rows: ${quoted.count}`,
    `- Quoted value sum: ${quoted.sum}`,
    "",
    "## Follow-Up Checks",
    "",
    "- Review all `new_inquiry` rows with `next_action_at` due this week.",
    "- Move qualified leads through: `new_inquiry` -> `replied` -> `sample_sent` -> `quoted` -> `won` or `lost`.",
    "- Keep GA4 visits and WhatsApp Contact events beside this report so the website funnel is visible.",
    "- Compare outreach replies with CRM rows to avoid losing WhatsApp-only conversations.",
    "",
  ].join("\n");

  const output = args.output || path.join(DEFAULT_REPORT_DIR, `weekly-conversion-${startLabel}_to_${endLabel}.md`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, markdown);
  console.log(JSON.stringify({ ok: true, output, weekStart: startLabel, weekEnd: endLabel }, null, 2));
}

main();

#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const tls = require("tls");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { requireAutomationEnabled } = require("./automation_guard");

const DEFAULT_ENV_PATH = ".env.outreach.local";
const DEFAULT_REPORT_DIR = "reports";
const DEFAULT_SUPPRESSION_FILE = "data/outreach_suppression.csv";
const DEFAULT_LEAD_DB_FILE = "data/outreach_leads.csv";
const DEFAULT_BOUNCE_LOG_FILE = "data/outreach_bounces.csv";
const DEFAULT_SENT_LOG_FILE = "data/outreach_sent_log.csv";
const DEFAULT_KEYWORD_BANK_FILE = "data/outreach_keyword_bank.json";
const DEFAULT_KEYWORDS_CSV_FILE = "data/outreach_keywords.csv";
const DEFAULT_POSTRUN_LEARNING_SCRIPT = "scripts/outreach_postrun_learning.cjs";

let ACTIVE_KEYWORD_BANK = null;
let ACTIVE_CONTACT_INFO = null;

const LEAD_DB_FIELDS = [
  "leadId",
  "leadKey",
  "brandName",
  "country",
  "website",
  "instagramUrl",
  "facebookUrl",
  "businessEmail",
  "contactName",
  "contactRole",
  "contactSource",
  "personalEmailAllowed",
  "productType",
  "priceTier",
  "recentSignal",
  "score",
  "whyFit",
  "sourceLinks",
  "checkedPages",
  "emailSource",
  "firstFoundDate",
  "lastFoundDate",
  "developmentDate",
  "approvalStatus",
  "doNotContact",
  "status",
  "emailSubject",
  "sentAt",
  "firstOutreachDate",
  "lastOutreachDate",
  "lastSendOk",
  "messageId",
  "sendError",
  "nextFollowUpDate",
  "lastReportJson",
  "lastReportMarkdown",
  "searchQuery",
  "notes",
];

const DEFAULT_QUERIES = [
  "streetwear brand heavyweight hoodie contact",
  "independent streetwear brand wholesale contact",
  "cut and sew streetwear brand contact",
  "garment dyed tee brand contact",
  "heavyweight tee streetwear brand contact",
  "streetwear hoodie brand wholesale email",
];

const TARGET_COUNTRIES = new Set([
  "United States",
  "United States of America",
  "USA",
  "US",
  "Canada",
  "United Kingdom",
  "UK",
  "Great Britain",
  "England",
  "Scotland",
  "Wales",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "Italy",
  "Spain",
  "Belgium",
  "Switzerland",
  "Austria",
  "Portugal",
  "Poland",
  "Czech Republic",
  "Czechia",
  "Greece",
  "Luxembourg",
  "Iceland",
  "Sweden",
  "Denmark",
  "Norway",
  "Finland",
  "Japan",
  "South Korea",
  "Korea",
  "Singapore",
  "Australia",
  "New Zealand",
]);

const AFRICAN_COUNTRIES = [
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
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
];

const EXCLUDED_COUNTRIES = new Set(["India", ...AFRICAN_COUNTRIES]);

const COUNTRY_ALIASES = new Map([
  ["america", "United States"],
  ["united states of america", "United States"],
  ["u s", "United States"],
  ["u s a", "United States"],
  ["usa", "United States"],
  ["us", "United States"],
  ["uk", "United Kingdom"],
  ["u k", "United Kingdom"],
  ["great britain", "United Kingdom"],
  ["england", "United Kingdom"],
  ["scotland", "United Kingdom"],
  ["wales", "United Kingdom"],
  ["republic of korea", "South Korea"],
  ["korea", "South Korea"],
  ["south korea", "South Korea"],
  ["czechia", "Czech Republic"],
  ["czech republic", "Czech Republic"],
  ["ivory coast", "Ivory Coast"],
  ["cote d ivoire", "Ivory Coast"],
  ["drc", "Democratic Republic of the Congo"],
  ["democratic republic of congo", "Democratic Republic of the Congo"],
]);

const TARGET_COUNTRY_KEYS = new Map([...TARGET_COUNTRIES].map((country) => [countryKey(country), country]));
const EXCLUDED_COUNTRY_KEYS = new Map([...EXCLUDED_COUNTRIES].map((country) => [countryKey(country), country]));

const COUNTRY_HINTS = [
  ["United States", /\b(united states|usa|u\.s\.|los angeles|new york|brooklyn|california|texas|florida)\b/i],
  ["Canada", /\b(canada|toronto|vancouver|montreal)\b/i],
  ["United Kingdom", /\b(united kingdom|uk|london|manchester|england|scotland)\b/i],
  ["Germany", /\b(germany|berlin|hamburg|munich)\b/i],
  ["France", /\b(france|paris)\b/i],
  ["Netherlands", /\b(netherlands|amsterdam|rotterdam)\b/i],
  ["Italy", /\b(italy|milan|roma|rome)\b/i],
  ["Spain", /\b(spain|madrid|barcelona)\b/i],
  ["Belgium", /\b(belgium|brussels|antwerp)\b/i],
  ["Switzerland", /\b(switzerland|zurich|geneva)\b/i],
  ["Austria", /\b(austria|vienna)\b/i],
  ["Portugal", /\b(portugal|lisbon|porto)\b/i],
  ["Poland", /\b(poland|warsaw|krakow)\b/i],
  ["Czech Republic", /\b(czech republic|czechia|prague)\b/i],
  ["Greece", /\b(greece|athens)\b/i],
  ["Japan", /\b(japan|tokyo|osaka)\b/i],
  ["South Korea", /\b(south korea|korea|seoul)\b/i],
  ["Singapore", /\b(singapore)\b/i],
  ["Australia", /\b(australia|sydney|melbourne|brisbane)\b/i],
  ["New Zealand", /\b(new zealand|auckland|wellington)\b/i],
];

const TLD_COUNTRY_HINTS = [
  ["co.uk", "United Kingdom"],
  ["uk", "United Kingdom"],
  ["ca", "Canada"],
  ["de", "Germany"],
  ["fr", "France"],
  ["nl", "Netherlands"],
  ["it", "Italy"],
  ["es", "Spain"],
  ["be", "Belgium"],
  ["ch", "Switzerland"],
  ["at", "Austria"],
  ["pt", "Portugal"],
  ["pl", "Poland"],
  ["cz", "Czech Republic"],
  ["gr", "Greece"],
  ["se", "Sweden"],
  ["dk", "Denmark"],
  ["no", "Norway"],
  ["fi", "Finland"],
  ["jp", "Japan"],
  ["co.jp", "Japan"],
  ["kr", "South Korea"],
  ["co.kr", "South Korea"],
  ["sg", "Singapore"],
  ["com.sg", "Singapore"],
  ["au", "Australia"],
  ["com.au", "Australia"],
  ["nz", "New Zealand"],
  ["co.nz", "New Zealand"],
];

const EXCLUDED_TLD_MARKETS = [
  ["in", "India"],
  ["co.in", "India"],
  ["za", "South Africa"],
  ["co.za", "South Africa"],
  ["ng", "Nigeria"],
  ["com.ng", "Nigeria"],
  ["ke", "Kenya"],
  ["co.ke", "Kenya"],
  ["gh", "Ghana"],
  ["com.gh", "Ghana"],
  ["eg", "Egypt"],
  ["ma", "Morocco"],
  ["tn", "Tunisia"],
  ["dz", "Algeria"],
  ["ug", "Uganda"],
  ["tz", "Tanzania"],
  ["rw", "Rwanda"],
  ["zm", "Zambia"],
  ["zw", "Zimbabwe"],
  ["bw", "Botswana"],
  ["mu", "Mauritius"],
  ["sn", "Senegal"],
  ["ci", "Ivory Coast"],
  ["cm", "Cameroon"],
  ["et", "Ethiopia"],
];

const EXCLUDED_MARKET_HINTS = [
  ["India", /\b(india|indian streetwear|mumbai|delhi|new delhi|bangalore|bengaluru|hyderabad|chennai|pune|kolkata)\b/i],
  ["Africa", /\b(africa|african streetwear|south africa|nigeria|ghana|kenya|egypt|morocco|tunisia|algeria|uganda|tanzania|zimbabwe|zambia)\b/i],
];

const TARGET_MARKET_LABEL =
  "US/Canada, Europe, Japan, South Korea, Singapore, Australia/New Zealand";
const EXCLUDED_MARKET_LABEL = "India and Africa";

const SKIP_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "threads.net",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "reddit.com",
  "wikipedia.org",
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
  "hypebeast.com",
  "highsnobiety.com",
  "vogue.com",
  "complex.com",
  "shopify.com",
];

const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/pages/contact",
  "/pages/contact-us",
  "/wholesale",
  "/pages/wholesale",
  "/stockists",
  "/pages/stockists",
  "/about",
  "/pages/about",
];

const ROLE_EMAIL_PARTS = [
  "hello",
  "hi",
  "info",
  "contact",
  "sales",
  "wholesale",
  "business",
  "studio",
  "team",
  "support",
  "orders",
  "order",
  "press",
  "partnership",
  "partnerships",
  "production",
  "sourcing",
  "buying",
  "custom",
  "general",
];

const DECISION_MAKER_ROLE_PATTERNS = [
  ["founder / owner", /\b(founder|co[-\s]?founder|owner|co[-\s]?owner|ceo|director|managing director|principal)\b/i],
  ["creative director / designer", /\b(creative director|designer|head designer|design director|art director|brand director)\b/i],
  ["production / sourcing lead", /\b(production|sourcing|product development|developer|buyer|buying|merchandiser)\b/i],
];

const REJECT_EMAIL_PARTS = [
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

const HOSTED_STORE_DOMAINS = new Set(["myshopify.com"]);

const PRODUCT_PATTERNS = [
  ["heavyweight / boxy T-shirts", /\b(heavyweight|boxy|oversized|tee|t-shirt|t shirt|jersey)\b/i],
  ["hoodies / sweatshirts / sweatpants", /\b(hoodie|hooded|sweatshirt|sweatpants|fleece|french terry|terry)\b/i],
  ["knit polos / rugby shirts", /\b(polo|rugby|rib|collar|pique)\b/i],
  ["garment-dyed / vintage-wash styles", /\b(garment dye|garment-dye|pigment dye|vintage wash|washed)\b/i],
  ["mesh / sports tops", /\b(mesh|sports jersey|football jersey|basketball jersey)\b/i],
  ["stretch / fitted tops", /\b(stretch|spandex|elastane|fitted|compression)\b/i],
  ["structured knit garments", /\b(interlock|double knit|scuba|spacer)\b/i],
];

function usage() {
  console.log(`Usage:
  node scripts/b2b_outreach.js --search [--limit 5] [--pool-size 30]
  node scripts/b2b_outreach.js --input data/outreach_candidates.example.csv [--limit 5]
  node scripts/b2b_outreach.js --from-report reports/outreach-YYYY-MM-DD-HHMM.json --send
  node scripts/b2b_outreach.js --smtp-test-to your@qq.com
  node scripts/b2b_outreach.js --check-bounces

Options:
  --search                    Discover candidates with Brave Search API.
  --query TEXT                Add a custom search query. Implies --search.
  --input PATH                CSV or JSON candidate source.
  --from-report PATH          Send approved leads from a previous JSON report.
  --limit N                   Number of daily selected leads. Default: 5.
  --pool-size N               Max candidates to enrich from search/input. Default: 30.
  --send                      Send approved emails through QQ SMTP.
  --smtp-test-to EMAIL        Send one SMTP test email and do not update leads.
  --check-bounces             Check QQ mailbox for bounces and remove matching leads.
  --no-bounce-check           Do not check bounces after sending.
  --bounce-lookback-days N    Days of mailbox history to inspect. Default: 3.
  --bounce-wait-seconds N     Wait before post-send bounce check. Default: 30.
  --approve-send              Allow same-run sending without editing approvalStatus.
  --no-enrich                 Skip website contact-page checks.
  --env PATH                  Env file. Default: .env.outreach.local.
  --report-dir PATH           Report directory. Default: reports.
  --lead-db PATH              Long-term lead CSV. Default: data/outreach_leads.csv.
  --sent-log PATH             Sent log CSV used to skip already-contacted emails.
  --keyword-bank PATH         Keyword bank JSON. Default: data/outreach_keyword_bank.json.
  --keywords-csv PATH         Keyword CSV for post-run learning. Default: data/outreach_keywords.csv.
  --no-postrun-learning       Do not run the post-send learning update.
  --postrun-learning-script PATH
                              Override post-run learning script path.
  --no-lead-db                Do not update the long-term lead CSV.
  --follow-up                 Allow sending to already-contacted leads from an approved follow-up input.
  --delay-ms N                Delay between public page fetches. Default: 600.
  --dry-run                   Never send email. Local reports and lead CSV still update.
  --help                      Show this help.
`);
}

function parseArgs(argv) {
  const args = {
    envPath: DEFAULT_ENV_PATH,
    reportDir: DEFAULT_REPORT_DIR,
    suppressionFile: DEFAULT_SUPPRESSION_FILE,
    leadDbFile: DEFAULT_LEAD_DB_FILE,
    bounceLogFile: DEFAULT_BOUNCE_LOG_FILE,
    sentLogFile: DEFAULT_SENT_LOG_FILE,
    keywordBankFile: DEFAULT_KEYWORD_BANK_FILE,
    keywordsCsvFile: DEFAULT_KEYWORDS_CSV_FILE,
    postRunLearning: true,
    postRunLearningScript: DEFAULT_POSTRUN_LEARNING_SCRIPT,
    writeLeadDb: true,
    input: null,
    fromReport: null,
    queries: [],
    search: false,
    send: false,
    smtpTestTo: "",
    checkBouncesOnly: false,
    checkBouncesAfterSend: true,
    bounceLookbackDays: 3,
    bounceWaitSeconds: 30,
    approveSend: false,
    dryRun: false,
    enrich: true,
    followUpMode: false,
    limit: 5,
    poolSize: 30,
    delayMs: 600,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--search") args.search = true;
    else if (arg === "--query") {
      args.queries.push(requireValue(argv, ++i, arg));
      args.search = true;
    } else if (arg === "--input") args.input = requireValue(argv, ++i, arg);
    else if (arg === "--from-report") args.fromReport = requireValue(argv, ++i, arg);
    else if (arg === "--limit") args.limit = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--pool-size") args.poolSize = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--delay-ms") args.delayMs = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--env") args.envPath = requireValue(argv, ++i, arg);
    else if (arg === "--report-dir") args.reportDir = requireValue(argv, ++i, arg);
    else if (arg === "--lead-db") args.leadDbFile = requireValue(argv, ++i, arg);
    else if (arg === "--sent-log") args.sentLogFile = requireValue(argv, ++i, arg);
    else if (arg === "--keyword-bank") args.keywordBankFile = requireValue(argv, ++i, arg);
    else if (arg === "--keywords-csv") args.keywordsCsvFile = requireValue(argv, ++i, arg);
    else if (arg === "--no-postrun-learning") args.postRunLearning = false;
    else if (arg === "--postrun-learning-script") args.postRunLearningScript = requireValue(argv, ++i, arg);
    else if (arg === "--bounce-log") args.bounceLogFile = requireValue(argv, ++i, arg);
    else if (arg === "--suppression-file") args.suppressionFile = requireValue(argv, ++i, arg);
    else if (arg === "--no-lead-db") args.writeLeadDb = false;
    else if (arg === "--send") args.send = true;
    else if (arg === "--smtp-test-to") args.smtpTestTo = cleanEmail(requireValue(argv, ++i, arg));
    else if (arg === "--check-bounces") args.checkBouncesOnly = true;
    else if (arg === "--no-bounce-check") args.checkBouncesAfterSend = false;
    else if (arg === "--bounce-lookback-days") args.bounceLookbackDays = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--bounce-wait-seconds") args.bounceWaitSeconds = numberArg(requireValue(argv, ++i, arg), arg);
    else if (arg === "--approve-send") args.approveSend = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--no-enrich") args.enrich = false;
    else if (arg === "--follow-up") args.followUpMode = true;
    else die(`Unknown option: ${arg}`);
  }

  if (args.limit < 1 || args.limit > 100) die("--limit must be between 1 and 100.");
  if (args.poolSize < args.limit) args.poolSize = args.limit;
  if (args.bounceLookbackDays < 1 || args.bounceLookbackDays > 30) die("--bounce-lookback-days must be between 1 and 30.");
  if (args.bounceWaitSeconds < 0 || args.bounceWaitSeconds > 600) die("--bounce-wait-seconds must be between 0 and 600.");
  if (args.smtpTestTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.smtpTestTo)) {
    die("--smtp-test-to requires a valid email address.");
  }
  if (args.fromReport && (args.input || args.search)) {
    die("--from-report cannot be combined with --input or --search.");
  }
  return args;
}

function requireValue(argv, index, flag) {
  if (!argv[index]) die(`${flag} requires a value.`);
  return argv[index];
}

function numberArg(value, flag) {
  const n = Number(value);
  if (!Number.isFinite(n)) die(`${flag} requires a number.`);
  return n;
}

function die(message) {
  console.error(message);
  process.exit(2);
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  for (const key of [
    "OUTREACH_DAILY_SEND_LIMIT",
    "OUTREACH_MIN_SECONDS_BETWEEN_EMAILS",
    "OUTREACH_BOUNCE_WAIT_SECONDS",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function boolEnv(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""));
}

function loadConfirmedContactInfo() {
  if (ACTIVE_CONTACT_INFO) return ACTIVE_CONTACT_INFO;

  const contactPath = path.resolve(__dirname, "..", "config", "social-contact.json");
  if (!fs.existsSync(contactPath)) {
    die("Missing config/social-contact.json. Cannot build outreach copy with unverified contact information.");
  }

  let contact;
  try {
    contact = JSON.parse(fs.readFileSync(contactPath, "utf8"));
  } catch (error) {
    die(`Cannot parse config/social-contact.json: ${error.message}`);
  }

  const required = [
    "company",
    "contactPerson",
    "website",
    "whatsappUrl",
    "phoneDisplay",
    "wechat",
    "email",
    "address",
  ];
  const missing = required.filter((field) => !String(contact[field] || "").trim());

  if (contact.confirmed !== true || missing.length) {
    die(
      `Contact information is not confirmed. Update config/social-contact.json before generating outreach copy. Missing: ${missing.join(", ") || "none"}.`
    );
  }

  ACTIVE_CONTACT_INFO = contact;
  return ACTIVE_CONTACT_INFO;
}

function productIntroAttachmentFromContact(contact, env) {
  if (boolEnv(env.OUTREACH_DISABLE_PRODUCT_INTRO_ATTACHMENT)) return null;

  const configured = contact.productIntroAttachment;
  const envPath = env.OUTREACH_PRODUCT_INTRO_ATTACHMENT;
  if (!configured && !envPath) return null;

  const attachment = configured || {};
  const rawPath = envPath || attachment.path;
  const attachmentPath = path.resolve(__dirname, "..", String(rawPath || ""));
  if (!String(rawPath || "").trim()) {
    die("Product intro attachment is configured but path is missing.");
  }
  if (!fs.existsSync(attachmentPath)) {
    die(`Product intro attachment does not exist: ${rawPath}`);
  }

  return {
    path: attachmentPath,
    filename: attachment.filename || path.basename(attachmentPath),
    contentType:
      attachment.contentType ||
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const env = { ...process.env, ...loadEnvFile(args.envPath) };
  const runAt = new Date();
  if (env.OUTREACH_LEAD_DB_FILE && args.leadDbFile === DEFAULT_LEAD_DB_FILE) {
    args.leadDbFile = env.OUTREACH_LEAD_DB_FILE;
  }
  if (env.OUTREACH_BOUNCE_LOG_FILE && args.bounceLogFile === DEFAULT_BOUNCE_LOG_FILE) {
    args.bounceLogFile = env.OUTREACH_BOUNCE_LOG_FILE;
  }
  if (env.OUTREACH_SENT_LOG_FILE && args.sentLogFile === DEFAULT_SENT_LOG_FILE) {
    args.sentLogFile = env.OUTREACH_SENT_LOG_FILE;
  }
  if (env.OUTREACH_KEYWORD_BANK_FILE && args.keywordBankFile === DEFAULT_KEYWORD_BANK_FILE) {
    args.keywordBankFile = env.OUTREACH_KEYWORD_BANK_FILE;
  }
  if (env.OUTREACH_KEYWORDS_CSV_FILE && args.keywordsCsvFile === DEFAULT_KEYWORDS_CSV_FILE) {
    args.keywordsCsvFile = env.OUTREACH_KEYWORDS_CSV_FILE;
  }
  ACTIVE_KEYWORD_BANK = loadKeywordBank(args.keywordBankFile);
  if (env.OUTREACH_CHECK_BOUNCES_AFTER_SEND) {
    args.checkBouncesAfterSend = boolEnv(env.OUTREACH_CHECK_BOUNCES_AFTER_SEND);
  }
  if (env.OUTREACH_BOUNCE_LOOKBACK_DAYS) {
    args.bounceLookbackDays = Number(env.OUTREACH_BOUNCE_LOOKBACK_DAYS);
  }
  if (env.OUTREACH_BOUNCE_WAIT_SECONDS) {
    args.bounceWaitSeconds = Number(env.OUTREACH_BOUNCE_WAIT_SECONDS);
  }
  const effectiveDryRun = args.dryRun || boolEnv(env.OUTREACH_DRY_RUN);
  if (args.smtpTestTo && !effectiveDryRun) {
    requireAutomationEnabled("outreachSmtpTest", {
      action: "QQ SMTP test email",
      dryRun: effectiveDryRun,
    });
  }
  if (args.send && !effectiveDryRun) {
    requireAutomationEnabled("outreachEmailSending", {
      action: "QQ SMTP outreach sending",
      dryRun: effectiveDryRun,
    });
  }
  if (args.smtpTestTo) {
    const result = await runSmtpTest(args.smtpTestTo, args, env);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  if (args.checkBouncesOnly) {
    const bounceCleanup = await checkAndCleanBouncedLeads(args, env, {
      runAt,
      sentEmails: [],
      reportJsonPath: "",
      reportMarkdownPath: "",
    });
    console.log(JSON.stringify({ ok: true, bounceCleanup }, null, 2));
    return;
  }
  const suppression = loadSuppression(args.suppressionFile);
  const alreadyContacted = loadAlreadyContacted(args.sentLogFile, args.leadDbFile);

  let pool = [];
  let selected = [];
  let marketRejected = [];
  let sourceMode = "new-run";

  if (args.fromReport) {
    const previous = JSON.parse(fs.readFileSync(args.fromReport, "utf8"));
    selected = (previous.selected || []).map((candidate) => normalizeCandidate(candidate));
    sourceMode = `from-report:${args.fromReport}`;
  } else {
    if (args.input) {
      pool.push(...readInputCandidates(args.input));
    }
    if (args.search) {
      pool.push(...(await discoverWithSearch(args, env)));
    }
    if (!pool.length) {
      die("No candidates. Use --search with BRAVE_SEARCH_API_KEY or provide --input CSV/JSON.");
    }

    pool = mergeCandidates(pool).slice(0, args.poolSize).map((candidate) => normalizeCandidate(candidate));

    if (args.enrich) {
      for (const candidate of pool) {
        await enrichCandidate(candidate, args, env);
      }
    }

    const finalizedPool = pool
      .filter((candidate) => !isSuppressed(candidate, suppression))
      .filter((candidate) => args.followUpMode || !isAlreadyContacted(candidate, alreadyContacted))
      .map((candidate) => finalizeCandidate(candidate, env));
    const marketFilteredPool = filterCandidatesByTargetMarket(finalizedPool);
    pool = args.followUpMode
      ? marketFilteredPool.accepted
      : marketFilteredPool.accepted.sort((a, b) => b.score - a.score || String(a.brandName).localeCompare(String(b.brandName)));
    marketRejected = marketFilteredPool.rejected;

    selected = selectDailyLeads(pool, args.limit).map((candidate) => ({
      ...candidate,
      approvalStatus: "pending",
    }));
  }

  selected = selected.map((candidate) => finalizeCandidate(candidate, env));
  if (!args.followUpMode) {
    selected = selected.filter((candidate) => !isAlreadyContacted(candidate, alreadyContacted));
  }
  if (args.fromReport) {
    const marketFilteredSelected = filterCandidatesByTargetMarket(selected);
    selected = marketFilteredSelected.accepted;
    marketRejected = marketFilteredSelected.rejected;
  }

  let sendResults = [];
  if (args.send && !args.dryRun) {
    sendResults = await sendSelected(selected, args, env, suppression);
  }

  const report = {
    ok: true,
    runAt: runAt.toISOString(),
    localDate: localTimestamp(runAt),
    mode: sourceMode,
    dryRun: args.dryRun,
    sendRequested: args.send,
    selectedCount: selected.length,
    candidatePoolCount: pool.length,
    searchQueries: args.search ? activeQueries(args) : [],
    selected,
    sendResults,
    bounceCleanup: {
      checked: false,
      removedCount: 0,
      removedEmails: [],
      error: null,
    },
    smtpRejectionCleanup: {
      checked: false,
      removedCount: 0,
      removedEmails: [],
      error: null,
    },
    leadDatabase: args.writeLeadDb
      ? {
          path: args.leadDbFile,
          updated: false,
        }
      : {
          path: args.leadDbFile,
          updated: false,
          disabled: true,
        },
    compliance: {
      socialScraping: "disabled",
      privateProfileCollection: "disabled",
      defaultSending: "manual-review-first",
      unsubscribeLine: 'If this is not relevant, reply "no"...',
      suppressionFile: args.suppressionFile,
    },
    marketFilter: {
      enabled: true,
      targetMarkets: TARGET_MARKET_LABEL,
      excludedMarkets: EXCLUDED_MARKET_LABEL,
      rejectedCount: marketRejected.length,
      rejected: marketRejected.slice(0, 50),
    },
    postRunLearning: {
      enabled: Boolean(args.postRunLearning),
      ran: false,
      ok: null,
      learningJson: "",
      learningMarkdown: "",
      error: null,
    },
  };

  const written = writeReports(report, args.reportDir);
  if (args.writeLeadDb) {
    report.leadDatabase = upsertLeadDatabase(args.leadDbFile, selected, {
      runAt,
      sourceMode,
      reportJsonPath: written.jsonPath,
      reportMarkdownPath: written.markdownPath,
      sendResults,
      followUpDays: env.OUTREACH_FOLLOW_UP_DAYS,
    });
    if (args.send && !args.dryRun && args.checkBouncesAfterSend) {
      if (args.bounceWaitSeconds > 0) await sleep(args.bounceWaitSeconds * 1000);
      report.bounceCleanup = await checkAndCleanBouncedLeads(args, env, {
        runAt,
        sentEmails: sendResults.map((item) => item.to).filter(Boolean),
        reportJsonPath: written.jsonPath,
        reportMarkdownPath: written.markdownPath,
      });
    }
    if (args.send && !args.dryRun) {
      report.smtpRejectionCleanup = cleanSmtpRejectedLeads(args, sendResults);
    }
    fs.writeFileSync(written.jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(written.markdownPath, buildMarkdownReport(report, written.jsonPath));
  }
  if (args.send && !args.dryRun && args.postRunLearning) {
    report.postRunLearning = runPostRunLearning(written.jsonPath, args);
    fs.writeFileSync(written.jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(written.markdownPath, buildMarkdownReport(report, written.jsonPath));
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        markdownReport: written.markdownPath,
        jsonReport: written.jsonPath,
        leadDatabase: report.leadDatabase && report.leadDatabase.path ? report.leadDatabase.path : null,
        postRunLearning: report.postRunLearning,
        selected: selected.length,
        sent: sendResults.filter((item) => item.ok).length,
      },
      null,
      2
    )
  );
}

function runPostRunLearning(reportJsonPath, args) {
  const script = args.postRunLearningScript || DEFAULT_POSTRUN_LEARNING_SCRIPT;
  const result = {
    enabled: true,
    ran: true,
    ok: false,
    learningJson: "",
    learningMarkdown: "",
    error: null,
  };

  if (!fs.existsSync(script)) {
    result.error = `Post-run learning script not found: ${script}`;
    return result;
  }

  const child = spawnSync(
    process.execPath,
    [
      script,
      "--summary",
      reportJsonPath,
      "--keyword-bank",
      args.keywordBankFile,
      "--keywords-csv",
      args.keywordsCsvFile,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    }
  );

  if (child.error) {
    result.error = child.error.message;
    return result;
  }
  if (child.status !== 0) {
    result.error = (child.stderr || child.stdout || `Post-run learning exited ${child.status}`).trim();
    return result;
  }

  try {
    const parsed = JSON.parse(child.stdout);
    result.ok = Boolean(parsed.ok);
    result.learningJson = parsed.learningJson || "";
    result.learningMarkdown = parsed.learningMarkdown || "";
    result.error = parsed.ok ? null : parsed.error || "Post-run learning returned ok=false";
  } catch (error) {
    result.error = `Cannot parse post-run learning output: ${error.message}`;
  }
  return result;
}

function activeQueries(args) {
  if (args.queries.length) return args.queries;
  if (ACTIVE_KEYWORD_BANK && Array.isArray(ACTIVE_KEYWORD_BANK.searchQueries)) {
    const queries = ACTIVE_KEYWORD_BANK.searchQueries.map((query) => cleanText(query)).filter(Boolean);
    if (queries.length) return queries;
  }
  return DEFAULT_QUERIES;
}

function loadKeywordBank(file) {
  if (!file || !fs.existsSync(file)) {
    if (file && file !== DEFAULT_KEYWORD_BANK_FILE && fs.existsSync(DEFAULT_KEYWORD_BANK_FILE)) {
      return loadKeywordBank(DEFAULT_KEYWORD_BANK_FILE);
    }
    return null;
  }
  try {
    const bank = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!bank || typeof bank !== "object") return null;
    return bank;
  } catch (error) {
    die(`Cannot read keyword bank ${file}: ${error.message}`);
  }
}

async function discoverWithSearch(args, env) {
  const key = env.BRAVE_SEARCH_API_KEY;
  if (!key) {
    die("BRAVE_SEARCH_API_KEY is required for --search. Or use --input with CSV/JSON.");
  }
  const candidates = [];
  const queries = activeQueries(args);
  const perQuery = Math.max(5, Math.ceil(args.poolSize / queries.length));

  for (const query of queries) {
    const results = await braveSearch(query, key, perQuery, env);
    for (const result of results) {
      const candidate = candidateFromSearchResult(result, query);
      if (candidate) candidates.push(candidate);
    }
    await sleep(350);
  }
  return candidates;
}

async function braveSearch(query, apiKey, count, env) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.max(1, Math.min(20, count))));
  url.searchParams.set("search_lang", env.SEARCH_LANG || "en");
  url.searchParams.set("country", env.SEARCH_COUNTRY || "US");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-Subscription-Token": apiKey,
      "User-Agent": "BingoTextileOutreach/1.0",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brave Search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  return (json.web && json.web.results ? json.web.results : []).map((item) => ({
    title: item.title || "",
    url: item.url || "",
    description: item.description || "",
  }));
}

function candidateFromSearchResult(result, query) {
  const url = toUrl(result.url);
  if (!url) return null;
  const host = canonicalHost(url.hostname);
  if (!host || isSkippedDomain(host)) return null;

  const origin = `${url.protocol}//${url.hostname}`;
  const combined = `${result.title}\n${result.description}\n${url.href}`;
  return normalizeCandidate({
    brandName: brandFromTitle(result.title, host),
    country: inferCountry(origin, combined),
    website: origin,
    sourceLinks: [url.href],
    searchQuery: query,
    productType: productSignalFrom(combined),
    recentSignal: recentSignalFrom(combined),
    priceTier: priceTierFrom(combined),
    notes: stripHtml(result.description),
  });
}

function readInputCandidates(inputPath) {
  const content = fs.readFileSync(inputPath, "utf8");
  if (/\.json$/i.test(inputPath)) {
    const json = JSON.parse(content);
    if (!Array.isArray(json)) die("Input JSON must be an array of candidates.");
    return json.map((candidate) => normalizeCandidate(candidate));
  }
  return parseCsv(content).map((row) => normalizeCandidate(row));
}

function parseCsv(content) {
  const rows = parseCsvRows(content);
  if (!rows.length) return [];

  const headers = rows.shift().map((header) => canonicalField(header));
  const headerCount = headers.length;
  rows.forEach((cells, index) => {
    if (cells.length > headerCount) {
      die(
        `Input CSV row ${index + 2} has ${cells.length} columns but header has ${headerCount}. ` +
          "Check for extra commas or quote fields that contain commas."
      );
    }
  });
  return rows.map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = (cells[index] || "").trim();
    });
    return item;
  });
}

function parseCsvRawRecords(content) {
  const rows = parseCsvRows(content);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => String(header || "").trim());
  return rows.map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = (cells[index] || "").trim();
    });
    return item;
  });
}

function parseCsvRows(content) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function canonicalField(header) {
  const key = String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const map = {
    brand: "brandName",
    brand_name: "brandName",
    brandname: "brandName",
    name: "brandName",
    country: "country",
    region: "country",
    website: "website",
    site: "website",
    url: "website",
    instagram: "instagramUrl",
    instagram_url: "instagramUrl",
    instagramurl: "instagramUrl",
    facebook: "facebookUrl",
    facebook_url: "facebookUrl",
    facebookurl: "facebookUrl",
    email: "businessEmail",
    business_email: "businessEmail",
    businessemail: "businessEmail",
    contact_email: "businessEmail",
    personal_email: "businessEmail",
    public_email: "businessEmail",
    owner_email: "businessEmail",
    designer_email: "businessEmail",
    founder_email: "businessEmail",
    contact: "contactName",
    contact_name: "contactName",
    contactname: "contactName",
    person: "contactName",
    person_name: "contactName",
    founder: "contactName",
    owner: "contactName",
    designer: "contactName",
    role: "contactRole",
    contact_role: "contactRole",
    contactrole: "contactRole",
    title: "contactRole",
    job_title: "contactRole",
    contact_source: "contactSource",
    contactsource: "contactSource",
    personal_email_allowed: "personalEmailAllowed",
    personalemailallowed: "personalEmailAllowed",
    product: "productType",
    product_type: "productType",
    producttype: "productType",
    price: "priceTier",
    price_tier: "priceTier",
    pricetier: "priceTier",
    recent: "recentSignal",
    recent_signal: "recentSignal",
    recentsignal: "recentSignal",
    source: "sourceLinks",
    source_link: "sourceLinks",
    source_links: "sourceLinks",
    sourcelinks: "sourceLinks",
    notes: "notes",
    why: "whyFit",
  };
  return map[key] || key;
}

function normalizeCandidate(raw) {
  const candidate = { ...raw };
  candidate.brandName = cleanText(candidate.brandName || candidate.brand || candidate.name || "");
  candidate.country = cleanText(candidate.country || "");
  candidate.website = cleanUrl(candidate.website || candidate.site || candidate.url || "");
  candidate.instagramUrl = cleanUrl(candidate.instagramUrl || candidate.instagram || "");
  candidate.facebookUrl = cleanUrl(candidate.facebookUrl || candidate.facebook || "");
  candidate.businessEmail = cleanEmail(candidate.businessEmail || candidate.email || "");
  candidate.contactName = cleanText(candidate.contactName || candidate.contact || candidate.person || "");
  candidate.contactRole = cleanText(candidate.contactRole || candidate.role || candidate.title || "");
  candidate.contactSource = cleanUrl(candidate.contactSource || "");
  candidate.personalEmailAllowed = boolishText(candidate.personalEmailAllowed || "");
  candidate.productType = cleanText(candidate.productType || candidate.product || "");
  candidate.priceTier = cleanText(candidate.priceTier || candidate.price || "");
  candidate.recentSignal = cleanText(candidate.recentSignal || candidate.recent || "");
  candidate.notes = cleanText(candidate.notes || "");
  candidate.whyFit = cleanText(candidate.whyFit || "");
  candidate.emailSubject = cleanText(candidate.emailSubject || candidate.subject || "");
  candidate.emailBody = String(candidate.emailBody || candidate.body || "").trim();
  candidate.searchQuery = cleanText(candidate.searchQuery || "");
  candidate.sourceLinks = normalizeLinks(candidate.sourceLinks || candidate.source || candidate.sourceLink || "");
  candidate.checkedPages = Array.isArray(candidate.checkedPages) ? candidate.checkedPages : [];
  candidate.emailSource = cleanUrl(candidate.emailSource || "");
  candidate.approvalStatus = cleanText(candidate.approvalStatus || candidate.approval || "");
  return candidate;
}

function normalizeLinks(value) {
  if (Array.isArray(value)) return value.map((link) => cleanUrl(link)).filter(Boolean);
  return String(value || "")
    .split(/[;\n]+/)
    .map((link) => cleanUrl(link.trim()))
    .filter(Boolean);
}

function mergeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    const key = candidateKey(normalized);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      continue;
    }
    byKey.set(key, mergeCandidate(existing, normalized));
  }
  return [...byKey.values()];
}

function mergeCandidate(a, b) {
  const merged = { ...a };
  for (const key of [
    "brandName",
    "country",
    "website",
    "instagramUrl",
    "facebookUrl",
    "businessEmail",
    "contactName",
    "contactRole",
    "contactSource",
    "personalEmailAllowed",
    "productType",
    "priceTier",
    "recentSignal",
    "notes",
    "whyFit",
    "searchQuery",
    "emailSource",
  ]) {
    if (!merged[key] && b[key]) merged[key] = b[key];
  }
  merged.sourceLinks = unique([...(a.sourceLinks || []), ...(b.sourceLinks || [])]);
  merged.checkedPages = unique([...(a.checkedPages || []), ...(b.checkedPages || [])]);
  return merged;
}

function candidateKey(candidate) {
  const host = candidate.website ? canonicalHost(toUrl(candidate.website)?.hostname || "") : "";
  if (host && !isSkippedDomain(host)) return host.replace(/^www\./, "");
  if (candidate.businessEmail) return candidate.businessEmail.toLowerCase();
  if (candidate.brandName) return candidate.brandName.toLowerCase();
  return "";
}

async function enrichCandidate(candidate, args, env) {
  const startUrl = toUrl(candidate.website || candidate.sourceLinks[0] || "");
  if (!startUrl || isSkippedDomain(canonicalHost(startUrl.hostname))) return candidate;

  const origin = `${startUrl.protocol}//${startUrl.hostname}`;
  candidate.website = candidate.website || origin;

  const maxPages = Number(env.OUTREACH_MAX_PAGES_PER_CANDIDATE || 4);
  const queue = unique([
    ...candidate.sourceLinks.filter((link) => sameHost(link, origin)),
    origin,
    ...CONTACT_PATHS.map((pagePath) => `${origin}${pagePath}`),
  ]).slice(0, Math.max(1, maxPages + 3));

  const seen = new Set();
  const combinedText = [];
  const businessEmails = candidate.businessEmail ? [candidate.businessEmail] : [];

  for (let i = 0; i < queue.length && candidate.checkedPages.length < maxPages; i += 1) {
    const pageUrl = queue[i];
    if (seen.has(pageUrl) || !sameHost(pageUrl, origin)) continue;
    seen.add(pageUrl);

    const page = await fetchPublicPage(pageUrl);
    if (!page.ok) continue;

    candidate.checkedPages.push(page.url);
    const text = htmlToText(page.html);
    combinedText.push(text.slice(0, 80000));

    for (const email of extractRoleEmails(page.html, canonicalHost(startUrl.hostname))) {
      businessEmails.push(email);
      if (!candidate.businessEmail) {
        candidate.businessEmail = email;
        candidate.emailSource = page.url;
      }
    }

    const social = extractSocialLinks(page.html);
    if (!candidate.instagramUrl && social.instagramUrl) candidate.instagramUrl = social.instagramUrl;
    if (!candidate.facebookUrl && social.facebookUrl) candidate.facebookUrl = social.facebookUrl;

    for (const link of extractRelevantInternalLinks(page.html, origin)) {
      if (!seen.has(link) && queue.length < maxPages + 6) queue.push(link);
    }

    if (args.delayMs > 0) await sleep(args.delayMs);
  }

  candidate.businessEmail = cleanEmail(candidate.businessEmail || businessEmails[0] || "");
  const profile = [
    candidate.brandName,
    candidate.notes,
    candidate.productType,
    candidate.recentSignal,
    ...combinedText,
  ].join("\n");

  if (!candidate.brandName) candidate.brandName = brandFromTitle("", canonicalHost(startUrl.hostname));
  if (!candidate.country) candidate.country = inferCountry(candidate.website, profile);
  if (!candidate.productType) candidate.productType = productSignalFrom(profile);
  if (!candidate.priceTier) candidate.priceTier = priceTierFrom(profile);
  if (!candidate.recentSignal) candidate.recentSignal = recentSignalFrom(profile);
  candidate.profileText = profile.slice(0, 20000);
  return candidate;
}

async function fetchPublicPage(pageUrl) {
  try {
    const response = await fetch(pageUrl, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
        "User-Agent": "BingoTextileOutreach/1.0 (+https://www.bingofabric.com/)",
      },
      signal: AbortSignal.timeout(12000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return { ok: false, url: pageUrl };
    }
    const html = await response.text();
    return { ok: true, url: response.url || pageUrl, html: html.slice(0, 600000) };
  } catch {
    return { ok: false, url: pageUrl };
  }
}

function filterCandidatesByTargetMarket(candidates) {
  const accepted = [];
  const rejected = [];

  for (const candidate of candidates) {
    const market = targetMarketForCandidate(candidate);
    if (market.ok) {
      accepted.push({
        ...candidate,
        country: candidate.country || market.country || "",
        marketFilter: {
          status: "target",
          reason: market.reason,
        },
      });
    } else {
      rejected.push({
        brandName: candidate.brandName || "",
        country: candidate.country || market.country || "",
        website: candidate.website || "",
        businessEmail: candidate.businessEmail || "",
        reason: market.reason,
      });
    }
  }

  return { accepted, rejected };
}

function targetMarketForCandidate(candidate) {
  const normalized = normalizeCandidate(candidate);
  const sourceText = targetMarketSourceText(candidate);
  const website = marketWebsiteFor(normalized);

  const excludedByTld = countryFromExcludedTld(website);
  if (excludedByTld) {
    return {
      ok: false,
      country: excludedByTld,
      reason: `excluded market by website TLD: ${excludedByTld}`,
    };
  }

  const explicitCountry = canonicalCountry(normalized.country);
  const excludedCountry = excludedCountryName(explicitCountry);
  if (excludedCountry) {
    return {
      ok: false,
      country: excludedCountry,
      reason: `excluded market by country: ${excludedCountry}`,
    };
  }

  const targetCountry = targetCountryName(explicitCountry);
  if (targetCountry) {
    return {
      ok: true,
      country: targetCountry,
      reason: `target market country: ${targetCountry}`,
    };
  }

  const excludedHint = excludedMarketFromText(sourceText);
  if (excludedHint) {
    return {
      ok: false,
      country: explicitCountry || excludedHint,
      reason: `excluded market signal found: ${excludedHint}`,
    };
  }

  const inferredCountry = canonicalCountry(inferCountry(website, sourceText));
  const inferredTargetCountry = targetCountryName(inferredCountry);
  if (inferredTargetCountry) {
    return {
      ok: true,
      country: inferredTargetCountry,
      reason: `target market inferred from public signals: ${inferredTargetCountry}`,
    };
  }

  if (!explicitCountry) {
    return {
      ok: false,
      country: "",
      reason: "country/market unknown; manual confirmation required before outreach",
    };
  }

  return {
    ok: false,
    country: explicitCountry,
    reason: `outside fixed target markets: ${explicitCountry}`,
  };
}

function targetMarketSourceText(candidate) {
  const links = [
    ...(Array.isArray(candidate.sourceLinks) ? candidate.sourceLinks : []),
    ...(Array.isArray(candidate.checkedPages) ? candidate.checkedPages : []),
  ];
  return [
    candidate.brandName,
    candidate.country,
    candidate.website,
    candidate.instagramUrl,
    candidate.facebookUrl,
    candidate.businessEmail,
    candidate.contactName,
    candidate.contactRole,
    candidate.productType,
    candidate.priceTier,
    candidate.recentSignal,
    candidate.searchQuery,
    candidate.notes,
    candidate.whyFit,
    candidate.profileText,
    ...links,
  ].join("\n");
}

function marketWebsiteFor(candidate) {
  if (candidate.website) return candidate.website;
  if (candidate.sourceLinks && candidate.sourceLinks.length) return candidate.sourceLinks[0];
  return "";
}

function countryFromExcludedTld(website) {
  const host = website ? canonicalHost(toUrl(website)?.hostname || "") : "";
  if (!host) return "";
  for (const [suffix, country] of EXCLUDED_TLD_MARKETS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return country;
  }
  return "";
}

function excludedMarketFromText(text) {
  for (const [market, pattern] of EXCLUDED_MARKET_HINTS) {
    if (pattern.test(text)) return market;
  }
  return "";
}

function targetCountryName(value) {
  const canonical = canonicalCountry(value);
  return TARGET_COUNTRY_KEYS.get(countryKey(canonical)) || "";
}

function excludedCountryName(value) {
  const canonical = canonicalCountry(value);
  return EXCLUDED_COUNTRY_KEYS.get(countryKey(canonical)) || "";
}

function canonicalCountry(value) {
  const text = cleanText(value || "");
  if (!text) return "";
  const key = countryKey(text);
  return COUNTRY_ALIASES.get(key) || TARGET_COUNTRY_KEYS.get(key) || EXCLUDED_COUNTRY_KEYS.get(key) || text;
}

function countryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function finalizeCandidate(candidate, env) {
  const normalized = normalizeCandidate(candidate);
  const sourceText = [
    normalized.brandName,
    normalized.contactName,
    normalized.contactRole,
    normalized.notes,
    normalized.productType,
    normalized.recentSignal,
    normalized.priceTier,
    candidate.profileText || "",
  ].join("\n");

  if (!normalized.country) normalized.country = inferCountry(normalized.website, sourceText);
  if (!normalized.productType) normalized.productType = productSignalFrom(sourceText);
  if (!normalized.priceTier) normalized.priceTier = priceTierFrom(sourceText);
  if (!normalized.recentSignal) normalized.recentSignal = recentSignalFrom(sourceText);

  const scoring = scoreCandidate(normalized, sourceText);
  const draft = buildEmailDraft(normalized, env);
  const emailBody = formatOutreachEmailBody(normalized.emailBody || draft.body, normalized, env);
  return {
    ...normalized,
    score: scoring.total,
    scoreBreakdown: scoring.breakdown,
    whyFit: normalized.whyFit || buildWhyFit(normalized, scoring),
    emailSubject: normalized.emailSubject || draft.subject,
    emailBody,
  };
}

function selectDailyLeads(pool, limit) {
  const withEmail = pool.filter((candidate) => candidate.businessEmail && !emailDomainMismatchRisk(candidate));
  const withoutEmail = pool.filter((candidate) => !candidate.businessEmail);
  return [...withEmail, ...withoutEmail].slice(0, limit);
}

function scoreCandidate(candidate, sourceText) {
  const breakdown = {};

  const targetCountry = targetCountryName(candidate.country);
  if (targetCountry) {
    breakdown.targetRegion = { score: 20, note: targetCountry };
  } else if (!candidate.country) {
    breakdown.targetRegion = { score: 0, note: "country unknown; blocked by market filter" };
  } else {
    breakdown.targetRegion = { score: 0, note: `outside target markets: ${candidate.country}` };
  }

  const productMatches = productMatchesFrom(sourceText);
  if (productMatches.length >= 2) {
    breakdown.productFit = { score: 25, note: productMatches.slice(0, 3).join("; ") };
  } else if (productMatches.length === 1) {
    breakdown.productFit = { score: 20, note: productMatches[0] };
  } else if (/\b(streetwear|apparel|clothing|garment|collection|drop)\b/i.test(sourceText)) {
    breakdown.productFit = { score: 12, note: "streetwear/apparel signal" };
  } else {
    breakdown.productFit = { score: 5, note: "weak product signal" };
  }

  const tier = String(candidate.priceTier || "").toLowerCase();
  if (/premium|high|luxury|designer/.test(tier)) {
    breakdown.priceTier = { score: 20, note: candidate.priceTier };
  } else if (/mid|upper|contemporary/.test(tier)) {
    breakdown.priceTier = { score: 16, note: candidate.priceTier };
  } else if (/low|budget|cheap/.test(tier)) {
    breakdown.priceTier = { score: 4, note: candidate.priceTier };
  } else {
    breakdown.priceTier = { score: 10, note: "unknown" };
  }

  if (candidate.recentSignal) {
    breakdown.recentDrop = { score: 15, note: candidate.recentSignal };
  } else if (/\b(new arrivals|latest|drop|collection|preorder|pre-order)\b/i.test(sourceText)) {
    breakdown.recentDrop = { score: 10, note: "recent product language found" };
  } else {
    breakdown.recentDrop = { score: 3, note: "no recent signal" };
  }

  const mismatchRisk = emailDomainMismatchRisk(candidate);
  if (candidate.website && candidate.businessEmail && mismatchRisk) {
    breakdown.publicContact = {
      score: 1,
      note: `${candidate.businessEmail}; manual review: email domain ${mismatchRisk.emailDomain} differs from website ${mismatchRisk.websiteDomain}`,
    };
    breakdown.emailDomainRisk = {
      score: -20,
      note: "non-free public email domain does not match official website domain",
    };
  } else if (candidate.website && candidate.businessEmail) {
    breakdown.publicContact = { score: 10, note: candidate.businessEmail };
  } else if (candidate.website) {
    breakdown.publicContact = { score: 5, note: "website only" };
  } else {
    breakdown.publicContact = { score: 0, note: "missing website/email" };
  }

  const contactQuality = contactQualityFor(candidate, sourceText);
  breakdown.contactQuality = contactQuality;

  if (/\b(wholesale|stockist|cut and sew|private label|sourcing|sample|sampling|made in|manufacturer|production|blank|custom)\b/i.test(sourceText)) {
    breakdown.sourcingNeed = { score: 8, note: "wholesale/sourcing/development signal" };
  } else if (/\b(independent|small batch|limited drop|preorder|pre-order)\b/i.test(sourceText)) {
    breakdown.sourcingNeed = { score: 5, note: "independent/drop signal" };
  } else {
    breakdown.sourcingNeed = { score: 1, note: "weak sourcing signal" };
  }

  return {
    total: Math.min(100, Object.values(breakdown).reduce((sum, item) => sum + item.score, 0)),
    breakdown,
  };
}

function emailDomainMismatchRisk(candidate) {
  const emailDomainRaw = domainFromEmail(candidate && candidate.businessEmail);
  if (!emailDomainRaw) return null;
  const emailHost = canonicalHost(emailDomainRaw);
  if (FREE_EMAIL_DOMAINS.has(emailHost)) return null;

  const websiteUrl = toUrl(candidate && candidate.website);
  if (!websiteUrl) return null;
  const websiteDomain = registrableDomain(websiteUrl.hostname);
  const emailDomain = registrableDomain(emailHost);
  if (!websiteDomain || !emailDomain) return null;
  if (HOSTED_STORE_DOMAINS.has(websiteDomain)) return null;
  if (websiteDomain === emailDomain) return null;
  return { websiteDomain, emailDomain };
}

function buildWhyFit(candidate, scoring) {
  const notes = [
    scoring.breakdown.targetRegion.note,
    scoring.breakdown.productFit.note,
    scoring.breakdown.priceTier.note !== "unknown" ? scoring.breakdown.priceTier.note : "",
    scoring.breakdown.recentDrop.note !== "no recent signal" ? scoring.breakdown.recentDrop.note : "",
    scoring.breakdown.contactQuality && scoring.breakdown.contactQuality.note !== "no decision-maker signal"
      ? scoring.breakdown.contactQuality.note
      : "",
    scoring.breakdown.sourcingNeed.note,
  ].filter(Boolean);
  return `Matches Bingo garment-development outreach because of ${notes.join(", ")}.`;
}

function contactQualityFor(candidate, sourceText) {
  const explicit = [candidate.contactName, candidate.contactRole].filter(Boolean).join(" - ");
  const haystack = [explicit, sourceText].join("\n");
  const matchedRoles = DECISION_MAKER_ROLE_PATTERNS.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
  if (matchedRoles.some((label) => /founder|owner|creative|designer/.test(label))) {
    return { score: 5, note: `decision-maker contact signal: ${matchedRoles.slice(0, 2).join("; ")}` };
  }
  if (matchedRoles.length) {
    return { score: 3, note: `relevant contact signal: ${matchedRoles.slice(0, 2).join("; ")}` };
  }
  if (candidate.contactName || candidate.contactRole) {
    return { score: 2, note: `named public contact: ${explicit || candidate.contactName || candidate.contactRole}` };
  }
  return { score: 0, note: "no decision-maker signal" };
}

function productMatchesFrom(text) {
  const builtIn = PRODUCT_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  const bankMatches = keywordBankProductMatches(text);
  return unique([...builtIn, ...bankMatches]);
}

function keywordBankProductMatches(text) {
  if (!ACTIVE_KEYWORD_BANK || !Array.isArray(ACTIVE_KEYWORD_BANK.productFamilies)) return [];
  const haystack = String(text || "").toLowerCase();
  const matches = [];
  for (const family of ACTIVE_KEYWORD_BANK.productFamilies) {
    const keywords = Array.isArray(family.keywords) ? family.keywords : [];
    if (keywords.some((keyword) => keyword && haystack.includes(String(keyword).toLowerCase()))) {
      matches.push(cleanText(family.label || family.id || ""));
    }
  }
  return matches.filter(Boolean);
}

function buildEmailDraft(candidate, env) {
  const contact = loadConfirmedContactInfo();
  const brand = candidate.brandName || "your brand";
  const recipientName = firstName(candidate.contactName);
  const salutation = recipientName || `${brand} team`;
  const product = candidate.productType || "streetwear tees and hoodies";
  const signal = emailSignalPhrase(candidate);
  const sentenceSignal = sentenceCase(signal);
  const variant = candidateVariantIndex(candidate, 4);
  const shortProduct = shortProductName(product);
  const valuePoint = garmentDevelopmentValuePoint(product, candidate);

  const subject = [
    `Private-label garment note for ${brand}`,
    `A garment development thought for ${brand}`,
    `${shortProduct[0].toUpperCase()}${shortProduct.slice(1)} development idea`,
    `A question about your next ${shortProduct}`,
  ][variant];
  const opener = [
    `I came across ${brand} while looking at ${signal}.`,
    `I was looking through ${brand} and noticed ${signal}.`,
    `${sentenceSignal} caught my attention on ${brand}.`,
    `I found ${brand} through your recent product pages and noticed ${signal}.`,
  ][variant];
  const body = `Hi ${salutation},

${opener}

${valuePoint}

${companyIntroParagraph(contact, candidate)}

${catalogReferenceParagraph(contact, candidate, env)}

${whatsappCtaParagraph(candidate)}

${optOutParagraph(candidate)}`;

  return { subject, body: formatOutreachEmailBody(body, candidate, env) };
}

function formatOutreachEmailBody(rawBody, candidate, env) {
  const contact = loadConfirmedContactInfo();
  const attachmentAvailable = hasProductIntroAttachment(contact, env);
  const bodyWithoutFooter = stripExistingEmailFooter(String(rawBody || ""));
  let paragraphs = normalizeEmailParagraphs(bodyWithoutFooter);

  if (!paragraphs.length) {
    const brand = candidate.brandName || "your brand";
    const salutation = firstName(candidate.contactName) || `${brand} team`;
    paragraphs = [`Hi ${salutation},`, `I noticed ${brand}'s work around ${candidate.recentSignal || candidate.productType || "knit apparel"}.`];
  }

  paragraphs = ensureShortCompanyIntro(paragraphs, contact);
  paragraphs = humanizeBoilerplateParagraphs(paragraphs, candidate, env);

  const joined = paragraphs.join("\n\n");
  if (attachmentAvailable && !/\battached\b|\bproduct intro\b/i.test(joined)) {
    paragraphs.push(attachmentParagraph(candidate));
  }
  if (!attachmentAvailable && !/\bgarments\.html\b|\bcurrent garment catalog\b/i.test(joined)) {
    paragraphs.push(catalogReferenceParagraph(contact, candidate, env));
  }
  if (!/\bWhatsApp\b.*\b(reference photo|garment link|tech pack|development brief|sample brief)\b/i.test(joined)) {
    paragraphs.push(whatsappCtaParagraph(candidate));
  }
  if (!/\breply\s+[\"“]no[\"”]|\bnot relevant\b/i.test(joined)) {
    paragraphs.push(optOutParagraph(candidate));
  }

  return `${paragraphs.join("\n\n")}\n\n${buildEmailContactFooter(contact, env)}`;
}

function stripExistingEmailFooter(body) {
  const lines = String(body || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const footerPatterns = [
    /^Website:\s*$/i,
    /^Contact(?:\s+details)?:\s*$/i,
    /^If WhatsApp is easier\b/i,
    /^Best,?\s*$/i,
    /^Regards,?\s*$/i,
    /^If this is not relevant\b/i,
  ];

  let cut = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (footerPatterns.some((pattern) => pattern.test(line))) {
      cut = i;
      break;
    }
  }
  return lines.slice(0, cut).join("\n").trim();
}

function normalizeEmailParagraphs(body) {
  return String(body || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

function ensureShortCompanyIntro(paragraphs, contact) {
  const intro = companyIntroParagraph(contact);
  const filtered = paragraphs.filter((paragraph) => !isCompanyIntroParagraph(paragraph, contact));
  const contentStart = /^Hi\b/i.test(filtered[0] || "") ? 1 : 0;
  const closingStart = filtered.findIndex(
    (paragraph, index) => index >= contentStart && /\b(attached|WhatsApp|not relevant|reply\s+[\"“]no[\"”])\b/i.test(paragraph)
  );
  const contentEnd = closingStart >= 0 ? closingStart : filtered.length;
  const insertAt = Math.max(contentStart + 1, Math.min(contentEnd, contentStart + 2));
  return [...filtered.slice(0, insertAt), intro, ...filtered.slice(insertAt)];
}

function humanizeBoilerplateParagraphs(paragraphs, candidate, env) {
  const contact = loadConfirmedContactInfo();
  return paragraphs.map((paragraph) => {
    if (/\b(one-page|short).*\b(product intro|product introduction)\b|\bproduct intro attached\b/i.test(paragraph)) {
      return catalogReferenceParagraph(contact, candidate, env);
    }
    if (/^If you are working on a new sample, send me a reference photo, garment link or tech pack on WhatsApp\. I can first suggest a fabric direction\.?$/i.test(paragraph)) {
      return whatsappCtaParagraph(candidate);
    }
    if (/^If this is not relevant, reply ["“]no["”] and I will not contact you again\.?$/i.test(paragraph)) {
      return optOutParagraph(candidate);
    }
    return paragraph;
  });
}

function isCompanyIntroParagraph(paragraph, contact) {
  const text = String(paragraph || "");
  if (!new RegExp(`\\b${escapeRegExp(contact.company)}\\b`, "i").test(text)) return false;
  return /\b(private-label garment|garment briefs|garment development|helps apparel brands|knit fabric supplier|compare knit fabrics|source and develop|arrange swatches|fabric options|supply knit fabrics|work with knit fabrics|match reference fabric|fabric development)\b/i.test(text);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidateVariantIndex(candidate, count) {
  const key = [
    candidate && candidate.brandName,
    candidate && candidate.businessEmail,
    candidate && candidate.website,
    candidate && candidate.productType,
  ]
    .filter(Boolean)
    .join("|");
  let hash = 0;
  for (const char of key || "default") {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function companyIntroParagraph(contact, candidate = {}) {
  return [
    `I am Jason from ${contact.company} in Guangzhou. We help independent brands organize private-label garment briefs for tees, hoodies and coordinated knit styles, with material sourcing handled as part of development.`,
    `${contact.company} supports streetwear teams with private-label garment development in Guangzhou, starting from a reference image or tech pack and a clear sample brief.`,
    `I coordinate garment development at ${contact.company} in Guangzhou, mainly for knit streetwear styles such as tees, hoodies, sweatpants and related sets.`,
  ][candidateVariantIndex(candidate, 3)];
}

function attachmentParagraph(candidate) {
  return [
    "I attached the configured one-page product introduction for context.",
    "There is a short product introduction attached if you want a quick overview.",
    "I included the configured product overview as an attachment for reference.",
  ][candidateVariantIndex(candidate, 3)];
}

function hasProductIntroAttachment(contact, env) {
  if (boolEnv(env.OUTREACH_DISABLE_PRODUCT_INTRO_ATTACHMENT)) return false;
  const configured = contact.productIntroAttachment || {};
  const rawPath = env.OUTREACH_PRODUCT_INTRO_ATTACHMENT || configured.path || "";
  if (!String(rawPath).trim()) return false;
  return fs.existsSync(path.resolve(__dirname, "..", String(rawPath)));
}

function catalogReferenceParagraph(contact, candidate, env) {
  if (hasProductIntroAttachment(contact, env)) {
    return attachmentParagraph(candidate);
  }

  const catalogUrl = new URL("garments.html", contact.website).href;
  return `Our current garment catalog is at ${catalogUrl}. The images are style references, so we confirm the physical sample, specification and order terms before any bulk commitment.`;
}

function whatsappCtaParagraph(candidate) {
  return [
    "If you have a style in development, send me the reference photo or garment link on WhatsApp. I can review the brief and list the missing inputs before sampling.",
    "If WhatsApp is easier, send the reference photo, garment link or tech pack there. I can first turn it into a clear garment development brief.",
    "If you are planning a new sample, send the reference on WhatsApp. I can check the sample brief before we discuss specifications or price.",
  ][candidateVariantIndex(candidate, 3)];
}

function optOutParagraph(candidate) {
  return [
    'If this is not relevant, reply "no" and I will not contact you again.',
    'If this is not the right contact, just reply "no" and I will leave it there.',
    'If garment development is not relevant right now, reply "no" and I will not follow up.',
  ][candidateVariantIndex(candidate, 3)];
}

function buildEmailContactFooter(contact, env) {
  const fromName = env.OUTREACH_FROM_NAME || contact.contactPerson;
  const lines = [
    "Best,",
    fromName,
    "",
    "Contact:",
    fromName,
    contact.company,
    `Website: ${contact.website}`,
    `WhatsApp: ${contact.whatsappUrl}`,
    `WeChat: ${contact.wechat}`,
    `Phone: ${contact.phoneDisplay}`,
  ];
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.address) lines.push(`Address: ${contact.address}`);
  return lines.join("\n");
}

function garmentDevelopmentValuePoint(product, candidate = {}) {
  const text = String(product || "");
  if (/hoodie|sweat|terry|fleece/i.test(text)) {
    return [
      "For a hoodie sample, I would lock the fit, hood shape, rib recovery and wash result before comparing bulk prices.",
      "For hoodies, a clear sample brief should cover silhouette, fabric hand feel, shrinkage and decoration placement, not only GSM.",
      "If you are developing hoodies or sweats, rib recovery and post-wash measurements are worth agreeing before bulk approval.",
      "For a hoodie program, the base garment, wash and decoration need to be reviewed together because each can change the final fit.",
    ][candidateVariantIndex(candidate, 4)];
  }
  if (/tee|jersey|t-shirt|heavyweight/i.test(text)) {
    return [
      "For a heavyweight tee, fit block, neck rib, hand feel and post-wash measurements should be confirmed before bulk pricing.",
      "With tees, I would define the silhouette and collar balance first, then confirm fabric and decoration on a physical sample.",
      "For an oversized tee, shoulder position, body width and fabric structure need to work together; GSM alone does not define the result.",
      "For graphic tees, print method, surface feel and wash stability are worth checking on the same approval sample.",
    ][candidateVariantIndex(candidate, 4)];
  }
  if (/polo|rugby|rib|pique/i.test(text)) {
    return [
      "For polos and rugby shirts, collar shape, placket construction and body measurements should be part of the first sample review.",
      "On a polo program, collar recovery and body balance matter as much as the selected material.",
      "For a rugby or polo sample, I would check shrinkage, collar recovery and seam construction together.",
    ][candidateVariantIndex(candidate, 3)];
  }
  if (/garment|dye|washed|vintage/i.test(text)) {
    return [
      "For garment-dye or washed styles, the base size, wash recipe and post-wash measurements need one approval standard.",
      "If the direction is washed or vintage, the physical sample should confirm both the surface result and the final silhouette.",
      "For garment-wash styles, shrinkage can move the whole fit, so the measurement review belongs after the intended wash.",
    ][candidateVariantIndex(candidate, 3)];
  }
  if (/mesh|sports/i.test(text)) {
    return [
      "For mesh or sports tops, the sample brief should define fit, opacity, recovery and decoration compatibility.",
      "On a sports jersey style, I would check movement, recovery and surface feel on-body, not only the material weight.",
      "For mesh tops, breathability and structure need to be reviewed in the finished silhouette.",
    ][candidateVariantIndex(candidate, 3)];
  }
  if (/stretch|spandex|elastane|fitted/i.test(text)) {
    return [
      "For a fitted stretch style, recovery, torque and post-wash measurements should be checked on the finished sample.",
      "On fitted pieces, the size spec and material recovery need to be reviewed together so the fit remains consistent.",
      "For stretch garments, comfort and recovery both need physical sample approval before bulk.",
    ][candidateVariantIndex(candidate, 3)];
  }
  return [
    "For a new garment style, I would define the target fit, material, decoration and approval standard before asking for a bulk quote.",
    "A clear first sample brief usually saves more time than comparing prices before the fit and construction are fixed.",
    "The reference image is a useful start, but measurements, material and decoration still need to be confirmed on a physical sample.",
  ][candidateVariantIndex(candidate, 3)];
}

function emailSignalPhrase(candidate) {
  const fallback = candidate.productType || "your knit apparel line";
  const productPhrase = productObservationPhrase(candidate.productType);
  let signal = cleanText(candidate.recentSignal || "");

  signal = signal
    .replace(/^preorder page says\s+/i, "")
    .replace(/^official (?:product|contact|shop|returns|privacy|policy|FAQ) page (?:shows|lists|mentions|includes|targets|says)\s+/i, "")
    .replace(/^official (?:contact|shop|returns|privacy|policy|FAQ) page and\s+/i, "")
    .replace(/^official (?:site|homepage|storefront) (?:shows|with|promotes|mentions|lists)\s+/i, "")
    .replace(/^official site privacy contact plus\s+/i, "")
    .replace(/^official (?:shop|site) contact page and\s+/i, "")
    .replace(/^official returns page and site navigation show\s+/i, "")
    .replace(/^official Shopify site with\s+/i, "")
    .replace(/^search result and official site show\s+/i, "")
    .replace(/\s+and (?:public|customer service|domain|support|info|sales) email$/i, "")
    .replace(/\s+and (?:US|UK|Australian|Canada|France) (?:address|store context)$/i, "")
    .trim();

  if (
    !signal ||
    /^wholesale (?:information|inquiries?|enquiries?)$/i.test(signal) ||
    /\b(official|contact|privacy|policy|page|source|email|address|storefront|site|navigation|context|shopify|customer service|signal)\b/i.test(signal)
  ) {
    signal = productPhrase || fallback;
  }

  return signal || productPhrase || fallback;
}

function productObservationPhrase(productType) {
  const text = String(productType || "").toLowerCase();
  const pieces = [];
  if (/hoodie|sweatshirt|sweatpants|jogger|fleece|terry/.test(text)) pieces.push("hoodies and sweats");
  if (/tee|t-shirt|graphic|jersey/.test(text)) pieces.push("tees");
  if (/activewear|gym|legging|sports bra|performance|training|stretch|fitted|compression/.test(text)) {
    pieces.push("activewear");
  }
  if (/polo|rugby|collar|pique/.test(text)) pieces.push("knit polos");
  if (/streetwear|designer|luxury|lifestyle|boutique|fashion/.test(text)) pieces.push("streetwear basics");
  if (!pieces.length && /\b(apparel|clothing|garment|collection)\b/.test(text)) pieces.push("apparel line");
  if (!pieces.length) return "";
  return `your ${joinHumanList(pieces.flatMap(expandProductPhrasePart).slice(0, 3))}`;
}

function expandProductPhrasePart(part) {
  if (part === "hoodies and sweats") return ["hoodies", "sweats"];
  return [part];
}

function joinHumanList(items) {
  const clean = unique(items.map((item) => cleanText(item)).filter(Boolean));
  if (clean.length <= 1) return clean[0] || "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function shortProductName(product) {
  const text = String(product || "").toLowerCase();
  if (/hoodie|sweat|terry|fleece/.test(text)) return "hoodie drop";
  if (/polo|rugby/.test(text)) return "knit polo drop";
  if (/garment|dye|washed/.test(text)) return "washed knit drop";
  if (/mesh|sports/.test(text)) return "jersey drop";
  if (/stretch|fitted/.test(text)) return "stretch jersey drop";
  if (/tee|t-shirt|jersey|heavyweight/.test(text)) return "tee drop";
  return "streetwear drop";
}

async function runSmtpTest(to, args, env) {
  const contact = loadConfirmedContactInfo();
  const dryRun = args.dryRun || boolEnv(env.OUTREACH_DRY_RUN);
  const fromEmail = env.OUTREACH_FROM_EMAIL || env.QQ_SMTP_USER || "";
  const site = contact.website;
  const whatsapp = contact.whatsappUrl;
  const wechat = contact.wechat;
  const phone = contact.phoneDisplay;
  const subject = "SMTP test from Bingo garment outreach";
  const text = `This is a one-email SMTP test from the Bingo garment outreach script.

If you received this email, QQ SMTP sending is working.

Website: ${site}
WhatsApp: ${whatsapp}
WeChat: ${wechat}
Phone: ${phone}

This test does not update the outreach lead database.`;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      sent: false,
      to,
      from: fromEmail || null,
      note: "OUTREACH_DRY_RUN is true or --dry-run was used, so no email was sent.",
    };
  }

  validateSendEnv(env);
  const result = await sendSmtpMail(env, { to, subject, text });
  return {
    ok: result.ok,
    dryRun: false,
    sent: result.ok,
    to,
    from: fromEmail || null,
    messageId: result.messageId || null,
    error: result.error || null,
  };
}

async function sendSelected(selected, args, env, suppression) {
  if (args.dryRun || boolEnv(env.OUTREACH_DRY_RUN)) return [];
  const dailyLimit = Number(env.OUTREACH_DAILY_SEND_LIMIT || 5);
  validateSendEnv(env);
  const productIntroAttachment = productIntroAttachmentFromContact(loadConfirmedContactInfo(), env);

  let sendable = selected.filter((candidate) => candidate.businessEmail && !isSuppressed(candidate, suppression));
  if (args.fromReport) {
    sendable = sendable.filter((candidate) => candidate.approvalStatus === "approved");
  } else if (!args.approveSend) {
    die("Same-run sending requires --approve-send. Safer flow: generate report, edit JSON approvalStatus to approved, then --from-report ... --send.");
  }

  if (!sendable.length) {
    die("No approved leads with businessEmail to send.");
  }
  if (sendable.length > dailyLimit) {
    die(`Refusing to send ${sendable.length} emails because OUTREACH_DAILY_SEND_LIMIT=${dailyLimit}.`);
  }

  const minSeconds = Number(env.OUTREACH_MIN_SECONDS_BETWEEN_EMAILS || 60);
  const results = [];
  for (let i = 0; i < sendable.length; i += 1) {
    const candidate = sendable[i];
    if (i > 0 && minSeconds > 0) await sleep(minSeconds * 1000);
    const emailBody = formatOutreachEmailBody(candidate.emailBody, candidate, env);
    const result = await sendSmtpMail(env, {
      to: candidate.businessEmail,
      subject: candidate.emailSubject,
      text: emailBody,
      attachments: productIntroAttachment ? [productIntroAttachment] : [],
    });
    const sendLogEntry = {
      leadKey: leadKeyForCandidate(candidate),
      brandName: candidate.brandName,
      to: candidate.businessEmail,
      ok: result.ok,
      messageId: result.messageId || null,
      error: result.error ? singleLineText(result.error) : null,
      sentAt: new Date().toISOString(),
    };
    results.push(sendLogEntry);
    appendSendLog([sendLogEntry]);
    if (!result.ok && isSmtp550Error(result.error)) {
      break;
    }
  }
  return results;
}

function isSmtp550Error(error) {
  return /\b550\b/.test(String(error || ""));
}

function cleanSmtpRejectedLeads(args, sendResults) {
  const rejected = (sendResults || []).filter((item) => !item.ok && isSmtp550Error(item.error));
  const emails = rejected.map((item) => cleanEmail(item.to)).filter(Boolean);
  const result = {
    checked: true,
    removedCount: 0,
    removedEmails: [],
    rejectedCount: rejected.length,
    error: null,
  };

  if (!emails.length) return result;

  try {
    appendSuppression(args.suppressionFile, emails, {
      reason: "smtp_550_content_rejected",
      at: new Date().toISOString(),
    });
    appendSmtpRejectionLog("data/outreach_smtp_rejections.csv", rejected);
    const removal = removeLeadsByEmail(args.leadDbFile, new Set(emails));
    result.removedCount = removal.removedCount;
    result.removedEmails = removal.removedEmails;
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

function validateSendEnv(env) {
  const required = ["QQ_SMTP_USER", "QQ_SMTP_AUTH_CODE", "OUTREACH_FROM_NAME", "OUTREACH_PHYSICAL_ADDRESS"];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) die(`Missing send env: ${missing.join(", ")}`);
  if (env.QQ_SMTP_PORT && Number(env.QQ_SMTP_PORT) !== 465) {
    die("This MVP SMTP client supports QQ implicit TLS on port 465 only.");
  }
}

function validateImapEnv(env) {
  const user = env.QQ_IMAP_USER || env.QQ_SMTP_USER;
  const pass = env.QQ_IMAP_AUTH_CODE || env.QQ_SMTP_AUTH_CODE;
  const missing = [];
  if (!user) missing.push("QQ_IMAP_USER or QQ_SMTP_USER");
  if (!pass) missing.push("QQ_IMAP_AUTH_CODE or QQ_SMTP_AUTH_CODE");
  if (missing.length) die(`Missing IMAP env: ${missing.join(", ")}`);
}

async function sendSmtpMail(env, message) {
  const host = env.QQ_SMTP_HOST || "smtp.qq.com";
  const port = Number(env.QQ_SMTP_PORT || 465);
  const user = env.QQ_SMTP_USER;
  const pass = env.QQ_SMTP_AUTH_CODE;
  const fromEmail = env.OUTREACH_FROM_EMAIL || user;
  const fromName = env.OUTREACH_FROM_NAME || "Jason Huang";
  const replyTo = env.OUTREACH_REPLY_TO || fromEmail;
  const messageId = `<${Date.now()}.${Math.random().toString(16).slice(2)}@${domainFromEmail(fromEmail) || "bingofabric.com"}>`;

  let socket;
  try {
    socket = await connectTls(host, port);
    await expectCode(socket, [220]);
    await command(socket, `EHLO ${domainFromEmail(fromEmail) || "bingofabric.com"}`, [250]);
    await command(socket, "AUTH LOGIN", [334]);
    await command(socket, Buffer.from(user).toString("base64"), [334]);
    await command(socket, Buffer.from(pass).toString("base64"), [235]);
    await command(socket, `MAIL FROM:<${fromEmail}>`, [250]);
    await command(socket, `RCPT TO:<${message.to}>`, [250, 251]);
    await command(socket, "DATA", [354]);
    socket.write(formatEmailMessage({ ...message, fromEmail, fromName, replyTo, messageId }) + "\r\n.\r\n");
    await expectCode(socket, [250]);
    await command(socket, "QUIT", [221]);
    socket.end();
    return { ok: true, messageId };
  } catch (error) {
    if (socket) socket.destroy();
    return { ok: false, error: error.message };
  }
}

async function checkAndCleanBouncedLeads(args, env, context) {
  const result = {
    checked: true,
    checkedAt: new Date().toISOString(),
    lookbackDays: args.bounceLookbackDays,
    removedCount: 0,
    removedEmails: [],
    detectedEmails: [],
    inspectedMessages: 0,
    sourceUids: [],
    error: null,
  };

  try {
    validateImapEnv(env);
    const knownEmails = leadEmailsFromDatabase(args.leadDbFile);
    const sentEmails = new Set((context.sentEmails || []).map((email) => cleanEmail(email)).filter(Boolean));
    const candidateEmails = sentEmails.size ? new Set([...knownEmails].filter((email) => sentEmails.has(email))) : knownEmails;
    if (!candidateEmails.size) return result;

    const bounces = await fetchBouncedEmailsFromImap(env, {
      lookbackDays: args.bounceLookbackDays,
      knownEmails: candidateEmails,
      maxMessages: Number(env.OUTREACH_BOUNCE_MAX_MESSAGES || 80),
    });

    result.inspectedMessages = bounces.inspectedMessages;
    result.sourceUids = bounces.sourceUids;
    result.detectedEmails = [...bounces.emails].sort();

    if (bounces.emails.size) {
      const removal = removeLeadsByEmail(args.leadDbFile, bounces.emails);
      appendSuppression(args.suppressionFile, removal.removedEmails, {
        reason: "smtp_bounce",
        at: result.checkedAt,
      });
      appendBounceLog(args.bounceLogFile, removal.removedEmails, {
        at: result.checkedAt,
        sourceUids: result.sourceUids,
      });
      result.removedCount = removal.removedCount;
      result.removedEmails = removal.removedEmails;
      result.totalRowsAfterRemoval = removal.totalRows;
    }
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

function leadEmailsFromDatabase(file) {
  const emails = new Set();
  if (!fs.existsSync(file)) return emails;
  for (const row of parseCsvRawRecords(fs.readFileSync(file, "utf8"))) {
    const email = cleanEmail(row.businessEmail || "");
    if (email) emails.add(email);
  }
  return emails;
}

async function fetchBouncedEmailsFromImap(env, options) {
  const client = await connectImap(env);
  const result = {
    emails: new Set(),
    inspectedMessages: 0,
    sourceUids: [],
  };

  try {
    await client.command(`LOGIN ${imapQuote(env.QQ_IMAP_USER || env.QQ_SMTP_USER)} ${imapQuote(env.QQ_IMAP_AUTH_CODE || env.QQ_SMTP_AUTH_CODE)}`);
    await client.command('SELECT "INBOX"');

    const since = imapDate(addDays(new Date(), -options.lookbackDays));
    const search = await client.command(`UID SEARCH SINCE ${since}`);
    const uids = parseSearchUids(search)
      .slice(-Math.max(1, options.maxMessages || 80));

    for (const uid of uids) {
      const raw = await client.command(`UID FETCH ${uid} (BODY.PEEK[]<0.50000>)`);
      result.inspectedMessages += 1;
      if (!isBounceMessage(raw)) continue;

      const bounced = bouncedEmailsFromMessage(raw, options.knownEmails);
      if (bounced.length) {
        result.sourceUids.push(uid);
        for (const email of bounced) result.emails.add(email);
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return result;
}

function connectImap(env) {
  const host = env.QQ_IMAP_HOST || "imap.qq.com";
  const port = Number(env.QQ_IMAP_PORT || 993);
  let tagId = 0;

  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, timeout: 30000 }, async () => {
      try {
        await readImapUntil(socket, (text) => /^\* OK/im.test(text));
        resolve({
          command: async (commandText) => {
            tagId += 1;
            const tag = `A${String(tagId).padStart(4, "0")}`;
            socket.write(`${tag} ${commandText}\r\n`);
            const response = await readImapUntil(socket, (text) => new RegExp(`^${tag} (OK|NO|BAD)`, "im").test(text));
            if (new RegExp(`^${tag} (NO|BAD)`, "im").test(response)) {
              throw new Error(`IMAP command failed: ${commandText.replace(/LOGIN .+$/i, "LOGIN [redacted]")}`);
            }
            return response;
          },
          logout: async () => {
            tagId += 1;
            const tag = `A${String(tagId).padStart(4, "0")}`;
            socket.write(`${tag} LOGOUT\r\n`);
            await readImapUntil(socket, (text) => new RegExp(`^${tag} (OK|BYE)`, "im").test(text)).catch(() => {});
            socket.end();
          },
        });
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy(new Error("IMAP connection timeout"));
    });
  });
}

function readImapUntil(socket, done) {
  return new Promise((resolve, reject) => {
    let text = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("IMAP response timeout"));
    }, 30000);
    const onData = (chunk) => {
      text += chunk.toString("utf8");
      if (done(text)) {
        cleanup();
        resolve(text);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

function imapQuote(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseSearchUids(response) {
  const match = response.match(/^\* SEARCH\s+([0-9\s]+)$/im);
  if (!match) return [];
  return match[1].trim().split(/\s+/).filter(Boolean);
}

function isBounceMessage(raw) {
  const text = decodeMimeWords(raw);
  return /mailer-daemon|postmaster|delivery status notification|undeliver|mail delivery failed|failure notice|returned mail|delivery failure|退信|系统退信|发送失败|无法投递|投递失败|邮件被退回|无法发送/i.test(text);
}

function bouncedEmailsFromMessage(raw, knownEmails) {
  const text = decodeMimeWords(raw);
  const found = new Set();
  const directPatterns = [
    /(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*([^\s;<>]+)/gi,
    /X-Failed-Recipients:\s*([^\s,;<>]+)/gi,
    /(?:failed|undeliver(?:ed|able)|无法发送|发送失败|退信|被退回|投递失败)[\s\S]{0,300}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
  ];

  for (const pattern of directPatterns) {
    for (const match of text.matchAll(pattern)) {
      const email = cleanEmail(match[1]);
      if (knownEmails.has(email)) found.add(email);
    }
  }

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    const email = cleanEmail(match[0]);
    if (knownEmails.has(email)) found.add(email);
  }

  return [...found];
}

function removeLeadsByEmail(file, bouncedEmails) {
  if (!fs.existsSync(file)) {
    return { removedCount: 0, removedEmails: [], totalRows: 0 };
  }
  const removeSet = new Set([...bouncedEmails].map((email) => cleanEmail(email)).filter(Boolean));
  const rows = parseCsvRawRecords(fs.readFileSync(file, "utf8"));
  const kept = [];
  const removedEmails = [];

  for (const row of rows) {
    const email = cleanEmail(row.businessEmail || "");
    if (email && removeSet.has(email)) {
      removedEmails.push(email);
    } else {
      kept.push(row);
    }
  }

  writeCsvRecords(file, kept, LEAD_DB_FIELDS);
  return {
    removedCount: removedEmails.length,
    removedEmails: unique(removedEmails).sort(),
    totalRows: kept.length,
  };
}

function appendSuppression(file, emails, meta) {
  const cleanEmails = unique((emails || []).map((email) => cleanEmail(email)).filter(Boolean));
  if (!cleanEmails.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = loadSuppression(file);
  const lines = [];
  for (const email of cleanEmails) {
    if (existing.has(email)) continue;
    lines.push([email, meta.reason || "suppressed", meta.at || new Date().toISOString()].map(csvEscape).join(","));
  }
  if (lines.length) fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

function appendBounceLog(file, emails, meta) {
  const cleanEmails = unique((emails || []).map((email) => cleanEmail(email)).filter(Boolean));
  if (!cleanEmails.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "bouncedAt,email,sourceUids\n");
  }
  const source = (meta.sourceUids || []).join(";");
  const lines = cleanEmails.map((email) => [meta.at || new Date().toISOString(), email, source].map(csvEscape).join(","));
  fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

function appendSmtpRejectionLog(file, rejected) {
  const rows = (rejected || [])
    .map((item) => ({
      at: item.sentAt || new Date().toISOString(),
      email: cleanEmail(item.to || ""),
      brandName: item.brandName || "",
      error: singleLineText(item.error || ""),
    }))
    .filter((item) => item.email);
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "rejectedAt,email,brandName,error\n");
  }
  const lines = rows.map((item) => [item.at, item.email, item.brandName, item.error].map(csvEscape).join(","));
  fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

function connectTls(host, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, timeout: 30000 }, () => {
      resolve(socket);
    });
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy(new Error("SMTP connection timeout"));
    });
  });
}

async function command(socket, line, expectedCodes) {
  socket.write(`${line}\r\n`);
  return expectCode(socket, expectedCodes);
}

async function expectCode(socket, expectedCodes) {
  const response = await readSmtpResponse(socket);
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP expected ${expectedCodes.join("/")} but got ${response.code}: ${response.text}`);
  }
  return response;
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let text = "";
    const onData = (chunk) => {
      text += chunk.toString("utf8");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      const match = last.match(/^(\d{3})\s/);
      if (match) {
        cleanup();
        resolve({ code: Number(match[1]), text });
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP response timeout"));
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

function formatEmailMessage({ fromEmail, fromName, replyTo, to, subject, text, messageId, attachments }) {
  const cleanAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  const headers = [
    `From: ${formatAddress(fromName, fromEmail)}`,
    `To: ${sanitizeHeader(to)}`,
    `Reply-To: ${sanitizeHeader(replyTo)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${sanitizeHeader(messageId)}`,
    "MIME-Version: 1.0",
  ];

  if (!cleanAttachments.length) {
    headers.push('Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit");
    const body = normalizeCrlf(text).replace(/^\./gm, "..");
    return `${headers.join("\r\n")}\r\n\r\n${body}`;
  }

  const boundary = `bingo_${crypto.randomBytes(12).toString("hex")}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeCrlf(text).replace(/^\./gm, ".."),
  ];

  for (const attachment of cleanAttachments) {
    const filename = sanitizeHeader(attachment.filename || path.basename(attachment.path || "attachment"));
    const contentType = sanitizeHeader(attachment.contentType || "application/octet-stream");
    const content = fs.readFileSync(attachment.path).toString("base64").replace(/.{1,76}/g, "$&\r\n").trim();
    parts.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      content
    );
  }
  parts.push(`--${boundary}--`, "");
  const body = parts.join("\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function formatAddress(name, email) {
  return `${encodeHeader(name)} <${sanitizeHeader(email)}>`;
}

function encodeHeader(value) {
  const text = sanitizeHeader(value || "");
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function normalizeCrlf(value) {
  return String(value || "").replace(/\r?\n/g, "\r\n");
}

function upsertLeadDatabase(file, selected, context) {
  const existing = fs.existsSync(file) ? parseCsvRawRecords(fs.readFileSync(file, "utf8")) : [];
  const byKey = new Map();
  const rows = [];

  for (const row of existing) {
    const key = row.leadKey || leadKeyForRow(row);
    if (!key) continue;
    const normalized = { ...row, leadKey: key, leadId: row.leadId || leadIdForKey(key) };
    byKey.set(key, normalized);
    rows.push(normalized);
  }

  const sendByKey = new Map();
  const sendByEmail = new Map();
  for (const result of context.sendResults || []) {
    if (result.leadKey) sendByKey.set(result.leadKey, result);
    if (result.to) sendByEmail.set(String(result.to).toLowerCase(), result);
  }

  let inserted = 0;
  let updated = 0;
  const today = dateOnly(context.runAt);

  for (const candidate of selected) {
    const key = leadKeyForCandidate(candidate);
    if (!key) continue;

    const existingRow = byKey.get(key);
    const sendResult =
      sendByKey.get(key) ||
      (candidate.businessEmail ? sendByEmail.get(String(candidate.businessEmail).toLowerCase()) : null);
    const nextRow = buildLeadRow(existingRow || {}, candidate, {
      ...context,
      today,
      leadKey: key,
      sendResult,
    });

    if (existingRow) {
      Object.assign(existingRow, nextRow);
      updated += 1;
    } else {
      byKey.set(key, nextRow);
      rows.push(nextRow);
      inserted += 1;
    }
  }

  rows.sort((a, b) => {
    const dateCompare = String(b.lastFoundDate || "").localeCompare(String(a.lastFoundDate || ""));
    if (dateCompare) return dateCompare;
    return String(a.brandName || "").localeCompare(String(b.brandName || ""));
  });

  writeCsvRecords(file, rows, LEAD_DB_FIELDS);
  return {
    path: file,
    updated: true,
    inserted,
    changed: updated,
    totalRows: rows.length,
  };
}

function buildLeadRow(existingRow, candidate, context) {
  const sendResult = context.sendResult || null;
  const sentOk = sendResult && sendResult.ok;
  const sentAt = sendResult && sendResult.sentAt ? sendResult.sentAt : existingRow.sentAt || "";
  const firstOutreachDate =
    sentOk && !existingRow.firstOutreachDate ? dateOnly(new Date(sendResult.sentAt)) : existingRow.firstOutreachDate || "";
  const lastOutreachDate = sentOk ? dateOnly(new Date(sendResult.sentAt)) : existingRow.lastOutreachDate || "";
  const status = leadStatusFor(candidate, sendResult, existingRow);

  return {
    leadId: existingRow.leadId || leadIdForKey(context.leadKey),
    leadKey: context.leadKey,
    brandName: candidate.brandName || existingRow.brandName || "",
    country: candidate.country || existingRow.country || "",
    website: candidate.website || existingRow.website || "",
    instagramUrl: candidate.instagramUrl || existingRow.instagramUrl || "",
    facebookUrl: candidate.facebookUrl || existingRow.facebookUrl || "",
    businessEmail: candidate.businessEmail || existingRow.businessEmail || "",
    contactName: candidate.contactName || existingRow.contactName || "",
    contactRole: candidate.contactRole || existingRow.contactRole || "",
    contactSource: candidate.contactSource || existingRow.contactSource || "",
    personalEmailAllowed: candidate.personalEmailAllowed || existingRow.personalEmailAllowed || "",
    productType: candidate.productType || existingRow.productType || "",
    priceTier: candidate.priceTier || existingRow.priceTier || "",
    recentSignal: candidate.recentSignal || existingRow.recentSignal || "",
    score: candidate.score != null ? String(candidate.score) : existingRow.score || "",
    whyFit: candidate.whyFit || existingRow.whyFit || "",
    sourceLinks: joinLeadList(candidate.sourceLinks, existingRow.sourceLinks),
    checkedPages: joinLeadList(candidate.checkedPages, existingRow.checkedPages),
    emailSource: candidate.emailSource || existingRow.emailSource || "",
    firstFoundDate: existingRow.firstFoundDate || context.today,
    lastFoundDate: context.today,
    developmentDate: existingRow.developmentDate || context.today,
    approvalStatus: candidate.approvalStatus || existingRow.approvalStatus || "pending",
    doNotContact: existingRow.doNotContact || "",
    status,
    emailSubject: candidate.emailSubject || existingRow.emailSubject || "",
    sentAt,
    firstOutreachDate,
    lastOutreachDate,
    lastSendOk: sendResult ? String(Boolean(sendResult.ok)) : existingRow.lastSendOk || "",
    messageId: sendResult && sendResult.messageId ? sendResult.messageId : existingRow.messageId || "",
    sendError: sendResult && sendResult.error ? singleLineText(sendResult.error) : sentOk ? "" : existingRow.sendError || "",
    nextFollowUpDate: sentOk ? followUpDate(sendResult.sentAt, context.followUpDays) : existingRow.nextFollowUpDate || "",
    lastReportJson: context.reportJsonPath || existingRow.lastReportJson || "",
    lastReportMarkdown: context.reportMarkdownPath || existingRow.lastReportMarkdown || "",
    searchQuery: candidate.searchQuery || existingRow.searchQuery || "",
    notes: candidate.notes || existingRow.notes || "",
  };
}

function leadStatusFor(candidate, sendResult, existingRow) {
  if (existingRow.doNotContact === "true") return "do_not_contact";
  if (sendResult && sendResult.ok) return "sent";
  if (sendResult && !sendResult.ok) return "send_failed";
  if (candidate.approvalStatus === "approved") return "approved";
  if (existingRow.status === "sent" && existingRow.sentAt) return "sent";
  return "pending_review";
}

function joinLeadList(newValue, oldValue) {
  const current = Array.isArray(newValue) ? newValue : String(newValue || "").split(/[;\n]+/);
  const previous = Array.isArray(oldValue) ? oldValue : String(oldValue || "").split(/[;\n]+/);
  return unique([...previous, ...current].map((item) => cleanUrlOrText(item))).join("; ");
}

function cleanUrlOrText(value) {
  const text = String(value || "").trim();
  return cleanUrl(text) || cleanText(text);
}

function writeCsvRecords(file, records, fields) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = [fields.join(",")];
  for (const record of records) {
    lines.push(fields.map((field) => csvEscape(record[field] || "")).join(","));
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

function leadKeyForCandidate(candidate) {
  const email = cleanEmail(candidate.businessEmail || "");
  if (email) return `email:${email}`;
  const website = toUrl(candidate.website || "");
  if (website) {
    const domain = registrableDomain(website.hostname);
    if (domain) return `domain:${domain}`;
  }
  const sourceUrl = toUrl((candidate.sourceLinks || [])[0] || "");
  if (sourceUrl) {
    const domain = registrableDomain(sourceUrl.hostname);
    if (domain) return `domain:${domain}`;
  }
  const brand = cleanText(candidate.brandName || "").toLowerCase();
  const country = cleanText(candidate.country || "").toLowerCase();
  return brand ? `brand:${brand}:${country}` : "";
}

function leadKeyForRow(row) {
  const email = cleanEmail(row.businessEmail || "");
  if (email) return `email:${email}`;
  const website = toUrl(row.website || "");
  if (website) {
    const domain = registrableDomain(website.hostname);
    if (domain) return `domain:${domain}`;
  }
  const brand = cleanText(row.brandName || "").toLowerCase();
  const country = cleanText(row.country || "").toLowerCase();
  return brand ? `brand:${brand}:${country}` : "";
}

function leadIdForKey(key) {
  return crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
}

function followUpDate(sentAt, followUpDays) {
  const days = Number(followUpDays || 7);
  return addDaysDateOnly(new Date(sentAt), Number.isFinite(days) ? days : 7);
}

function appendSendLog(results) {
  if (!results.length) return;
  fs.mkdirSync("data", { recursive: true });
  const file = "data/outreach_sent_log.csv";
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "sentAt,ok,brandName,to,messageId,error\n");
  }
  const lines = results.map((item) =>
    [
      item.sentAt,
      item.ok ? "true" : "false",
      csvEscape(item.brandName),
      item.to,
      item.messageId || "",
      csvEscape(item.error || ""),
    ].join(",")
  );
  fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

function writeReports(report, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = localTimestamp(new Date()).replace(" ", "-").replace(":", "");
  const jsonPath = path.join(reportDir, `outreach-${stamp}.json`);
  const markdownPath = path.join(reportDir, `outreach-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, buildMarkdownReport(report, jsonPath));
  return { jsonPath, markdownPath };
}

function buildMarkdownReport(report, jsonPath) {
  const lines = [];
  lines.push(`# B2B Outreach Review - ${report.localDate}`);
  lines.push("");
  lines.push(`- 模式: ${report.mode}`);
  lines.push(`- 候选池: ${report.candidatePoolCount}`);
  lines.push(`- 今日推荐: ${report.selectedCount}`);
  lines.push(`- 是否请求发送: ${report.sendRequested ? "是" : "否"}`);
  lines.push(`- 实际发送成功: ${report.sendResults.filter((item) => item.ok).length}`);
  if (report.leadDatabase && report.leadDatabase.path) {
    lines.push(
      `- 客户数据表: ${report.leadDatabase.path}${
        report.leadDatabase.updated
          ? `（新增 ${report.leadDatabase.inserted}，更新 ${report.leadDatabase.changed}，总计 ${report.leadDatabase.totalRows}）`
          : ""
      }`
    );
  }
  if (report.bounceCleanup && report.bounceCleanup.checked) {
    lines.push(
      `- 退信清理: 已检查，删除 ${report.bounceCleanup.removedCount || 0} 个邮箱${
        report.bounceCleanup.error ? `，错误: ${report.bounceCleanup.error}` : ""
      }`
    );
  }
  if (report.smtpRejectionCleanup && report.smtpRejectionCleanup.checked && report.smtpRejectionCleanup.rejectedCount) {
    lines.push(
      `- SMTP 550 清理: 已停止并删除 ${report.smtpRejectionCleanup.removedCount || 0} 个邮箱${
        report.smtpRejectionCleanup.error ? `，错误: ${report.smtpRejectionCleanup.error}` : ""
      }`
    );
  }
  if (report.postRunLearning && report.postRunLearning.ran) {
    lines.push(
      `- 发送后复盘: ${
        report.postRunLearning.ok
          ? `已生成 ${report.postRunLearning.learningMarkdown || report.postRunLearning.learningJson}`
          : `失败，${report.postRunLearning.error || "未知错误"}`
      }`
    );
  }
  lines.push(
    "- 合规边界: 不登录或抓取 Facebook/Instagram；只处理公开官网、公开社媒主页、公开商务邮箱，以及公开用于商务联系的负责人/设计师邮箱。"
  );
  if (report.marketFilter && report.marketFilter.enabled) {
    lines.push(`- 地区硬过滤: 目标市场 ${report.marketFilter.targetMarkets}；排除 ${report.marketFilter.excludedMarkets}。`);
    lines.push(`- 地区过滤剔除: ${report.marketFilter.rejectedCount || 0} 条`);
  }
  lines.push("");
  if (report.marketFilter && report.marketFilter.rejected && report.marketFilter.rejected.length) {
    lines.push("## 地区过滤剔除");
    lines.push("");
    report.marketFilter.rejected.slice(0, 20).forEach((candidate, index) => {
      lines.push(
        `${index + 1}. ${candidate.brandName || "Unknown Brand"} - ${candidate.country || "未知"} - ${
          candidate.reason || "blocked"
        }`
      );
      if (candidate.website) lines.push(`   ${candidate.website}`);
    });
    if (report.marketFilter.rejectedCount > 20) {
      lines.push(`- 其余 ${report.marketFilter.rejectedCount - 20} 条见 JSON 报告。`);
    }
    lines.push("");
  }
  if (report.searchQueries.length) {
    lines.push("## Search Queries");
    for (const query of report.searchQueries) lines.push(`- ${query}`);
    lines.push("");
  }
  lines.push("## 今日推荐候选客户");
  lines.push("");
  report.selected.forEach((candidate, index) => {
    lines.push(`### ${index + 1}. ${candidate.brandName || "Unknown Brand"} - ${candidate.score}/100`);
    lines.push("");
    lines.push(`- 国家/地区: ${candidate.country || "未知"}`);
    lines.push(`- 官网: ${candidate.website || "缺失"}`);
    lines.push(`- Instagram: ${candidate.instagramUrl || "未记录"}`);
    lines.push(`- Facebook: ${candidate.facebookUrl || "未记录"}`);
    lines.push(`- 公开商务邮箱: ${candidate.businessEmail || "缺失，需人工查找"}`);
    lines.push(`- 公开联系人: ${candidate.contactName || "未记录"}`);
    lines.push(`- 联系人角色: ${candidate.contactRole || "未记录"}`);
    lines.push(`- 联系人来源: ${candidate.contactSource || "未记录"}`);
    lines.push(`- 个人邮箱使用边界: ${candidate.personalEmailAllowed === "true" ? "公开商务用途，可用" : "未标记，需人工确认"}`);
    lines.push(`- 产品类型: ${candidate.productType || "未知"}`);
    lines.push(`- 价格层级: ${candidate.priceTier || "未知"}`);
    lines.push(`- 新品/drop 线索: ${candidate.recentSignal || "未发现"}`);
    lines.push(`- 匹配理由: ${candidate.whyFit || ""}`);
    if (candidate.sourceLinks && candidate.sourceLinks.length) {
      lines.push(`- 来源链接: ${candidate.sourceLinks.join("; ")}`);
    }
    if (candidate.checkedPages && candidate.checkedPages.length) {
      lines.push(`- 已检查公开页面: ${candidate.checkedPages.join("; ")}`);
    }
    lines.push("");
    lines.push(`Subject: ${candidate.emailSubject}`);
    lines.push("");
    lines.push("```text");
    lines.push(candidate.emailBody);
    lines.push("```");
    lines.push("");
    lines.push(`- approvalStatus: ${candidate.approvalStatus || "pending"}`);
    lines.push("");
  });

  lines.push("## 发送说明");
  lines.push("");
  lines.push("默认报告只生成草稿，不发送邮件。人工确认后，在 JSON 报告里把对应客户的 `approvalStatus` 改成 `approved`，再运行：");
  lines.push("");
  lines.push("```bash");
  lines.push(`node scripts/b2b_outreach.js --from-report ${jsonPath} --send`);
  lines.push("```");
  lines.push("");
  lines.push("如果要测试同一轮直接发送，必须显式加 `--send --approve-send`，并确保发送总量不超过 `OUTREACH_DAILY_SEND_LIMIT`。");
  return `${lines.join("\n")}\n`;
}

function loadSuppression(file) {
  const suppression = new Set();
  if (!file || !fs.existsSync(file)) return suppression;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split(/\n/)) {
    const value = line.split(",")[0].trim().toLowerCase();
    if (value && !value.startsWith("#")) suppression.add(value);
  }
  return suppression;
}

function loadAlreadyContacted(sentLogFile, leadDbFile) {
  const emails = new Set();
  if (sentLogFile && fs.existsSync(sentLogFile)) {
    for (const row of parseCsvRawRecords(fs.readFileSync(sentLogFile, "utf8"))) {
      if (row.ok === "true") {
        const email = cleanEmail(row.to || row.email || row.businessEmail || "");
        if (email) emails.add(email.toLowerCase());
      }
    }
  }
  if (leadDbFile && fs.existsSync(leadDbFile)) {
    for (const row of parseCsvRawRecords(fs.readFileSync(leadDbFile, "utf8"))) {
      if (row.lastSendOk === "true" || row.status === "sent") {
        const email = cleanEmail(row.businessEmail || "");
        if (email) emails.add(email.toLowerCase());
      }
    }
  }
  return emails;
}

function isAlreadyContacted(candidate, alreadyContacted) {
  if (!alreadyContacted || !alreadyContacted.size) return false;
  const email = cleanEmail(candidate.businessEmail || "");
  return Boolean(email && alreadyContacted.has(email.toLowerCase()));
}

function isSuppressed(candidate, suppression) {
  if (!suppression || !suppression.size) return false;
  const email = String(candidate.businessEmail || "").toLowerCase();
  const domain = email ? domainFromEmail(email) : "";
  const websiteDomain = candidate.website ? canonicalHost(toUrl(candidate.website)?.hostname || "") : "";
  return (
    (email && suppression.has(email)) ||
    (domain && suppression.has(domain)) ||
    (websiteDomain && suppression.has(websiteDomain))
  );
}

function productSignalFrom(text) {
  const matches = productMatchesFrom(text);
  return unique(matches).slice(0, 3).join(", ");
}

function recentSignalFrom(text) {
  const value = stripHtml(text);
  const patterns = [
    /\b(new arrivals?|latest drop|new drop|latest collection|new collection|spring summer|fall winter|autumn winter|ss ?26|fw ?26|preorder|pre-order)\b.{0,80}/i,
    /\b(drop|collection|release|launch)\b.{0,80}/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return cleanText(match[0]).slice(0, 160);
  }
  return "";
}

function priceTierFrom(text) {
  const values = [];
  for (const match of String(text || "").matchAll(/(?:[$£€]\s?)(\d{2,4})(?:\.\d{2})?/g)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 20 && value <= 1000) values.push(value);
  }
  if (!values.length) {
    if (/\b(premium|luxury|designer|made in usa|made in japan|made in england)\b/i.test(text)) return "premium/high";
    if (/\b(affordable|budget|cheap|low price)\b/i.test(text)) return "low";
    return "";
  }
  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  if (median >= 120) return "premium/high";
  if (median >= 55) return "mid/upper";
  return "low";
}

function inferCountry(website, text) {
  const host = website ? canonicalHost(toUrl(website)?.hostname || "") : "";
  for (const [suffix, country] of TLD_COUNTRY_HINTS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return country;
  }
  for (const [country, pattern] of COUNTRY_HINTS) {
    if (pattern.test(text)) return country;
  }
  return "";
}

function extractRoleEmails(html, brandHost) {
  const normalized = decodeEntities(String(html || ""))
    .replace(/\s*(\[at\]|\(at\)|\sat\s)\s*/gi, "@")
    .replace(/\s*(\[dot\]|\(dot\)|\sdot\s)\s*/gi, ".");
  const emails = [];
  for (const match of normalized.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    const email = cleanEmail(match[0]);
    if (email && isRoleBusinessEmail(email, brandHost)) emails.push(email);
  }
  return unique(emails);
}

function isRoleBusinessEmail(email, brandHost) {
  const [localRaw, domainRaw] = String(email).toLowerCase().split("@");
  if (!localRaw || !domainRaw) return false;
  const local = localRaw.split("+")[0];
  const compact = local.replace(/[^a-z]/g, "");
  if (REJECT_EMAIL_PARTS.some((part) => compact.includes(part.replace(/[^a-z]/g, "")))) return false;
  const isRole = ROLE_EMAIL_PARTS.some((part) => compact === part || compact.startsWith(part));
  const emailHost = canonicalHost(domainRaw);
  const brandDomain = registrableDomain(brandHost);
  const emailDomain = registrableDomain(emailHost);
  if (FREE_EMAIL_DOMAINS.has(emailHost)) return true;
  if (brandDomain && emailDomain === brandDomain) return true;
  return Boolean(isRole && brandDomain && emailDomain && emailDomain === brandDomain);
}

function extractSocialLinks(html) {
  const links = extractHrefValues(html);
  const social = {};
  for (const link of links) {
    const url = toUrl(link);
    if (!url) continue;
    const host = canonicalHost(url.hostname);
    const clean = cleanSocialUrl(url);
    if (!social.instagramUrl && host.endsWith("instagram.com") && /^\/[A-Za-z0-9_.]+\/?$/.test(url.pathname)) {
      social.instagramUrl = clean;
    }
    if (
      !social.facebookUrl &&
      host.endsWith("facebook.com") &&
      clean &&
      !/sharer|plugins|dialog|share/i.test(url.pathname)
    ) {
      social.facebookUrl = clean;
    }
  }
  return social;
}

function cleanSocialUrl(url) {
  const host = canonicalHost(url.hostname);
  if (host.endsWith("facebook.com") && url.pathname === "/profile.php") {
    const id = url.searchParams.get("id");
    return id ? cleanUrl(`https://www.facebook.com/profile.php?id=${id}`) : "";
  }
  return cleanUrl(url.href.split("?")[0]);
}

function extractRelevantInternalLinks(html, origin) {
  const originUrl = toUrl(origin);
  if (!originUrl) return [];
  const links = [];
  for (const href of extractHrefValues(html)) {
    const url = toUrl(href, origin);
    if (!url || canonicalHost(url.hostname) !== canonicalHost(originUrl.hostname)) continue;
    if (/(contact|wholesale|stockist|about|press|sourcing|production)/i.test(url.pathname)) {
      links.push(cleanUrl(url.href.split("#")[0]));
    }
  }
  return unique(links).slice(0, 6);
}

function extractHrefValues(html) {
  const links = [];
  for (const match of String(html || "").matchAll(/\bhref=["']([^"']+)["']/gi)) {
    links.push(decodeEntities(match[1]));
  }
  return links;
}

function htmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return htmlToText(value);
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#64;/g, "@")
    .replace(/&commat;/g, "@")
    .replace(/&#46;/g, ".")
    .replace(/&period;/g, ".");
}

function brandFromTitle(title, host) {
  const stripped = cleanText(title)
    .replace(/\b(official site|official store|online store|streetwear|clothing brand|contact|wholesale)\b/gi, "")
    .split(/\s[|-]\s| - | \| /)[0]
    .trim();
  if (stripped && stripped.length <= 60) return stripped;
  const base = registrableDomain(host).split(".")[0] || host.split(".")[0] || "Unknown Brand";
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function cleanText(value) {
  return decodeEntities(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function boolishText(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return "";
  if (/^(1|true|yes|y|公开|可用|public|business)$/.test(text)) return "true";
  if (/^(0|false|no|n|否|不可用|private)$/.test(text)) return "false";
  return text;
}

function firstName(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (/[@/#]|https?:\/\//i.test(text)) return "";
  return text.split(/\s+/)[0].replace(/[,:;]+$/, "");
}

function cleanUrl(value) {
  const url = toUrl(value);
  return url ? url.href.replace(/\/$/, "") : "";
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/[?].*$/, "")
    .replace(/[^\w.%+-@]/g, "");
}

function toUrl(value, base) {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) return null;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : raw.startsWith("//") ? `https:${raw}` : raw.startsWith("www.") ? `https://${raw}` : raw;
    const url = base ? new URL(normalized, base) : new URL(normalized);
    if (!/^https?:$/i.test(url.protocol)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function canonicalHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

function registrableDomain(host) {
  const parts = canonicalHost(host).split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  const lastThree = parts.slice(-3).join(".");
  if (/^(co|com|net|org|ac)\.[a-z]{2}$/.test(lastTwo)) return lastThree;
  return lastTwo;
}

function isSkippedDomain(host) {
  const cleanHost = canonicalHost(host);
  return SKIP_DOMAINS.some((domain) => cleanHost === domain || cleanHost.endsWith(`.${domain}`));
}

function sameHost(value, origin) {
  const a = toUrl(value);
  const b = toUrl(origin);
  return Boolean(a && b && canonicalHost(a.hostname) === canonicalHost(b.hostname));
}

function domainFromEmail(email) {
  return String(email || "").split("@")[1] || "";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateOnly(date) {
  return localTimestamp(date).slice(0, 10);
}

function addDaysDateOnly(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return dateOnly(copy);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function imapDate(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function decodeMimeWords(value) {
  return String(value || "").replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_match, charset, encoding, encoded) => {
    try {
      let buffer;
      if (/b/i.test(encoding)) {
        buffer = Buffer.from(encoded, "base64");
      } else {
        buffer = Buffer.from(
          encoded
            .replace(/_/g, " ")
            .replace(/=([0-9A-F]{2})/gi, (_hex, code) => String.fromCharCode(parseInt(code, 16))),
          "binary"
        );
      }
      const normalizedCharset = String(charset || "").toLowerCase();
      if (normalizedCharset.includes("utf-8") || normalizedCharset.includes("utf8")) {
        return buffer.toString("utf8");
      }
      return buffer.toString("latin1");
    } catch {
      return String(encoded || "");
    }
  });
}

function csvEscape(value) {
  const text = String(value || "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function singleLineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});

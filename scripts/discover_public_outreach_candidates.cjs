#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;
const { URL, URLSearchParams } = require("url");

const WORKDIR = process.cwd();
const NODE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36 BingoTextileOutreach/1.0";
const FREE_EMAIL_DOMAINS = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "me.com", "aol.com"]);
const BAD_EMAIL_LOCAL_PARTS = [
  "privacy",
  "legal",
  "gdpr",
  "abuse",
  "noreply",
  "no-reply",
  "donotreply",
  "shopify",
  "mailer",
  "postmaster",
  "press",
  "technical",
  "accessibility",
  "closedcaptioning",
  "news",
  "example",
  "hoodie",
  "hoodies",
  "sweatshirt",
  "sweatshirts",
  "tshirt",
  "tshirts",
  "tee",
  "tees",
  "pants",
  "shorts",
  "jackets",
  "pullovers",
];
const BAD_EMAIL_DOMAINS = new Set(["support.com", "beispiel.com", "example.com", "email.com"]);
const LOW_CONFIDENCE_ROLE_INBOXES = new Set(["info", "support", "contact", "help", "sales", "shop", "team", "orders", "customerservice", "service"]);
const BAD_HOST_PARTS = [
  "shopify.com",
  "shopify.dev",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "pinterest.com",
  "storeleads.app",
  "apify.com",
  "webinopoly.com",
  "eachspy.com",
  "w3.org",
  "status.brave.app",
  "hackerone.com",
  "torproject.org",
  "bitbranding.co",
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "brave.com",
  "wikipedia.org",
  "amazon.",
  "ebay.",
  "etsy.",
  "aliexpress.",
  "temu.",
  "shein.",
  "stockx.",
  "grailed.",
  "dictionary.",
  "cambridge.org",
  "iciba.com",
  "zhihu.com",
  "baidu.com",
  "taobao.com",
  "tmall.com",
  "jd.com",
  "urbanoutfitters.com",
  "culturekings.com",
  "karmaloop.com",
  "getsitecontrol.com",
  "prodigi.com",
  "pagefly.io",
  "templatemonster.com",
  "smartrmail.com",
  "toronto.ca",
  "destinationontario.com",
  "holland.com",
  "frenchlearner.com",
  "germany.travel",
  "torontosun.com",
  "visitseoul.net",
  "likejapan.com",
  "duocaish.com",
  "taiwantour.net",
  "seoul.go.kr",
  "gov.uk",
  "baike.com",
  "emb-japan.go.jp",
  "usa.gov",
  "jina.ai",
  "sitescorechecker",
  "myprosandcons.com",
  "wemakewebsites",
  "law",
  "attentive.com",
  "shop.zoomtan.com",
  "discountfootballkits",
  "leehwawedding",
  "chicme.com",
  "simpleshoes.com",
  "lewa.org",
  "priceupay",
  "trueref.io",
  "smallpdf.com",
  "wordhippo.com",
  "vocabish.com",
  "avada.io",
  "koala-apps.io",
  "sky.com",
  "touteleurope.eu",
  "citypass.com",
  "premiumbeat.com",
  "bellacanvas.com",
  "independenttradingco.com",
  "hongyuapparel.com",
  "iamsterdam.com",
  "leadiq.com",
  "apps.microsoft.com",
  "microsoft.com",
  "hbx.com",
  "complex.com",
  "hostingseekers.com",
  "campaignlake.com",
  "datacaptive.com",
  "ingorsports.com",
  "stadiumgoods.com",
  "endclothing.com",
  "walmart.com",
  "nike.com",
  "columbia.com",
  "sky.com",
  "news12.com",
  "ouest-france.fr",
  "torontosun.com",
  "streetwearer.com",
  "techdatapark.com",
  "public.com",
  "sellersunionchina.com",
];
const NON_BRAND_PATTERNS = [
  /\b(shopify store finder|store finder|crawler|scraper|scraping|automation platform|api reference|developer documentation)\b/i,
  /\b(email format|email formats|lead generation|lead data|sales intelligence|prospecting software|b2b data|technographic data|technology users email list|contact database)\b/i,
  /\b(web design|ecommerce agency|marketing agency|shopify agency|development agency|seo agency|conversion rate optimization)\b/i,
  /\b(government|official website|official guide|tourism|travel guide|destination|city card|visitor care|city of|embassy|language learning|beginner|news|media outlet)\b/i,
  /\b(newsroom|publisher|magazine|editorial|sports news|pop culture|streaming|broadcast|closed captioning)\b/i,
  /\b(email marketing|page builder|template|print on demand platform|shopify themes?|shopify app|popup|widget)\b/i,
  /\b(case study|portfolio|top \d+ streetwear|how to build|best shopify stores|shopify help center)\b/i,
  /\b(sa[as]{2}|software|plugin|app store|integrations|affiliate program|become an affiliate)\b/i,
  /\b(pdf files?|thesaurus|synonyms?|learn english|vocabulary|travel|tourism|visitor care|newsroom)\b/i,
  /\b(royalty[- ]free music|stock music|music licensing|sound effects|activewear manufacturer|sportswear manufacturer|apparel manufacturer|clothing manufacturer|garment manufacturer|custom clothing manufacturer|private label clothing manufacturer|blank apparel|wholesale blanks?|bulk t-?shirts?|screen printing|embroidery service|uniform supplier)\b/i,
];
const EXCLUDED_MARKET_PATTERNS = [
  ["India", /\b(india|mumbai|delhi|bangalore|havit apparel)\b/i],
  ["South Africa", /\b(south africa|cape town|johannesburg)\b/i],
  ["Egypt", /\b(egypt|cairo)\b/i],
  ["Nigeria", /\b(nigeria|lagos)\b/i],
  ["Taiwan", /\b(taiwan|taipei|台灣|台湾|台北|統編)\b/i],
];
const TARGET_COUNTRY_HINTS = [
  ["United States", /\b(united states|usa|u\.s\.|america|los angeles|new york|brooklyn|california|texas|florida|chicago|atlanta|dallas|miami|seattle|portland|detroit|boston|philadelphia|ohio|arizona|utah|nevada)\b/i],
  ["Canada", /\b(canada|toronto|vancouver|montreal|ontario|british columbia|alberta)\b/i],
  ["United Kingdom", /\b(united kingdom|uk|england|london|manchester|birmingham|scotland|wales)\b/i],
  ["Ireland", /\b(ireland|dublin)\b/i],
  ["Germany", /\b(germany|berlin|hamburg|munich|deutschland)\b/i],
  ["France", /\b(france|paris)\b/i],
  ["Netherlands", /\b(netherlands|amsterdam|rotterdam)\b/i],
  ["Italy", /\b(italy|milan|rome|roma)\b/i],
  ["Spain", /\b(spain|madrid|barcelona)\b/i],
  ["Belgium", /\b(belgium|brussels|antwerp)\b/i],
  ["Switzerland", /\b(switzerland|zurich|geneva)\b/i],
  ["Austria", /\b(austria|vienna)\b/i],
  ["Portugal", /\b(portugal|lisbon|porto)\b/i],
  ["Poland", /\b(poland|warsaw|krakow)\b/i],
  ["Czech Republic", /\b(czech republic|czechia|prague)\b/i],
  ["Sweden", /\b(sweden|stockholm)\b/i],
  ["Denmark", /\b(denmark|copenhagen)\b/i],
  ["Norway", /\b(norway|oslo)\b/i],
  ["Finland", /\b(finland|helsinki)\b/i],
  ["Australia", /\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/i],
  ["New Zealand", /\b(new zealand|auckland|wellington)\b/i],
  ["Japan", /\b(japan|tokyo|osaka|kyoto|日本)\b/i],
  ["South Korea", /\b(south korea|korea|seoul|한국|대한민국)\b/i],
  ["Singapore", /\b(singapore)\b/i],
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
  ["se", "Sweden"],
  ["dk", "Denmark"],
  ["no", "Norway"],
  ["fi", "Finland"],
  ["com.au", "Australia"],
  ["au", "Australia"],
  ["co.nz", "New Zealand"],
  ["nz", "New Zealand"],
  ["jp", "Japan"],
  ["co.jp", "Japan"],
  ["kr", "South Korea"],
  ["co.kr", "South Korea"],
  ["sg", "Singapore"],
];
const PRODUCT_PATTERNS = [
  ["heavyweight tees / jersey", /\b(heavyweight|boxy|oversized|tee|t-shirt|t shirt|jersey|graphic tee)\b/i],
  ["hoodies / sweatshirts / french terry", /\b(hoodie|hooded|sweatshirt|sweatpants|fleece|french terry|terry|crewneck)\b/i],
  ["knit polos / rib trims", /\b(polo|rugby|rib|collar|pique)\b/i],
  ["garment dye / vintage wash", /\b(garment dye|garment-dye|pigment dye|vintage wash|washed|acid wash|sun faded)\b/i],
  ["mesh / sports jersey", /\b(mesh|sports jersey|football jersey|basketball jersey|racing jersey)\b/i],
  ["stretch jersey / fitted tops", /\b(stretch|spandex|elastane|fitted|compression|activewear)\b/i],
];
const ACTIVITY_PATTERNS = [
  ["new arrivals signal", /\b(new arrivals?|new in|latest arrivals?)\b/i],
  ["drop/new release signal", /\b(latest drop|new drop|drop [0-9]+|new release|release date|limited drop)\b/i],
  ["preorder/coming soon signal", /\b(preorder|pre-order|coming soon|early access)\b/i],
  ["new collection signal", /\b(new collection|capsule collection|collection launch|lookbook)\b/i],
  ["back in stock signal", /\b(back in stock|restock|restocked)\b/i],
  ["review activity signal", /\b([1-9][0-9]{1,4})\s+(reviews?|customer reviews?)\b/i],
];
const FIELD_NAMES = [
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
  "sourceLinks",
  "checkedPages",
  "emailSource",
  "score",
  "whyFit",
  "searchQuery",
  "notes",
  "approvalStatus",
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const localDate = todayLocal();
  const batch = args.batch || `${localDate}-manual`;
  const outPrefix = args.outPrefix || `outreach_candidates_active_${batch}`;
  ensureDir("data");
  ensureDir("reports");

  const suppression = loadSuppression(args.suppressionFile);
  const alreadyContacted = loadAlreadyContactedEmails(args);
  const queries = buildQueries(args.queryFile, args.maxQueries, args.queryOffset);
  const seedMap = new Map();
  const searchStats = [];

  for (const query of queries) {
    const seeds = await searchForSeeds(query, args.searchTimeoutMs);
    searchStats.push({ query, seeds: seeds.length });
    for (const seed of seeds) {
      const url = toUrl(seed.url);
      if (!url) continue;
      const host = canonicalHost(url.hostname);
      if (badHost(host)) continue;
      if (!seedMap.has(host)) seedMap.set(host, { ...seed, host, query });
    }
    if (seedMap.size >= args.maxSeeds) break;
    await sleep(args.searchDelayMs);
  }

  const seedItems = [...seedMap.values()].slice(0, args.maxSeeds);
  const rawCandidates = [];
  const rejected = [];

  await mapLimit(seedItems, args.concurrency, async (seed, index) => {
    const result = await withTimeout(candidateFromSeed(seed, args), args.candidateTimeoutMs, {
      reason: "candidate timeout",
    });
    if (result.candidate) {
      rawCandidates.push(result.candidate);
    } else if (result.reason) {
      rejected.push({
        brand: seed.title || "",
        website: seed.url || "",
        email: "",
        reason: result.reason,
      });
    }
    if ((index + 1) % 25 === 0) {
      console.error(`checked ${index + 1}/${seedItems.length}, candidates=${rawCandidates.length}`);
    }
  });

  const merged = mergeCandidates(rawCandidates);
  const cleaned = [];
  for (const candidate of merged) {
    const reason = await qualityRejectReason(candidate, suppression, alreadyContacted);
    if (reason) {
      rejected.push({
        brand: candidate.brandName,
        website: candidate.website,
        email: candidate.businessEmail,
        reason,
      });
    } else {
      cleaned.push(candidate);
    }
  }

  cleaned.sort((a, b) => b.score - a.score || String(a.brandName).localeCompare(String(b.brandName)));
  const selected = cleaned.slice(0, args.limit).map((candidate) => ({
    ...candidate,
    approvalStatus: "approved",
  }));

  const files = {
    rawCandidates: path.resolve(WORKDIR, `data/${outPrefix}-raw.csv`),
    cleanCandidates: path.resolve(WORKDIR, `data/${outPrefix}-clean.csv`),
    discovery: path.resolve(WORKDIR, `reports/outreach-${batch}-discovery.json`),
    cleaning: path.resolve(WORKDIR, `reports/outreach-${batch}-cleaning.json`),
    approvedManifest: path.resolve(WORKDIR, `reports/outreach-${batch}-approved-manifest.json`),
    summaryJson: path.resolve(WORKDIR, `reports/outreach-${batch}-summary.json`),
    summaryMarkdown: path.resolve(WORKDIR, `reports/outreach-${batch}-summary.md`),
  };

  writeCsv(files.rawCandidates, merged, FIELD_NAMES);
  writeCsv(files.cleanCandidates, selected, FIELD_NAMES);
  const discovery = {
    generatedAt: new Date().toISOString(),
    source: "brave-html+duckduckgo-html+public-brand-pages",
    batch,
    localDate,
    queries: queries.length,
    searchStats,
    seeds: seedItems.length,
    rawCandidates: rawCandidates.length,
    mergedCandidates: merged.length,
    selected: selected.length,
    candidates: selected,
    output: files.rawCandidates,
  };
  const cleaning = {
    input: files.rawCandidates,
    output: files.cleanCandidates,
    cleaned: selected.length,
    rejectedCount: rejected.length,
    rejected: rejected.slice(0, 250),
    cleanedRows: selected,
  };
  const manifest = {
    ok: true,
    runAt: new Date().toISOString(),
    localDate,
    mode: `public-discovery:${batch}`,
    dryRun: false,
    sendRequested: false,
    selectedCount: selected.length,
    candidatePoolCount: merged.length,
    searchQueries: queries,
    selected,
  };
  const summary = {
    generatedAt: new Date().toISOString(),
    localDate,
    batch,
    request: "全网查找100个高活跃潜在客户，发送开发信，引导客户添加WhatsApp；触发550即停止；两分钟一封。",
    files,
    totals: {
      searchQueries: queries.length,
      searchSeeds: seedItems.length,
      rawCandidates: rawCandidates.length,
      mergedCandidates: merged.length,
      cleanedCandidates: selected.length,
      rejectedByQualityCount: rejected.length,
    },
    topSignals: topSignals(selected),
    selectedPreview: selected.slice(0, 20).map((item) => ({
      brandName: item.brandName,
      country: item.country,
      website: item.website,
      businessEmail: item.businessEmail,
      score: item.score,
      recentSignal: item.recentSignal,
    })),
  };

  fs.writeFileSync(files.discovery, `${JSON.stringify(discovery, null, 2)}\n`);
  fs.writeFileSync(files.cleaning, `${JSON.stringify(cleaning, null, 2)}\n`);
  fs.writeFileSync(files.approvedManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(files.summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(files.summaryMarkdown, buildSummaryMarkdown(summary));

  console.log(JSON.stringify({ ok: true, batch, selected: selected.length, files }, null, 2));
}

function parseArgs(argv) {
  const args = {
    limit: 100,
    maxQueries: 70,
    maxSeeds: 900,
    queryOffset: 0,
    concurrency: 8,
    searchDelayMs: 350,
    searchTimeoutMs: 5000,
    fetchTimeoutMs: 18000,
    candidateTimeoutMs: 90000,
    queryFile: "",
    batch: "",
    outPrefix: "",
    suppressionFile: "data/outreach_suppression.csv",
    sentLogFile: "data/outreach_sent_log.csv",
    leadDbFile: "data/outreach_leads.csv",
    smtpRejectionFile: "data/outreach_smtp_rejections.csv",
    bounceFile: "data/outreach_bounces.csv",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") args.limit = numberArg(argv[++i], arg);
    else if (arg === "--max-queries") args.maxQueries = numberArg(argv[++i], arg);
    else if (arg === "--query-offset") args.queryOffset = numberArg(argv[++i], arg);
    else if (arg === "--max-seeds") args.maxSeeds = numberArg(argv[++i], arg);
    else if (arg === "--concurrency") args.concurrency = numberArg(argv[++i], arg);
    else if (arg === "--search-delay-ms") args.searchDelayMs = numberArg(argv[++i], arg);
    else if (arg === "--search-timeout-ms") args.searchTimeoutMs = numberArg(argv[++i], arg);
    else if (arg === "--fetch-timeout-ms") args.fetchTimeoutMs = numberArg(argv[++i], arg);
    else if (arg === "--candidate-timeout-ms") args.candidateTimeoutMs = numberArg(argv[++i], arg);
    else if (arg === "--batch") args.batch = requireValue(argv[++i], arg);
    else if (arg === "--out-prefix") args.outPrefix = requireValue(argv[++i], arg);
    else if (arg === "--query-file") args.queryFile = requireValue(argv[++i], arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireValue(value, flag) {
  if (!value) throw new Error(`${flag} requires a value.`);
  return value;
}

function numberArg(value, flag) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) throw new Error(`${flag} requires a positive number.`);
  return number;
}

function buildQueries(file, maxQueries, queryOffset = 0) {
  if (file && fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8").split(/\r?\n/).map(cleanText).filter(Boolean).slice(queryOffset, queryOffset + maxQueries);
  }
  const learned = [];
  const bankFile = "data/outreach_keyword_bank.json";
  if (fs.existsSync(bankFile)) {
    try {
      const bank = JSON.parse(fs.readFileSync(bankFile, "utf8"));
      learned.push(...(bank.learnedSearchQueries || []), ...(bank.searchQueries || []));
    } catch (_error) {
      // Ignore malformed optional keyword bank.
    }
  }
  const manual = [
    "streetwear hoodie contact email Powered by Shopify",
    "streetwear contact email hoodie new arrivals",
    "premium streetwear contact email heavyweight tee",
    "heavyweight tee contact email streetwear brand",
    "French terry hoodie brand contact email",
    "garment dyed tee brand contact email",
    "oversized tee streetwear contact email",
    "cut and sew streetwear brand contact email",
    "streetwear brand founder email hoodie",
    "streetwear creative director email contact",
    "independent clothing brand contact email hoodie",
    "new drop streetwear contact email",
    "latest drop hoodie brand contact email",
    "preorder streetwear hoodie contact email",
    "coming soon streetwear brand contact email",
    "stockist wholesale streetwear brand contact email",
    "streetwear contact information email powered by Shopify",
    "hoodie contact information email powered by Shopify",
    "heavyweight tee contact information powered by Shopify",
    "premium basics contact information email powered by Shopify",
    "contact us streetwear email hoodie",
    "contact streetwear company email hoodie",
    "USA streetwear contact email hoodie",
    "Los Angeles streetwear brand contact email hoodie",
    "New York streetwear brand contact email hoodie",
    "Canada streetwear contact email hoodie",
    "Toronto clothing brand contact email hoodie",
    "UK streetwear contact email hoodie",
    "London streetwear contact email hoodie",
    "Australia streetwear contact email hoodie",
    "Melbourne streetwear brand contact email",
    "New Zealand streetwear contact email hoodie",
    "Japan streetwear brand contact email hoodie",
    "Tokyo streetwear contact email hoodie",
    "Korean streetwear brand contact email hoodie",
    "Seoul streetwear contact email hoodie",
    "Europe streetwear contact email hoodie",
    "Germany streetwear brand contact email hoodie",
    "France streetwear brand contact email hoodie",
    "Netherlands streetwear contact email hoodie",
  ];
  return unique([...learned, ...manual]).slice(queryOffset, queryOffset + maxQueries);
}

async function searchForSeeds(query, timeoutMs) {
  const results = [];
  const [brave, ddg, bing] = await Promise.allSettled([
    searchBrave(query, timeoutMs),
    searchDuckDuckGo(query, timeoutMs),
    searchBing(query, timeoutMs),
  ]);
  if (brave.status === "fulfilled") results.push(...brave.value);
  if (ddg.status === "fulfilled") results.push(...ddg.value);
  if (bing.status === "fulfilled") results.push(...bing.value);
  const byUrl = new Map();
  for (const item of results) {
    const url = cleanResultUrl(item.url);
    if (!url) continue;
    const parsed = toUrl(url);
    if (!parsed) continue;
    const host = canonicalHost(parsed.hostname);
    if (badHost(host)) continue;
    byUrl.set(url, {
      title: cleanText(item.title || ""),
      url,
      snippet: cleanText(item.snippet || ""),
      query,
    });
  }
  return [...byUrl.values()].slice(0, 20);
}

async function searchBrave(query, timeoutMs) {
  const url = `https://search.brave.com/search?${new URLSearchParams({ q: query, source: "web" })}`;
  const html = await fetchText(url, timeoutMs);
  const results = [];
  for (const item of extractBraveObjects(html)) {
    if (!item.url) continue;
    results.push(item);
  }
  for (const found of extractUrlsFromText(html)) {
    results.push({ url: found, title: "", snippet: "" });
  }
  return results;
}

function extractBraveObjects(html) {
  const text = String(html || "");
  const results = [];
  const objectRe = /\{title:"([\s\S]*?)",url:"(https?:[\s\S]*?)",full_title:[\s\S]*?description:"([\s\S]*?)",page_age:/g;
  for (const match of text.matchAll(objectRe)) {
    results.push({
      title: decodeJsString(match[1]),
      url: decodeJsString(match[2]),
      snippet: decodeJsString(match[3]).replace(/\\u003C[^>]+\\u003E/g, " "),
    });
  }
  return results;
}

async function searchDuckDuckGo(query, timeoutMs) {
  const url = `https://duckduckgo.com/html/?${new URLSearchParams({ q: query, kl: "us-en" })}`;
  const html = await fetchText(url, timeoutMs);
  const results = [];
  const linkRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkRe)) {
    results.push({
      url: cleanResultUrl(decodeEntities(match[1])),
      title: htmlToText(match[2]),
      snippet: htmlToText(match[3]),
    });
  }
  for (const match of html.matchAll(/uddg=([^&"']+)/g)) {
    results.push({ url: decodeURIComponent(match[1]), title: "", snippet: "" });
  }
  return results;
}

async function searchBing(query, timeoutMs) {
  const url = `https://www.bing.com/search?${new URLSearchParams({ q: query, mkt: "en-US", cc: "US" })}`;
  const html = await fetchText(url, timeoutMs);
  const results = [];
  const blockRe = /<li class="b_algo"[\s\S]*?<\/li>/gi;
  for (const blockMatch of html.matchAll(blockRe)) {
    const block = blockMatch[0];
    const linkMatch = block.match(/<h2[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    results.push({
      url: decodeEntities(linkMatch[1]),
      title: htmlToText(linkMatch[2]),
      snippet: snippetMatch ? htmlToText(snippetMatch[1]) : "",
    });
  }
  return results;
}

async function candidateFromSeed(seed, args) {
  const seedUrl = toUrl(seed.url);
  if (!seedUrl) return { reason: "bad seed url" };
  const origin = `${seedUrl.protocol}//${seedUrl.hostname}`;
  const host = canonicalHost(seedUrl.hostname);
  if (badHost(host)) return { reason: "bad host" };

  const pagesToCheck = unique([
    seedUrl.href.split("#")[0],
    origin,
    `${origin}/pages/contact`,
    `${origin}/pages/contact-us`,
    `${origin}/pages/about`,
    `${origin}/pages/about-us`,
    `${origin}/policies/contact-information`,
    `${origin}/policies/privacy-policy`,
    `${origin}/pages/wholesale`,
    `${origin}/pages/stockists`,
  ]).slice(0, 10);

  const checkedPages = [];
  let combinedText = [seed.title, seed.snippet, seed.url].join("\n");
  let pageEvidenceText = "";
  let combinedHtml = "";
  const links = [];
  const pageTexts = new Map();

  for (const page of pagesToCheck) {
    const text = await fetchReadablePage(page, args.fetchTimeoutMs);
    if (!text) continue;
    checkedPages.push(page);
    pageTexts.set(page, text);
    combinedText += `\n${text}`;
    pageEvidenceText += `\n${text}`;
    combinedHtml += `\n${text}`;
    links.push(...extractLinksFromMarkdownOrHtml(text, origin));
    if (checkedPages.length >= 6) break;
  }

  for (const link of relevantInternalLinks(links, origin).slice(0, 4)) {
    if (checkedPages.includes(link)) continue;
    const text = await fetchReadablePage(link, args.fetchTimeoutMs);
    if (!text) continue;
    checkedPages.push(link);
    pageTexts.set(link, text);
    combinedText += `\n${text}`;
    pageEvidenceText += `\n${text}`;
    combinedHtml += `\n${text}`;
  }

  const emailInfo = bestEmail(pageTexts, host);
  if (!emailInfo.email) return { reason: "no verified public email" };

  const productType = productSignalFrom(pageEvidenceText);
  if (!productType) return { reason: "weak product signal" };

  const country = inferCountry(origin, combinedText);
  if (!country) return { reason: "market unknown" };
  const excluded = excludedMarket(combinedText, country);
  if (excluded) return { reason: `excluded market: ${excluded}` };

  const recentSignal = recentSignalFrom(pageEvidenceText) || "active ecommerce/contact page signal";
  const social = extractSocialLinks(combinedHtml);
  const brandName = brandFrom(seed.title, combinedText, host);
  const priceTier = priceTierFrom(combinedText);
  const score = scoreCandidate({
    country,
    productType,
    recentSignal,
    priceTier,
    email: emailInfo.email,
    social,
    combinedText: pageEvidenceText,
    emailInfo,
  });

  return {
    candidate: {
      brandName,
      country,
      website: origin,
      instagramUrl: social.instagramUrl || "",
      facebookUrl: social.facebookUrl || "",
      businessEmail: emailInfo.email,
      contactName: "",
      contactRole: "",
      contactSource: emailInfo.source,
      personalEmailAllowed: FREE_EMAIL_DOMAINS.has(emailDomain(emailInfo.email)) ? "true" : "false",
      productType,
      priceTier,
      recentSignal,
      sourceLinks: unique([seed.url, ...checkedPages]).join("; "),
      checkedPages: checkedPages.join("; "),
      emailSource: emailInfo.source,
      score,
      whyFit: `Matches Bingo Textile because ${country} brand has ${productType}, ${recentSignal}, and a verified public contact email on the official website.`,
      searchQuery: seed.query,
      notes: cleanText([seed.snippet, snippetAround(pageEvidenceText, emailInfo.email)].join(" ")).slice(0, 500),
      approvalStatus: "approved",
    },
  };
}

async function fetchReadablePage(url, timeoutMs) {
  const direct = await fetchText(url, timeoutMs).catch(() => "");
  if (direct && usefulPageText(direct)) return direct.slice(0, 250000);
  const jinaUrl = `https://r.jina.ai/http://${url}`;
  const viaJina = await fetchText(jinaUrl, timeoutMs).catch(() => "");
  if (viaJina && usefulPageText(viaJina)) return viaJina.slice(0, 250000);
  return direct || viaJina || "";
}

function usefulPageText(text) {
  return /contact|email|hoodie|tee|streetwear|apparel|clothing|shop|collection|powered by shopify/i.test(String(text || ""));
}

async function fetchText(url, timeoutMs = 18000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": NODE_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok && response.status >= 500) return "";
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function bestEmail(pageTexts, host) {
  const candidates = [];
  for (const [source, text] of pageTexts.entries()) {
    const decoded = decodeEntities(String(text || ""))
      .replace(/\s*(\[at\]|\(at\)|\sat\s)\s*/gi, "@")
      .replace(/\s*(\[dot\]|\(dot\)|\sdot\s)\s*/gi, ".");
    for (const match of decoded.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      const email = cleanEmail(match[0]);
      const reason = emailRejectReason(email, host);
      if (reason) continue;
      const local = email.split("@")[0] || "";
      const roleScore = roleInboxPenalty(local) ? 2 : 8;
      const sourceScore = /contact|wholesale|stockist|about/i.test(source) ? 8 : /policy|privacy/i.test(source) ? 1 : 2;
      const domainScore = registrableDomain(emailDomain(email)) === registrableDomain(host) ? 10 : 4;
      candidates.push({ email, source, score: roleScore + sourceScore + domainScore });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
  return candidates[0] || { email: "", source: "" };
}

function emailRejectReason(email, host) {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "invalid";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email)) return "image artifact";
  if (/\.con$/i.test(email)) return "bad tld";
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z]/g, "");
  const domain = emailDomain(email);
  if (BAD_EMAIL_LOCAL_PARTS.some((part) => local.includes(part.replace(/[^a-z]/g, "")))) return "bad local";
  if (BAD_EMAIL_DOMAINS.has(domain)) return "bad domain";
  if (FREE_EMAIL_DOMAINS.has(domain)) return "";
  const siteDomain = registrableDomain(host);
  const mailDomain = registrableDomain(domain);
  if (!siteDomain || !mailDomain || siteDomain !== mailDomain) return "email domain mismatch";
  return "";
}

async function qualityRejectReason(candidate, suppression, alreadyContacted) {
  if (!candidate.businessEmail) return "missing email";
  const email = candidate.businessEmail.toLowerCase();
  const domain = emailDomain(email);
  const host = canonicalHost(toUrl(candidate.website)?.hostname || "");
  if (suppression.has(email) || suppression.has(domain) || suppression.has(host)) return "suppressed";
  if (alreadyContacted.has(email)) return "already contacted or rejected";
  if (badHost(host)) return "bad host/brand";
  if (nonBrandSignal([candidate.brandName, candidate.website, candidate.notes, candidate.sourceLinks].join("\n"), host)) {
    return "non-brand service/tool result";
  }
  if (isLowConfidenceRoleEmail(email) && !strongContactContext(candidate)) return "low-confidence role inbox";
  if (privacyOnlyEmailSource(candidate)) return "privacy-only email source";
  if (policyOnlyEmailSource(candidate) && !strongContactContext(candidate)) return "policy-only email source";
  if (!(await emailDomainHasMx(email))) return "email domain has no mx";
  if (!candidate.country) return "market unknown";
  if (!candidate.productType) return "weak product signal";
  if (candidate.score < 68) return "score below threshold";
  return "";
}

function nonBrandSignal(text, host) {
  if (badHost(host)) return true;
  return NON_BRAND_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreCandidate(input) {
  let score = 0;
  if (input.country) score += 20;
  const productCount = input.productType.split(/[,;]/).filter(Boolean).length;
  score += productCount >= 2 ? 25 : 18;
  if (/premium|high|mid\/upper/i.test(input.priceTier)) score += 18;
  else if (/low/i.test(input.priceTier)) score += 5;
  else score += 12;
  if (/drop|release|preorder|coming soon|new arrivals|collection|restock|review|early access/i.test(input.recentSignal)) score += 15;
  else score += 8;
  score += 10;
  if (input.social.instagramUrl || input.social.facebookUrl) score += 4;
  if (input.emailInfo && /contact|wholesale|about/i.test(input.emailInfo.source || "")) score += 5;
  if (input.emailInfo && /policy|privacy/i.test(input.emailInfo.source || "")) score -= 8;
  if (input.emailInfo && isLowConfidenceRoleEmail(input.emailInfo.email)) score -= 8;
  if (/\b(wholesale|stockist|sample|sourcing|production|custom|private label|cut and sew|blank)\b/i.test(input.combinedText)) score += 8;
  return Math.max(0, Math.min(100, score));
}

function roleInboxPenalty(localPart) {
  return LOW_CONFIDENCE_ROLE_INBOXES.has(String(localPart || "").toLowerCase());
}

function isLowConfidenceRoleEmail(email) {
  return roleInboxPenalty(String(email || "").split("@")[0]);
}

function policyOnlyEmailSource(candidate) {
  const source = String(candidate.emailSource || candidate.contactSource || "").toLowerCase();
  return /policy|privacy/.test(source) && !/contact|wholesale|stockist|about/.test(source);
}

function privacyOnlyEmailSource(candidate) {
  const source = String(candidate.emailSource || candidate.contactSource || "").toLowerCase();
  return /privacy/.test(source) && !/contact-information/.test(source);
}

async function emailDomainHasMx(email) {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (FREE_EMAIL_DOMAINS.has(domain)) return true;
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.some((record) => record && record.exchange);
  } catch (_error) {
    return false;
  }
}

function strongContactContext(candidate) {
  const text = [
    candidate.contactName,
    candidate.contactRole,
    candidate.contactSource,
    candidate.emailSource,
    candidate.recentSignal,
    candidate.productType,
    candidate.whyFit,
    candidate.notes,
    candidate.sourceLinks,
  ].join("\n");
  return /\b(wholesale|stockist|sourcing|production|sample|sampling|custom|private label|cut and sew|new arrivals|latest drop|preorder|coming soon|restock|review|collection)\b/i.test(text);
}

function productSignalFrom(text) {
  if (!apparelContext(text)) return "";
  return PRODUCT_PATTERNS.filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label)
    .slice(0, 4)
    .join("; ");
}

function apparelContext(text) {
  return /\b(streetwear|apparel|clothing|fashion|garment|hoodie|sweatshirt|t-?shirt|tee|shirt|tops?|sweatpants|joggers?|collection|lookbook|new arrivals?|shop now|wear|menswear|womenswear|unisex|cut and sew|garment dyed)\b/i.test(String(text || ""));
}

function recentSignalFrom(text) {
  for (const [label, pattern] of ACTIVITY_PATTERNS) {
    const match = String(text || "").match(pattern);
    if (match) return label;
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
    if (/\b(cheap|budget|low price)\b/i.test(text)) return "low";
    return "mid/upper";
  }
  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  if (median >= 120) return "premium/high";
  if (median >= 55) return "mid/upper";
  return "mid";
}

function inferCountry(website, text) {
  const host = website ? canonicalHost(toUrl(website)?.hostname || "") : "";
  for (const [suffix, country] of TLD_COUNTRY_HINTS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return country;
  }
  for (const [country, pattern] of TARGET_COUNTRY_HINTS) {
    if (pattern.test(text)) return country;
  }
  return "";
}

function excludedMarket(text, country) {
  for (const [label, pattern] of EXCLUDED_MARKET_PATTERNS) {
    if (country === label || pattern.test(text)) return label;
  }
  return "";
}

function extractSocialLinks(text) {
  const social = {};
  for (const link of extractUrlsFromText(text)) {
    const url = toUrl(link);
    if (!url) continue;
    const host = canonicalHost(url.hostname);
    if (!social.instagramUrl && host.endsWith("instagram.com") && /^\/[A-Za-z0-9_.]+\/?$/.test(url.pathname)) {
      social.instagramUrl = cleanUrl(url.href.split("?")[0]);
    }
    if (!social.facebookUrl && host.endsWith("facebook.com") && !/share|dialog|plugins/i.test(url.pathname)) {
      social.facebookUrl = cleanUrl(url.href.split("?")[0]);
    }
  }
  return social;
}

function extractLinksFromMarkdownOrHtml(text, origin) {
  const links = [];
  for (const match of String(text || "").matchAll(/\]\((https?:\/\/[^)]+)\)|href=["']([^"']+)["']/gi)) {
    const value = match[1] || match[2] || "";
    const url = toUrl(decodeEntities(value), origin);
    if (url) links.push(cleanUrl(url.href));
  }
  return unique([...links, ...extractUrlsFromText(text)]);
}

function relevantInternalLinks(links, origin) {
  const originUrl = toUrl(origin);
  if (!originUrl) return [];
  return unique(links)
    .map((link) => toUrl(link, origin))
    .filter((url) => url && canonicalHost(url.hostname) === canonicalHost(originUrl.hostname))
    .filter((url) => !/\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map)$/i.test(url.pathname))
    .filter((url) => /(contact|about|wholesale|stockist|policy|privacy|shipping|returns|production|sourcing)/i.test(url.pathname))
    .map((url) => cleanUrl(url.href));
}

function extractUrlsFromText(text) {
  const decoded = decodeEntities(String(text || ""))
    .replace(/\\\//g, "/")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":");
  const urls = [];
  for (const match of decoded.matchAll(/https?:\/\/[^\s"'<>),\\]+/gi)) {
    urls.push(cleanResultUrl(match[0]));
  }
  return unique(urls.filter(Boolean));
}

function cleanResultUrl(value) {
  let raw = decodeEntities(String(value || "").trim()).replace(/\\\//g, "/");
  if (!raw) return "";
  if (raw.startsWith("//duckduckgo.com/l/?")) raw = `https:${raw}`;
  try {
    const url = new URL(raw, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    if (uddg) return cleanUrl(decodeURIComponent(uddg));
    return cleanUrl(url.href);
  } catch (_error) {
    return "";
  }
}

function brandFrom(title, text, host) {
  const siteName = String(text || "").match(/(?:og:site_name["'][^>]*content=["']|site_name["']?\s*content=["'])([^"']+)/i);
  if (siteName && cleanBrand(siteName[1])) return cleanBrand(siteName[1]);
  const h1 = String(text || "").match(/#\s+([^\n]{3,80})/);
  if (h1 && cleanBrand(h1[1])) return cleanBrand(h1[1]);
  const cleanTitle = cleanBrand(title);
  if (cleanTitle) return cleanTitle;
  const base = registrableDomain(host).split(".")[0] || host.split(".")[0] || "Unknown Brand";
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

function cleanBrand(value) {
  const text = htmlToText(value)
    .replace(/\b(contact us|contact|official site|online store|streetwear company|streetwear|clothing brand|powered by shopify)\b/gi, " ")
    .split(/\s[|-]\s| \| /)[0]
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length < 2 || text.length > 60) return "";
  if (/^(home|catalog|shop|contact|privacy|refund|shipping|my store|read more|whoops,? something went wrong)$/i.test(text)) return "";
  return text;
}

function mergeCandidates(candidates) {
  const byEmail = new Map();
  for (const candidate of candidates) {
    const key = candidate.businessEmail || candidate.website;
    const existing = byEmail.get(key);
    if (!existing || candidate.score > existing.score) byEmail.set(key, candidate);
  }
  return [...byEmail.values()];
}

function topSignals(candidates) {
  const counts = new Map();
  for (const candidate of candidates) {
    for (const value of [candidate.productType, candidate.recentSignal, candidate.country]) {
      for (const item of String(value || "").split(/[;,]/).map((entry) => entry.trim()).filter(Boolean)) {
        counts.set(item, (counts.get(item) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([signal, count]) => ({ signal, count }));
}

function loadSuppression(file) {
  const suppression = new Set();
  if (!fs.existsSync(file)) return suppression;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const value = line.split(",")[0].trim().toLowerCase();
    if (value && !value.startsWith("#")) suppression.add(value);
  }
  return suppression;
}

function loadAlreadyContactedEmails(args) {
  const emails = new Set();
  for (const file of [args.sentLogFile, args.leadDbFile, args.smtpRejectionFile, args.bounceFile]) {
    if (!fs.existsSync(file)) continue;
    for (const match of fs.readFileSync(file, "utf8").matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      emails.add(cleanEmail(match[0]));
    }
  }
  return emails;
}

async function mapLimit(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function writeCsv(file, rows, fields) {
  ensureDir(path.dirname(file));
  const lines = [fields.join(",")];
  for (const row of rows) {
    lines.push(fields.map((field) => csvEscape(row[field] || "")).join(","));
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

function buildSummaryMarkdown(summary) {
  const lines = [];
  lines.push(`# Outreach Discovery Summary - ${summary.batch}`);
  lines.push("");
  lines.push(`- 搜索词: ${summary.totals.searchQueries}`);
  lines.push(`- 搜索种子: ${summary.totals.searchSeeds}`);
  lines.push(`- 原始候选: ${summary.totals.rawCandidates}`);
  lines.push(`- 合并候选: ${summary.totals.mergedCandidates}`);
  lines.push(`- 清洗后候选: ${summary.totals.cleanedCandidates}`);
  lines.push(`- 质量拒绝: ${summary.totals.rejectedByQualityCount}`);
  lines.push("");
  lines.push("## Files");
  for (const [key, value] of Object.entries(summary.files)) lines.push(`- ${key}: ${value}`);
  lines.push("");
  lines.push("## Top Signals");
  for (const item of summary.topSignals) lines.push(`- ${item.signal}: ${item.count}`);
  lines.push("");
  lines.push("## Selected Preview");
  for (const item of summary.selectedPreview) {
    lines.push(`- ${item.brandName} | ${item.country} | ${item.businessEmail} | ${item.score} | ${item.recentSignal}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function decodeJsString(value) {
  try {
    return JSON.parse(`"${String(value || "").replace(/"/g, '\\"')}"`);
  } catch (_error) {
    return decodeEntities(String(value || "").replace(/\\\//g, "/"));
  }
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

function snippetAround(text, needle) {
  const value = cleanText(text);
  const index = value.toLowerCase().indexOf(String(needle || "").toLowerCase());
  if (index < 0) return value.slice(0, 260);
  return value.slice(Math.max(0, index - 120), index + 180);
}

function cleanText(value) {
  return htmlToText(value).replace(/\s+/g, " ").trim();
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/[?].*$/, "")
    .replace(/[^\w.%+-@]/g, "");
}

function emailDomain(email) {
  return String(email || "").split("@")[1] || "";
}

function cleanUrl(value) {
  const url = toUrl(value);
  if (!url) return "";
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

function toUrl(value, base) {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) return null;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : raw.startsWith("//") ? `https:${raw}` : raw.startsWith("www.") ? `https://${raw}` : raw;
    const url = base ? new URL(normalized, base) : new URL(normalized);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url;
  } catch (_error) {
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

function badHost(host) {
  const clean = canonicalHost(host);
  if (!clean || BAD_HOST_PARTS.some((part) => clean.includes(part))) return true;
  if (/(\.cn|\.ru|\.in)$/i.test(clean)) return true;
  return false;
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
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

function ensureDir(dir) {
  if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayLocal() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const data = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${data.year}-${data.month}-${data.day}`;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});

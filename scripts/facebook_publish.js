#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");
const childProcess = require("child_process");
const { requireAutomationEnabled } = require("./automation_guard");

const GRAPH_HOST = "graph.facebook.com";
const DEFAULT_MEDIA_HISTORY_FILE = "data/social_media_history.jsonl";
const CONTACT_FILE = path.join(__dirname, "..", "config", "social-contact.json");

function usage() {
  console.error(
    "Usage: node scripts/facebook_publish.js --image-url URL --caption-file PATH --media-source-url URL --license-status TEXT --relevance-note TEXT [--history-file PATH] [--dry-run]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = { dryRun: false, historyFile: DEFAULT_MEDIA_HISTORY_FILE };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--image-url") {
      args.imageUrl = argv[++i];
    } else if (arg === "--caption-file") {
      args.captionFile = argv[++i];
    } else if (arg === "--media-source-url") {
      args.mediaSourceUrl = argv[++i];
    } else if (arg === "--license-status") {
      args.licenseStatus = argv[++i];
    } else if (arg === "--relevance-note") {
      args.relevanceNote = argv[++i];
    } else if (arg === "--history-file") {
      args.historyFile = argv[++i];
    } else {
      usage();
    }
  }
  if (
    !args.imageUrl ||
    !args.captionFile ||
    !args.mediaSourceUrl ||
    !args.licenseStatus ||
    !args.relevanceNote
  ) {
    usage();
  }
  return args;
}

function loadEnv(file) {
  const content = fs.readFileSync(file, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    if (!/^[A-Z0-9_]+=/.test(line)) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeWebsite(value) {
  const parsed = new URL(value);
  parsed.search = "";
  parsed.hash = "";
  if (!parsed.pathname || parsed.pathname === "") parsed.pathname = "/";
  return parsed.toString();
}

function normalizeWhatsAppBase(value) {
  const parsed = new URL(value);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function request(method, path, params, timeoutMs = 120000) {
  const maxAttempts = method === "GET" ? 4 : 3;
  let lastResult;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await requestHttps(method, path, params, timeoutMs);
    lastResult = shouldCurlFallback(result) ? requestCurl(method, path, params, timeoutMs) : result;

    const retryable =
      !lastResult.ok &&
      (lastResult.transportError ||
        lastResult.code ||
        (method === "GET" && lastResult.status && lastResult.status >= 500));
    if (!retryable) return lastResult;
    if (attempt < maxAttempts) await wait(750 * attempt);
  }
  return lastResult;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestHttps(method, path, params, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const body = params ? new URLSearchParams(params).toString() : "";
    const req = https.request(
      {
        host: GRAPH_HOST,
        servername: GRAPH_HOST,
        family: 4,
        method,
        path,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "content-length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            json = { raw: raw.slice(0, 500) };
          }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json });
        });
      }
    );
    req.on("error", (error) => {
      resolve({ ok: false, transportError: error.message, code: error.code });
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

function shouldCurlFallback(result) {
  if (!result || !result.transportError) return false;
  return /before secure TLS connection|ENOTFOUND|EAI_AGAIN/i.test(result.transportError);
}

function requestCurl(method, graphPath, params, timeoutMs = 120000) {
  const marker = "\n__HTTP_STATUS__:";
  const args = [
    "-sS",
    "-4",
    "--http1.1",
    "--max-time",
    String(Math.ceil(timeoutMs / 1000)),
    "-X",
    method,
    `https://${GRAPH_HOST}${graphPath}`,
    "-w",
    `${marker}%{http_code}`,
  ];

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      args.push("--data-urlencode", `${key}=${value}`);
    }
  }

  const curl = childProcess.spawnSync("curl", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (curl.status !== 0) {
    return {
      ok: false,
      transportError: curl.stderr ? curl.stderr.trim() : `curl exited with ${curl.status}`,
      code: "CURL_FALLBACK_FAILED",
    };
  }

  const raw = curl.stdout || "";
  const markerIndex = raw.lastIndexOf(marker);
  const body = markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;
  const status = markerIndex >= 0 ? Number(raw.slice(markerIndex + marker.length).trim()) : 0;
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    json = { raw: body.slice(0, 500) };
  }
  return { ok: status >= 200 && status < 300, status, json, transport: "curl_fallback" };
}

function graphError(json) {
  if (!json || !json.error) return null;
  return {
    message: json.error.message,
    code: json.error.code,
    type: json.error.type,
    subcode: json.error.error_subcode,
  };
}

function assertHttpUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https`);
  }
  return parsed;
}

function readMediaHistory(file) {
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSONL in ${file} at line ${index + 1}`);
      }
    });
}

function mediaGate(args) {
  assertHttpUrl(args.imageUrl, "--image-url");
  assertHttpUrl(args.mediaSourceUrl, "--media-source-url");

  const licenseStatus = args.licenseStatus.trim();
  const relevanceNote = args.relevanceNote.trim();
  if (licenseStatus.length < 8) {
    throw new Error("--license-status must describe the image permission or license");
  }
  if (/(unknown|unverified|unlicensed|copyrighted|random|scraped)/i.test(licenseStatus)) {
    throw new Error("--license-status is not acceptable for automatic publishing");
  }
  if (relevanceNote.length < 20) {
    throw new Error("--relevance-note must explain why the image matches the post topic");
  }

  const history = readMediaHistory(args.historyFile);
  const duplicate = history.find((entry) => entry && entry.imageUrl === args.imageUrl);
  if (duplicate) {
    throw new Error(
      `Image URL was already used in ${duplicate.reportPath || duplicate.usedAt || args.historyFile}; choose a new image`
    );
  }
}

function captionGate(caption) {
  const contact = readJson(CONTACT_FILE);
  const website = normalizeWebsite(contact.website);
  const whatsapp = normalizeWhatsAppBase(contact.whatsappUrl);
  const required = [
    `Website: ${website}`,
    `WhatsApp: ${whatsapp}`,
    `Phone: ${contact.phoneDisplay}`,
    `WeChat: ${contact.wechat}`,
    `Email: ${contact.email}`,
  ];
  const errors = [];

  if (contact.confirmed !== true) {
    errors.push("config/social-contact.json is not confirmed");
  }
  for (const item of required) {
    if (!caption.includes(item)) errors.push(`Missing clean contact line: ${item}`);
  }

  const forbidden = [
    [/\butm_(source|medium|campaign|term|content)\b/i, "Do not show UTM parameters in public Facebook captions"],
    [/https:\/\/www\.bingofabric\.com\/\?/i, "Use clean website URL without query parameters"],
    [/https:\/\/wa\.me\/\d+\?/i, "Use clean WhatsApp URL without prefilled text"],
    [/\?text=/i, "Do not show WhatsApp prefilled text query parameters"],
    [/%[0-9a-f]{2}/i, "Do not show URL-encoded text such as %20 in public captions"],
  ];
  for (const [pattern, message] of forbidden) {
    if (pattern.test(caption)) errors.push(message);
  }

  for (const line of caption.split(/\r?\n/)) {
    if (/^(Website|WhatsApp):/i.test(line) && line.length > 80) {
      errors.push(`Contact link line is too long: ${line.slice(0, 100)}`);
    }
  }

  const hashtags = caption.match(/(^|\s)#[A-Za-z0-9_]+/g) || [];
  if (hashtags.length > 3) {
    errors.push(`Too many hashtags: ${hashtags.length}. Use 2-3 focused hashtags.`);
  }

  const fabricDecisionPattern =
    /\b(GSM|shrinkage|recovery|drape|opacity|pilling|snagging|loop density|surface|rib|jersey|French terry|interlock|mesh|stretch|spacer|scuba|fabric structure|yarn|knitting tension|hand feel|body fabric)\b/i;
  const buyerProblemPattern =
    /\b(check|choose|choice|decision|before sampling|sampling|sample review|risk|problem|avoid|fails?|decides?|hold shape|wash|quotation)\b/i;
  if (!fabricDecisionPattern.test(caption) || !buyerProblemPattern.test(caption)) {
    errors.push("Caption must center on a fabric selection problem or sampling risk, not only product display.");
  }

  if (errors.length) {
    throw new Error(`Caption contact gate failed: ${errors.join("; ")}`);
  }
}

function appendMediaHistory(args, output) {
  fs.mkdirSync(path.dirname(args.historyFile), { recursive: true });
  const entry = {
    usedAt: new Date().toISOString(),
    platform: "facebook",
    imageUrl: args.imageUrl,
    sourceUrl: args.mediaSourceUrl,
    licenseStatus: args.licenseStatus.trim(),
    relevanceNote: args.relevanceNote.trim(),
    pageId: output.page && output.page.id ? output.page.id : null,
    photoId: output.publish && output.publish.id ? output.publish.id : null,
    postId: output.publish && output.publish.postId ? output.publish.postId : null,
  };
  fs.appendFileSync(args.historyFile, `${JSON.stringify(entry)}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  requireAutomationEnabled(["socialPublishing", "facebookPublishing"], {
    action: "Facebook publishing",
    dryRun: args.dryRun,
  });
  mediaGate(args);
  const env = loadEnv(".env.social.local");
  const pageId = env.META_PAGE_ID;
  const pageToken = env.META_PAGE_ACCESS_TOKEN;
  if (!pageId) throw new Error("META_PAGE_ID is missing");
  if (!pageToken) throw new Error("META_PAGE_ACCESS_TOKEN is missing");

  const caption = fs.readFileSync(args.captionFile, "utf8").trim();
  captionGate(caption);
  const output = {
    runAt: new Date().toISOString(),
    dryRun: args.dryRun,
    imageUrl: args.imageUrl,
    mediaSourceUrl: args.mediaSourceUrl,
    licenseStatus: args.licenseStatus,
  };

  const page = await request(
    "GET",
    `/v25.0/${encodeURIComponent(pageId)}?fields=id,name,link&access_token=${encodeURIComponent(pageToken)}`
  );
  output.page = {
    ok: page.ok,
    status: page.status,
    id: page.json && page.json.id ? page.json.id : null,
    name: page.json && page.json.name ? page.json.name : null,
    link: page.json && page.json.link ? page.json.link : null,
    error: graphError(page.json) || page.transportError || page.code || null,
  };
  if (!page.ok || !output.page.id) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const publish = await request("POST", `/v25.0/${encodeURIComponent(pageId)}/photos`, {
    url: args.imageUrl,
    caption,
    access_token: pageToken,
  });
  output.publish = {
    ok: publish.ok,
    status: publish.status,
    id: publish.json && publish.json.id ? publish.json.id : null,
    postId: publish.json && publish.json.post_id ? publish.json.post_id : null,
    error: graphError(publish.json) || publish.transportError || publish.code || null,
  };

  if (publish.ok && output.publish.id) {
    try {
      appendMediaHistory(args, output);
      output.mediaHistory = { recorded: true, file: args.historyFile };
    } catch (error) {
      output.mediaHistory = { recorded: false, file: args.historyFile, error: error.message };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }
  }

  console.log(JSON.stringify(output, null, 2));
  if (!publish.ok || !output.publish.id) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});

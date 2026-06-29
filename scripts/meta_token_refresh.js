#!/usr/bin/env node

const fs = require("fs");
const https = require("https");

const GRAPH_HOST = "graph.facebook.com";
const ENV_PATH = ".env.social.local";

function usage() {
  console.error(`Usage:
  node scripts/meta_token_refresh.js --check
  node scripts/meta_token_refresh.js --short-lived-user-token TOKEN --save
  pbpaste | node scripts/meta_token_refresh.js --stdin --save

This script never prints access tokens.`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { save: false, check: false, stdin: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--save") args.save = true;
    else if (arg === "--check") args.check = true;
    else if (arg === "--stdin") args.stdin = true;
    else if (arg === "--short-lived-user-token") args.shortLivedUserToken = argv[++i];
    else usage();
  }
  if (!args.check && !args.stdin && !args.shortLivedUserToken) usage();
  return args;
}

function loadEnv(file) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    if (!/^[A-Z0-9_]+=/.test(line)) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function saveEnv(file, updates) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const seen = new Set();
  const lines = existing.split(/\r?\n/).map((line) => {
    if (!/^[A-Z0-9_]+=/.test(line)) return line;
    const index = line.indexOf("=");
    const key = line.slice(0, index);
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(file, lines.join("\n").replace(/\n{3,}/g, "\n\n"));
}

async function graphRequest(method, path, params, timeoutMs = 120000) {
  const maxAttempts = method === "GET" ? 3 : 1;
  let lastResponse;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResponse = await graphRequestOnce(method, path, params, timeoutMs);
    const retryable =
      !lastResponse.ok &&
      (lastResponse.transportError || lastResponse.code || (lastResponse.status && lastResponse.status >= 500));
    if (!retryable) return lastResponse;
    if (attempt < maxAttempts) await wait(750 * attempt);
  }
  return lastResponse;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function graphRequestOnce(method, path, params, timeoutMs = 120000) {
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
    req.on("error", (error) => resolve({ ok: false, transportError: error.message, code: error.code }));
    req.on("timeout", () => req.destroy(new Error("timeout")));
    if (body) req.write(body);
    req.end();
  });
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

function appAccessToken(env) {
  if (!env.META_APP_ID) throw new Error("META_APP_ID is missing");
  if (!env.META_APP_SECRET) throw new Error("META_APP_SECRET is missing");
  return `${env.META_APP_ID}|${env.META_APP_SECRET}`;
}

function isoFromUnix(value) {
  if (!value || Number(value) === 0) return "";
  return new Date(Number(value) * 1000).toISOString();
}

async function debugToken(env, token) {
  const response = await graphRequest(
    "GET",
    `/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appAccessToken(env))}`
  );
  const data = response.json && response.json.data ? response.json.data : {};
  return {
    ok: response.ok && data.is_valid === true,
    status: response.status,
    isValid: data.is_valid === true,
    type: data.type || null,
    appIdPresent: Boolean(data.app_id),
    userIdPresent: Boolean(data.user_id),
    expiresAtUnix: data.expires_at || 0,
    expiresAt: isoFromUnix(data.expires_at),
    scopesCount: Array.isArray(data.scopes) ? data.scopes.length : null,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    error: graphError(response.json) || response.transportError || response.code || null,
  };
}

async function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => resolve(raw.trim()));
  });
}

function requireScopes(debug, requiredScopes) {
  const scopes = new Set(debug.scopes || []);
  return requiredScopes.filter((scope) => !scopes.has(scope));
}

function isTransportFailure(error) {
  return typeof error === "string" || (error && (error.code || !error.type));
}

async function fallbackUserCheck(token) {
  const response = await graphRequest(
    "GET",
    `/v25.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
  );
  return {
    ok: response.ok && Boolean(response.json && response.json.id),
    status: response.status,
    idPresent: Boolean(response.json && response.json.id),
    error: graphError(response.json) || response.transportError || response.code || null,
  };
}

async function fallbackPageCheck(env, token) {
  const response = await graphRequest(
    "GET",
    `/v25.0/${encodeURIComponent(env.META_PAGE_ID)}?fields=id,name,link&access_token=${encodeURIComponent(token)}`
  );
  return {
    ok: response.ok && String(response.json && response.json.id) === String(env.META_PAGE_ID),
    status: response.status,
    idPresent: Boolean(response.json && response.json.id),
    error: graphError(response.json) || response.transportError || response.code || null,
  };
}

async function exchangeUserToken(env, shortLivedUserToken) {
  const response = await graphRequest(
    "GET",
    `/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
      env.META_APP_ID
    )}&client_secret=${encodeURIComponent(env.META_APP_SECRET)}&fb_exchange_token=${encodeURIComponent(
      shortLivedUserToken
    )}`
  );
  if (!response.ok || !response.json || !response.json.access_token) {
    throw new Error(
      `Cannot exchange user token: ${JSON.stringify(graphError(response.json) || response.transportError || response.code)}`
    );
  }
  return {
    token: response.json.access_token,
    tokenType: response.json.token_type || "",
    expiresIn: response.json.expires_in || 0,
  };
}

async function fetchPageToken(env, longLivedUserToken, includeInstagramFields) {
  const fields = includeInstagramFields
    ? "id,name,access_token,instagram_business_account{id,username}"
    : "id,name,access_token";
  const response = await graphRequest(
    "GET",
    `/v25.0/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(
      longLivedUserToken
    )}`
  );
  if (!response.ok || !response.json || !Array.isArray(response.json.data)) {
    throw new Error(
      `Cannot list pages: ${JSON.stringify(graphError(response.json) || response.transportError || response.code)}`
    );
  }

  const page = response.json.data.find((item) => String(item.id) === String(env.META_PAGE_ID));
  if (!page) return fetchPageTokenById(env, longLivedUserToken, fields);
  if (!page.access_token) throw new Error("Selected page did not return an access_token.");

  return {
    pageId: page.id,
    pageName: page.name || "",
    pageToken: page.access_token,
    igId:
      page.instagram_business_account && page.instagram_business_account.id
        ? page.instagram_business_account.id
        : "",
    igUsername:
      page.instagram_business_account && page.instagram_business_account.username
        ? page.instagram_business_account.username
        : "",
  };
}

async function fetchPageTokenById(env, longLivedUserToken, fields) {
  if (!env.META_PAGE_ID) throw new Error("META_PAGE_ID is missing.");
  const response = await graphRequest(
    "GET",
    `/v25.0/${encodeURIComponent(env.META_PAGE_ID)}?fields=${encodeURIComponent(
      fields
    )}&access_token=${encodeURIComponent(longLivedUserToken)}`
  );
  const page = response.json || {};
  if (!response.ok || page.error) {
    throw new Error(
      `Cannot read page ${env.META_PAGE_ID}: ${JSON.stringify(
        graphError(response.json) || response.transportError || response.code
      )}`
    );
  }
  if (String(page.id) !== String(env.META_PAGE_ID)) {
    throw new Error(`Direct page lookup returned unexpected page id ${page.id || "(missing)"}.`);
  }
  if (!page.access_token) throw new Error("Direct page lookup did not return an access_token.");

  return {
    pageId: page.id,
    pageName: page.name || "",
    pageToken: page.access_token,
    igId:
      page.instagram_business_account && page.instagram_business_account.id
        ? page.instagram_business_account.id
        : "",
    igUsername:
      page.instagram_business_account && page.instagram_business_account.username
        ? page.instagram_business_account.username
        : "",
  };
}

async function checkExisting(env) {
  const output = { ok: true, checkedAt: new Date().toISOString(), tokens: {} };
  if (env.META_LONG_LIVED_USER_ACCESS_TOKEN) {
    const userDebug = await debugToken(env, env.META_LONG_LIVED_USER_ACCESS_TOKEN);
    const userFallback = !userDebug.ok && isTransportFailure(userDebug.error)
      ? await fallbackUserCheck(env.META_LONG_LIVED_USER_ACCESS_TOKEN)
      : null;
    output.tokens.longLivedUser = {
      ok: userDebug.ok || Boolean(userFallback && userFallback.ok),
      type: userDebug.ok ? userDebug.type : (userFallback && userFallback.ok ? "USER" : userDebug.type),
      expiresAt: userDebug.expiresAt || "never",
      scopesCount: userDebug.scopesCount,
      validation: userDebug.ok ? "debug_token" : (userFallback ? "me_fallback" : "debug_token"),
      error: userDebug.ok || (userFallback && userFallback.ok) ? null : (userFallback ? userFallback.error : userDebug.error),
    };
    if (!output.tokens.longLivedUser.ok) output.ok = false;
  }
  if (env.META_PAGE_ACCESS_TOKEN) {
    const pageDebug = await debugToken(env, env.META_PAGE_ACCESS_TOKEN);
    const pageFallback = !pageDebug.ok && isTransportFailure(pageDebug.error)
      ? await fallbackPageCheck(env, env.META_PAGE_ACCESS_TOKEN)
      : null;
    output.tokens.page = {
      ok: pageDebug.ok || Boolean(pageFallback && pageFallback.ok),
      type: pageDebug.ok ? pageDebug.type : (pageFallback && pageFallback.ok ? "PAGE" : pageDebug.type),
      expiresAt: pageDebug.expiresAt || "never",
      scopesCount: pageDebug.scopesCount,
      validation: pageDebug.ok ? "debug_token" : (pageFallback ? "page_lookup_fallback" : "debug_token"),
      error: pageDebug.ok || (pageFallback && pageFallback.ok) ? null : (pageFallback ? pageFallback.error : pageDebug.error),
    };
    if (!output.tokens.page.ok) output.ok = false;
  }
  if (!env.META_LONG_LIVED_USER_ACCESS_TOKEN && !env.META_PAGE_ACCESS_TOKEN) output.ok = false;
  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv(ENV_PATH);

  if (args.check) {
    console.log(JSON.stringify(await checkExisting(env), null, 2));
    return;
  }

  const shortToken = args.stdin ? await readStdin() : args.shortLivedUserToken;
  if (!shortToken) throw new Error("Short-lived user token is empty.");

  const longUser = await exchangeUserToken(env, shortToken);
  const longUserDebug = await debugToken(env, longUser.token);
  const requiredScopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
  ];
  const recommendedScopes = [
    "instagram_basic",
    "instagram_content_publish",
  ];
  const missingScopes = requireScopes(longUserDebug, requiredScopes);
  const missingRecommendedScopes = requireScopes(longUserDebug, recommendedScopes);
  if (!longUserDebug.ok) throw new Error(`Long-lived user token debug failed: ${JSON.stringify(longUserDebug.error)}`);
  if (missingScopes.length) throw new Error(`Token is missing required scopes: ${missingScopes.join(", ")}`);

  const page = await fetchPageToken(env, longUser.token, missingRecommendedScopes.length === 0);
  const pageDebug = await debugToken(env, page.pageToken);
  if (!pageDebug.ok) throw new Error(`Page token debug failed: ${JSON.stringify(pageDebug.error)}`);

  const now = new Date().toISOString();
  const updates = {
    META_LONG_LIVED_USER_ACCESS_TOKEN: longUser.token,
    META_LONG_LIVED_USER_ACCESS_TOKEN_SAVED_AT: now,
    META_LONG_LIVED_USER_ACCESS_TOKEN_EXPIRES_AT: longUserDebug.expiresAt,
    META_PAGE_ACCESS_TOKEN: page.pageToken,
    META_PAGE_ACCESS_TOKEN_SAVED_AT: now,
    META_PAGE_ACCESS_TOKEN_EXPIRES_AT: pageDebug.expiresAt || "never",
  };
  if (page.igId) updates.INSTAGRAM_PROFESSIONAL_ACCOUNT_ID = page.igId;

  if (args.save) saveEnv(ENV_PATH, updates);

  console.log(
    JSON.stringify(
      {
        ok: true,
        saved: args.save,
        page: { id: page.pageId, name: page.pageName },
        instagram: { idPresent: Boolean(page.igId), username: page.igUsername || null },
        longLivedUserToken: {
          present: true,
          expiresAt: longUserDebug.expiresAt || "unknown",
          scopesCount: longUserDebug.scopesCount,
        },
        pageToken: {
          present: true,
          expiresAt: pageDebug.expiresAt || "never",
          scopesCount: pageDebug.scopesCount,
        },
        missingRecommendedScopes,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});

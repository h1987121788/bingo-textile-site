#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const { requireAutomationEnabled } = require("./automation_guard");

const GRAPH_HOST = "graph.instagram.com";
const FACEBOOK_GRAPH_HOST = "graph.facebook.com";
const FALLBACK_IPS = ["163.70.159.63", "57.144.64.192"];

function usage() {
  console.error(
    "Usage: node scripts/instagram_publish.js --image-url URL --caption-file PATH [--dry-run]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--image-url") {
      args.imageUrl = argv[++i];
    } else if (arg === "--caption-file") {
      args.captionFile = argv[++i];
    } else {
      usage();
    }
  }
  if (!args.imageUrl || !args.captionFile) usage();
  return args;
}

function loadEnv(path) {
  const content = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of content.split(/\n/)) {
    if (!/^[A-Z0-9_]+=/.test(line)) continue;
    const idx = line.indexOf("=");
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function requestHost(method, path, params, timeoutMs = 120000) {
  return request({ host: GRAPH_HOST, servername: GRAPH_HOST }, method, path, params, timeoutMs);
}

function requestFacebookGraph(method, path, params, timeoutMs = 120000) {
  return request(
    { host: FACEBOOK_GRAPH_HOST, servername: FACEBOOK_GRAPH_HOST },
    method,
    path,
    params,
    timeoutMs
  );
}

function requestIp(ip, method, path, params, timeoutMs = 120000) {
  return request(
    { host: ip, servername: GRAPH_HOST, headers: { host: GRAPH_HOST } },
    method,
    path,
    params,
    timeoutMs
  );
}

function request(target, method, path, params, timeoutMs) {
  return new Promise((resolve) => {
    const body = params ? new URLSearchParams(params).toString() : "";
    const headers = {
      ...(target.headers || {}),
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body),
    };
    const req = https.request(
      {
        host: target.host,
        servername: target.servername,
        method,
        path,
        headers,
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

function graphError(json) {
  if (!json || !json.error) return null;
  return {
    message: json.error.message,
    code: json.error.code,
    type: json.error.type,
    subcode: json.error.error_subcode,
  };
}

async function dohIps() {
  const urls = [
    "https://cloudflare-dns.com/dns-query?name=graph.instagram.com&type=A",
    "https://dns.google/resolve?name=graph.instagram.com&type=A",
  ];
  const ips = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { accept: "application/dns-json" } });
      const json = await response.json();
      for (const answer of json.Answer || []) {
        if (answer.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(answer.data)) {
          ips.push(answer.data);
        }
      }
    } catch {
      // DNS-over-HTTPS is a convenience fallback. Static fallback IPs remain below.
    }
  }
  return [...new Set([...ips, ...FALLBACK_IPS])];
}

async function graphRequest(method, path, params) {
  const direct = await requestHost(method, path, params);
  if (direct.ok || graphError(direct.json)) {
    return { ...direct, route: { mode: "host", host: GRAPH_HOST } };
  }

  const ips = await dohIps();
  const attempts = [{ mode: "host", error: direct.transportError || direct.code || direct.status }];
  for (const ip of ips) {
    const viaIp = await requestIp(ip, method, path, params);
    attempts.push({ mode: "ip", ip, ok: viaIp.ok, status: viaIp.status, error: viaIp.transportError || viaIp.code || graphError(viaIp.json) });
    if (viaIp.ok || graphError(viaIp.json)) {
      return { ...viaIp, route: { mode: "ip", host: GRAPH_HOST, ip }, attempts };
    }
  }
  return { ok: false, attempts };
}

async function main() {
  const args = parseArgs(process.argv);
  requireAutomationEnabled(["socialPublishing", "instagramPublishing"], {
    action: "Instagram publishing",
    dryRun: args.dryRun,
  });
  const env = loadEnv(".env.social.local");
  const caption = fs.readFileSync(args.captionFile, "utf8").trim();
  const output = {
    runAt: new Date().toISOString(),
    dryRun: args.dryRun,
    imageUrl: args.imageUrl,
  };

  if (env.META_PAGE_ACCESS_TOKEN && env.INSTAGRAM_PROFESSIONAL_ACCOUNT_ID) {
    const token = env.META_PAGE_ACCESS_TOKEN;
    const igUserId = env.INSTAGRAM_PROFESSIONAL_ACCOUNT_ID;
    output.mode = "facebook_graph_ig_user";

    const account = await requestFacebookGraph(
      "GET",
      `/v25.0/${encodeURIComponent(igUserId)}?fields=id,username&access_token=${encodeURIComponent(token)}`
    );
    output.me = {
      ok: account.ok,
      status: account.status,
      route: { mode: "host", host: FACEBOOK_GRAPH_HOST },
      id: account.json && account.json.id ? account.json.id : null,
      username: account.json && account.json.username ? account.json.username : null,
      error: graphError(account.json) || account.transportError || account.code || null,
    };
    if (!account.ok || !account.json || !account.json.id) {
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    const limit = await requestFacebookGraph(
      "GET",
      `/v25.0/${encodeURIComponent(igUserId)}/content_publishing_limit?access_token=${encodeURIComponent(token)}`
    );
    output.limit = {
      ok: limit.ok,
      status: limit.status,
      route: { mode: "host", host: FACEBOOK_GRAPH_HOST },
      data: limit.json && limit.json.data ? limit.json.data : null,
      error: graphError(limit.json) || limit.transportError || limit.code || null,
    };

    if (args.dryRun) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    const create = await requestFacebookGraph("POST", `/v25.0/${encodeURIComponent(igUserId)}/media`, {
      image_url: args.imageUrl,
      caption,
      access_token: token,
    });
    output.create = {
      ok: create.ok,
      status: create.status,
      route: { mode: "host", host: FACEBOOK_GRAPH_HOST },
      id: create.json && create.json.id ? create.json.id : null,
      error: graphError(create.json) || create.transportError || create.code || null,
    };
    if (!create.ok || !create.json || !create.json.id) {
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    let containerStatus = null;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
      const status = await requestFacebookGraph(
        "GET",
        `/v25.0/${encodeURIComponent(create.json.id)}?fields=id,status_code&access_token=${encodeURIComponent(token)}`
      );
      containerStatus = {
        ok: status.ok,
        status: status.status,
        route: { mode: "host", host: FACEBOOK_GRAPH_HOST },
        data: status.json || null,
        error: graphError(status.json) || status.transportError || status.code || null,
        attempt,
      };
      if (status.ok && status.json && status.json.status_code === "FINISHED") break;
    }
    output.containerStatus = containerStatus;

    const publish = await requestFacebookGraph("POST", `/v25.0/${encodeURIComponent(igUserId)}/media_publish`, {
      creation_id: create.json.id,
      access_token: token,
    });
    output.publish = {
      ok: publish.ok,
      status: publish.status,
      route: { mode: "host", host: FACEBOOK_GRAPH_HOST },
      id: publish.json && publish.json.id ? publish.json.id : null,
      error: graphError(publish.json) || publish.transportError || publish.code || null,
    };

    console.log(JSON.stringify(output, null, 2));
    if (!publish.ok || !output.publish.id) process.exit(1);
    return;
  }

  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is missing");
  output.mode = "instagram_graph_legacy";

  const me = await graphRequest("GET", `/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
  output.me = {
    ok: me.ok,
    status: me.status,
    route: me.route || null,
    id: me.json && me.json.id ? me.json.id : null,
    username: me.json && me.json.username ? me.json.username : null,
    error: graphError(me.json) || me.transportError || me.code || null,
  };
  if (!me.ok || !me.json || !me.json.id) {
    output.attempts = me.attempts || null;
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  const igUserId = me.json.id;
  const limit = await graphRequest(
    "GET",
    `/v25.0/${encodeURIComponent(igUserId)}/content_publishing_limit?access_token=${encodeURIComponent(token)}`
  );
  output.limit = {
    ok: limit.ok,
    status: limit.status,
    route: limit.route || null,
    data: limit.json && limit.json.data ? limit.json.data : null,
    error: graphError(limit.json) || limit.transportError || limit.code || null,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const create = await graphRequest("POST", `/v25.0/${encodeURIComponent(igUserId)}/media`, {
    image_url: args.imageUrl,
    caption,
    access_token: token,
  });
  output.create = {
    ok: create.ok,
    status: create.status,
    route: create.route || null,
    id: create.json && create.json.id ? create.json.id : null,
    error: graphError(create.json) || create.transportError || create.code || null,
  };
  if (!create.ok || !create.json || !create.json.id) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  let containerStatus = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
    const status = await graphRequest(
      "GET",
      `/v25.0/${encodeURIComponent(create.json.id)}?fields=id,status_code&access_token=${encodeURIComponent(token)}`
    );
    containerStatus = {
      ok: status.ok,
      status: status.status,
      route: status.route || null,
      data: status.json || null,
      error: graphError(status.json) || status.transportError || status.code || null,
      attempt,
    };
    if (status.ok && status.json && status.json.status_code === "FINISHED") break;
  }
  output.containerStatus = containerStatus;

  const publish = await graphRequest("POST", `/v25.0/${encodeURIComponent(igUserId)}/media_publish`, {
    creation_id: create.json.id,
    access_token: token,
  });
  output.publish = {
    ok: publish.ok,
    status: publish.status,
    route: publish.route || null,
    id: publish.json && publish.json.id ? publish.json.id : null,
    error: graphError(publish.json) || publish.transportError || publish.code || null,
  };

  console.log(JSON.stringify(output, null, 2));
  if (!publish.ok || !output.publish.id) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});

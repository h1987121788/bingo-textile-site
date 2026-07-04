# Project Status - 2026-07-04

## Source of Truth

- Production domain: `https://www.bingofabric.com/`
- Remote repository: `https://github.com/h1987121788/bingo-textile-site.git`
- Deployment source: `origin/main`
- Current deployment worktree: `/Users/huang/Documents/poly/bingo-textile-governance-20260704`
- Operations workspace: `/Users/huang/Desktop/纺织`

The operations workspace is not a deployment source. It contains local automation state, reports, outputs, `.env.*.local` files, and private outreach data. Deploy only from `origin/main` or a clean worktree created from `origin/main`.

## Clean Repository Scope

Keep in the deployment repository:

- Website pages, styles, browser scripts, catalog data, favicon, robots file, sitemap, and CNAME.
- Necessary website assets under `assets/capability/` and `assets/products/`.
- Configuration templates and non-secret operating config.
- Automation source code under `scripts/`.
- Example outreach data and sanitized keyword seed files only.

Do not keep in the deployment repository:

- `reports/`: generated operation reports.
- `outputs/`: generated decks, PDFs, screenshots, and other runtime artifacts.
- `.env.*`: local tokens, IDs, SMTP settings, and account credentials. Only `.env.*.example` templates may remain.
- `config/marketing-config.local.js`: local production-fill marketing config.
- Real outreach data under `data/outreach_*`, including leads, sent logs, suppression lists, bounces, dated candidates, send batches, follow-up files, query logs, and reply logs.
- `data/customs_trade_sources_*`: customs/trade-source precheck data.
- Local learned keyword files such as `data/outreach_keyword_bank.local.json` and `data/outreach_keywords.local.csv`.
- `node_modules/` or local dependency output.

## Configuration Status

`config/marketing-config.js` is a production-fill template. Real GA4, Meta Pixel, Google Apps Script webhook URL, and CRM submit token must stay outside source control.

The Apps Script webhook template requires `CRM_WEBHOOK_TOKEN` in Apps Script project properties. The source file must not contain a reusable fallback token. If the previous CRM submit token was ever deployed publicly, rotate it in Apps Script before relying on webhook capture again.

Production tracking or CRM capture should be considered active only after these checks pass:

- GA4 Realtime receives a visit.
- Meta Events Manager receives `PageView`, `Lead`, and `Contact`.
- A test website form creates one Google Sheet row.
- WhatsApp opens with the prefilled sourcing brief.

## Automation Status

As of `config/automation-control.json` dated 2026-06-23:

- Facebook publishing: enabled by operator request.
- Instagram publishing: disabled.
- X publishing: disabled.
- B2B discovery and review reports: enabled.
- Real QQ SMTP outreach sending: disabled by default.
- QQ SMTP test emails: disabled by default.
- CRM webhook capture: enabled, but source config is templated and requires production values before live capture.
- Dry runs are allowed only for validation and must not publish posts or send emails.

## Governance Rules

- Do not deploy `/Users/huang/Desktop/纺织` directly.
- Keep deployment source clean and separate from operation output.
- Keep real outreach data, env files, generated reports, and generated outputs out of Git.
- Keep source templates free of reusable secrets.
- Commit and deploy only reviewed source changes from a clean `origin/main` worktree.

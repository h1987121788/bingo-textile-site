# Project Status - 2026-07-12

## Garment-First Production Release

- Release worktree: `/Users/huang/Documents/poly/bingo-textile-garments-local-20260712`
- Release branch: `codex/garments-local-20260712`, published to `origin/main`.
- The homepage is now garment-first under the `Bingo Garments` customer-facing name.
- Knit fabric pages remain as the supporting `Material Library`; they are no longer the primary homepage offer.
- The customer-facing shortlist contains six garment development directions selected from a 20-style internal pool.
- All current garment images are original AI concepts for product direction, not supplier, factory, sample, or production proof.
- The garment homepage, garment catalog, and five Material Library pages are indexable production pages.
- Website forms send the existing CRM webhook payload and open a prepared WhatsApp inquiry.
- The browser-side CRM submit token is publicly readable by design and is only a simple anti-spam parameter, not a secret credential.
- AI concepts remain labelled on the public pages. Replace them with approved physical-sample photography as samples become available.

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

`config/marketing-config.js` currently contains the production Google Apps Script webhook URL and browser submit token so the static GitHub Pages form can reach CRM. Both values are publicly readable in the browser and must not be treated as secrets. GA4 and Meta Pixel remain placeholders.

The Apps Script webhook requires the matching `CRM_WEBHOOK_TOKEN` in Apps Script project properties. The Apps Script source file must not contain a reusable fallback token. Stronger protection requires server-side rate limiting, validation or a challenge mechanism; a browser token alone is not authentication.

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
- CRM webhook capture: enabled with the current public browser configuration and Apps Script property check.
- Dry runs are allowed only for validation and must not publish posts or send emails.

## Governance Rules

- Do not deploy `/Users/huang/Desktop/纺织` directly.
- Keep deployment source clean and separate from operation output.
- Keep real outreach data, env files, generated reports, and generated outputs out of Git.
- Keep server-side credentials and reusable secrets out of browser source. Treat all static-site configuration as public.
- Commit and deploy only reviewed source changes from a clean `origin/main` worktree.

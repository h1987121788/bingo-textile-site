# Project Status - 2026-06-28

## Source of Truth

- Production domain: `https://www.bingofabric.com/`
- Remote repository: `https://github.com/h1987121788/bingo-textile-site.git`
- Deployment baseline: `origin/main` at `36fa43b3e02a47a37b8689500c1b189a2d39edc2` (`Add SEO landing pages for fabric sourcing`)
- Clean governance branch: `codex/project-governance-p1`
- Clean worktree: `/Users/huang/Documents/poly/bingo-textile-p1-governance`
- Operational workspace: `/Users/huang/Desktop/纺织`

The operational workspace is not a clean deployment source. It contains website source, automation code, reports, generated outputs, local environment files, and live outreach data. Deployment work should use the clean branch created from `origin/main`, then selectively promote reviewed source changes.

## Clean Branch Scope

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
- Real outreach data under `data/outreach_*`, including leads, sent logs, suppression lists, bounces, dated candidates, send batches, follow-up files, and query logs.
- Local learned keyword files such as `data/outreach_keyword_bank.local.json` and `data/outreach_keywords.local.csv`.
- `node_modules/` or local dependency output.

## Current Website State

- The site includes the home page plus SEO pages for fabric sourcing, heavyweight T-shirt fabric, French terry hoodie fabric, rib knit fabric, and stretch jersey fabric.
- The product catalog is source-backed by `catalog-data.js` and website product images in `assets/products/`.
- CRM and tracking setup files exist, including `scripts/google_apps_script_lead_webhook.gs` and `CRM_AND_TRACKING_SETUP.md`.
- `config/marketing-config.js` is kept as a production-fill template in the clean branch. GA4, Meta Pixel, CRM webhook URL, and CRM submit token must be filled during deployment or local production setup.

## Current Automation State

As of the 2026-06-28 governance record, `config/automation-control.json` defines:

- Facebook publishing: enabled by operator request.
- Instagram publishing: disabled.
- X publishing: disabled.
- Outreach discovery and review reports: enabled.
- Real QQ SMTP outreach sending: disabled by default.
- QQ SMTP test emails: disabled by default.
- CRM webhook capture: enabled.
- Dry runs: allowed only for validation and must not publish posts or send emails.

All social and outreach runs must validate `config/social-contact.json` first. The clean branch does not include generated product-intro decks from `outputs/`; any email attachment must be configured in local runtime storage, not committed to the deployment repository.

The CRM webhook token is intentionally not committed. `scripts/google_apps_script_lead_webhook.gs` requires `CRM_WEBHOOK_TOKEN` in Apps Script project properties before accepting website lead submissions.

## Operational Data Baseline

The operational workspace holds live acquisition history and should be treated as private business data. Around the 2026-06-28 audit window it contained:

- Hundreds of outreach lead rows and sent-log entries.
- Suppression, bounce, SMTP rejection, follow-up, and dated candidate files.
- Generated reports and output artifacts from outreach, social posting, SEO, CRM, and testing work.

These files were intentionally excluded from the clean governance branch. If operational data is needed for analysis, export a redacted snapshot outside the deployment repository.

## Governance Status

P1 cleanup action:

- A clean branch was created from `origin/main`.
- Source files, public pages, config templates, necessary images, and automation source were copied into the clean worktree.
- `reports/`, `outputs/`, real `.env.*`, `node_modules/`, and real `data/outreach_*` operation files were kept out of the deployment branch.
- Keyword files committed to the clean branch were reduced to sanitized seed rules; operational learning updates should use ignored `.local` files.
- `.gitignore` was tightened to keep future operational outreach files out of Git.

Next recommended step:

- Review the clean branch diff, then commit only the governance source set.
- Keep daily outreach/social operation output in local storage or a private operations repository, not in the public deployment repository.

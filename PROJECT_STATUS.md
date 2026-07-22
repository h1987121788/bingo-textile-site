# Project Status - 2026-07-22

## Garment-First Production Release

- Production baseline for this work: `origin/main` at `74fb52e0088c7cd82c3ecb170b5e1650e58ae7cd`.
- Clean worktree: `/Users/huang/Documents/poly/bingo-textile-flagship-tee-20260722`.
- Current branch: `codex/flagship-tee-20260722`.
- The homepage is now garment-first under the `Bingo Garments` customer-facing name.
- Knit fabric pages remain as the supporting `Material Library`; they are no longer the primary homepage offer.
- The customer-facing catalog contains 47 garment styles; the homepage features the verified flagship plus five other directions.
- `BG-GM-047` is the flagship 100% cotton, 280gsm oversized T-shirt in sizes S-2XL. Its operator-confirmed base price is USD 6.00 per piece with freight excluded, and finished-garment printing orders are accepted after artwork and quantity review.
- The other 46 finished sample styles remain available for sourcing inquiries, but no exact commercial price, composition, GSM, size or detail-board claim is displayed until dated supplier evidence marks it verified.
- The operator confirmed on 2026-07-16 that the original 46 catalog styles correspond to real finished garment samples and confirmed the new flagship sample, specifications, price and supplied imagery on 2026-07-22.
- The original 46 public image files use a standardized generated catalog presentation. `BG-GM-047` uses operator-provided finished-sample photos and an English size chart.
- All-English detail-board assets remain available for review, but the website does not link them until the supplier specification is verified against the confirmed sample style.
- The garment homepage, garment catalog, and five Material Library pages are indexable production pages.
- Website forms keep at most seven required inputs, add an optional business email, open a prepared WhatsApp inquiry and wait for a nonce-matched CRM receipt before reporting that the lead was saved.
- Every lead form now has a honeypot and minimum-fill-time check. The updated Apps Script source adds payload validation, per-identity rate limiting, locking, durable submission-ID duplicate checks and spreadsheet formula-injection protection.
- The browser-side CRM submit token is publicly readable by design and is only a simple anti-spam parameter, not a secret credential.
- Public pages present the products as finished sample garments without an AI badge. `BG-GM-047` exposes its verified fields; all other specifications, stock and commercial terms remain gated until supplier records are reviewed.
- The clean repository does not contain a verified source-to-public supplier map. Only `BG-GM-047` has dated specification and commercial-price evidence; physical sample existence for the original catalog is recorded from the operator's 2026-07-16 confirmation.
- `data/garment_review_status.json` records that boundary for all 47 SKUs, and `garment-review-status.js` exposes only sanitized effective statuses to the browser. The normal catalog validator enforces that mirror; strict commercial validation intentionally fails while the other 46 commercial prices remain unverified.
- GitHub validation now checks automation safety, catalog integrity, public site structure and webhook controls on pull requests and `main` pushes.

## P0 Acquisition Safety

- Newly discovered outreach candidates default to `pending_review`; discovery cannot mark a candidate approved.
- A daily review report contains at most five candidates and may contain fewer. A candidate must have a target country, an official-website URL proving explicit independent ownership or founder-led status, an official website, a public business email with source evidence, and general source evidence. A storefront alone is not independent-brand evidence.
- Region exclusion, email validation, suppression matching, domain-first deduplication and manual approval are enforced again immediately before any reviewed send.
- Discovery uses the authorized Brave Search API plus official brand websites. Search-engine result HTML and proxy-reader fallbacks are not used.
- `BRAVE_SEARCH_API_KEY` is not stored in Git. The runtime must supply it through an ignored local environment file before live discovery can run.
- Social publishing, real outreach sending and SMTP test sending remain disabled. P0 does not re-enable any outbound action.
- Automated tests cover outreach qualification, discovery sources, suppression, deduplication, manual approval, CRM test-row handling, weekly-report exclusion and marketing-event wiring.

## Source of Truth

- Production domain: `https://www.bingofabric.com/`
- Remote repository: `https://github.com/h1987121788/bingo-textile-site.git`
- Deployment source: `origin/main`
- Current website worktree: `/Users/huang/Documents/poly/bingo-textile-flagship-tee-20260722`
- Operations workspace: `/Users/huang/Desktop/纺织`

The operations workspace is not a deployment source. It contains local automation state, reports, outputs, `.env.*.local` files, and private outreach data. Deploy only from `origin/main` or a clean worktree created from `origin/main`.

## Clean Repository Scope

Keep in the deployment repository:

- Website pages, styles, browser scripts, catalog data, favicon, robots file, sitemap, and CNAME.
- Necessary website assets under `assets/capability/`, `assets/products/`, and `assets/garments/`.
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

`config/marketing-config.js` contains the production GA4 measurement ID, Meta Pixel ID, Search Console verification value, Google Apps Script webhook URL and browser submit token. These values are publicly readable in the static site and must not be treated as secrets.

The Apps Script webhook requires the matching `CRM_WEBHOOK_TOKEN` in Apps Script project properties. The Apps Script source file must not contain a reusable fallback token. Stronger protection requires server-side rate limiting, validation or a challenge mechanism; a browser token alone is not authentication.

The repository Apps Script source was synced to the bound `Bingo Textile CRM Webhook` project on 2026-07-15. Web App version 2 was deployed for anyone-access submission, while execution remains under the spreadsheet owner's account. The matching token and spreadsheet ID are stored in Apps Script Properties, not in the Apps Script source.

Deployment verification confirmed that a request without the token is rejected and that a valid request receives a nonce-matched iframe receipt. The iframe receipt targets the website's top window so the Apps Script sandbox wrapper cannot intercept it. The website accepts the receipt only from the HTTPS Apps Script or `script.googleusercontent.com` sandbox origin and only when its type and random submission ID match. The final production-browser test displayed `Inquiry saved`, opened but did not send the prepared WhatsApp brief, and created a `Website Leads` row with `is_test=yes`. A repeated submission ID returned `duplicate=true` without creating another row.

The website sets `is_test=yes` only when loaded with `?crm_test=1`; normal visitors are stored with `is_test=no`. Weekly conversion reporting excludes test rows and reports the excluded count separately.

The five legacy CRM verification rows that predated the `is_test` column were backfilled to `is_test=yes` on 2026-07-15. At verification time, all nine existing `Website Leads` data rows were explicit test records and `AP2:AP10` contained `yes`, so none belongs in business conversion metrics.

Source-level tracking validation covers these mappings:

- Product interest: GA4 `product_interest` and Meta `ViewContent`.
- WhatsApp click: GA4 `contact_whatsapp` and Meta `Contact`.
- Confirmed CRM form receipt: GA4 `generate_lead` and Meta `Lead`.

GA4 Realtime and Meta Events Manager account-side receipt still require observation in their dashboards after the production page is deployed and visited; source configuration alone does not prove vendor-side receipt.

## Automation Status

As of `config/automation-control.json` dated 2026-07-14:

- Facebook publishing: disabled by the operator's latest instruction.
- Instagram publishing: disabled.
- X publishing: disabled.
- B2B discovery and review reports: enabled only when the runtime supplies `BRAVE_SEARCH_API_KEY`; no fallback HTML scraping is permitted.
- Real QQ SMTP outreach sending: disabled by default.
- QQ SMTP test emails: disabled by default.
- CRM webhook capture: enabled with the current public browser configuration and Apps Script property check.
- Dry runs are allowed only for validation and must not publish posts or send emails.
- Outreach discovery remains garment-first. Drafts only claim an attachment when a configured local file actually exists; otherwise they link to the public garment catalog and retain the repository's verified/unverified product boundaries.
- No repository scheduler, user crontab, matching LaunchAgent or running publishing process was found during the 2026-07-14 scan.

## Governance Rules

- Do not deploy `/Users/huang/Desktop/纺织` directly.
- Keep deployment source clean and separate from operation output.
- Keep real outreach data, env files, generated reports, and generated outputs out of Git.
- Keep server-side credentials and reusable secrets out of browser source. Treat all static-site configuration as public.
- Commit and deploy only reviewed source changes from a clean `origin/main` worktree.

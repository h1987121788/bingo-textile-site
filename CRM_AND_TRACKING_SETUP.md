# CRM and Tracking Setup

This project now supports GA4, Search Console, Meta Pixel, and CRM lead capture. Publishing and social automations remain paused unless you explicitly reactivate them.

## 1. Google Analytics 4

The production configuration currently uses the previously provisioned Bingo web stream:

```js
ga4MeasurementId: "G-4W8V1TXJGH"
```

The website will load GA4 after the visitor accepts the analytics banner.

## 2. Google Search Console

Recommended manual step:

Use a Domain property and verify with a DNS TXT record at your domain provider.

Alternative:

Use a URL-prefix property and copy the verification code from the HTML meta tag. Then edit `index.html`:

```html
<meta name="google-site-verification" content="PASTE_CODE_HERE" />
```

After verification, submit:

```text
https://www.bingofabric.com/sitemap.xml
```

## 3. Meta Pixel

The production configuration currently uses the previously provisioned Bingo Pixel:

```js
metaPixelId: "2252311015604509"
```

Tracked website actions:

- `PageView`
- `Lead` when a valid sourcing form opens WhatsApp
- `Contact` when a WhatsApp link is clicked
- `ViewContent` when a product sample/matching link is clicked

## 4. CRM Lead Capture

Recommended MVP: Google Sheets through Apps Script.

Manual setup:

1. Create a Google Sheet named `Bingo Textile Website Leads`.
2. Open Extensions -> Apps Script.
3. Paste the contents of `scripts/google_apps_script_lead_webhook.gs`.
4. Open Project Settings -> Script properties.
5. Add `CRM_WEBHOOK_TOKEN` with a random value. Do not commit the production value to Git.
6. Deploy -> New deployment -> Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Copy the Web app URL.

Project step:

Edit `config/marketing-config.js`:

```js
crmWebhookUrl: "PASTE_WEB_APP_URL"
crmSubmitToken: "SAME_TOKEN_AS_APPS_SCRIPT"
```

`scripts/google_apps_script_lead_webhook.gs` checks `crmSubmitToken` before appending to the Sheet. Keep the value in the deployed site configuration and the Apps Script `CRM_WEBHOOK_TOKEN` script property aligned. Because a static website must send this value from the browser, it is an abuse filter, not a private server-to-server secret. Rotate it if it is copied or abused.

When a visitor submits a valid form, the site opens WhatsApp and posts the lead through a hidden response frame. The Apps Script returns a nonce-matched `postMessage` receipt. The website only reports that the inquiry was saved after receiving that receipt; otherwise it keeps the form values and shows the WhatsApp/email fallback.

The Apps Script temporarily accepts the previous JSON request format without a submission ID so the backend can be deployed before the GitHub Pages frontend without interrupting existing lead capture. Receipt-mode requests always require the submission ID.

In local preview, or when the webhook is not configured, the site stores at most five recent lead drafts in browser localStorage. The CRM token is removed from those drafts. A configured production site does not keep CRM lead copies in browser localStorage.

The current form and Apps Script also apply basic anti-spam controls:

- A visually hidden honeypot field on every lead form.
- A minimum form completion time checked by both browser and webhook.
- Server-side required field, email, phone digit, payload size, and field length checks.
- Five accepted attempts per identity per ten minutes through Apps Script CacheService.
- Apps Script LockService around rate checking and row creation.
- A per-submission ID used to suppress immediate duplicate rows and match the browser receipt.
- Spreadsheet formula-injection escaping for values beginning with `=`, `+`, `-`, or `@`.

These controls reduce basic automated abuse; they do not replace a server-held secret, CAPTCHA, WAF, or consent/legal review.

### Sales Pipeline Fields

The Apps Script keeps the existing lead columns and adds CRM pipeline fields when the Sheet is created or when an older Sheet is used:

- `lead_status`: default `new_inquiry`.
- `next_action_at`: default next calendar day.
- `sample_requested`: `yes` when the visitor requests swatches, lab dips, or sample matching support.
- `quoted_value`: manual quote value for weekly review.
- `source_channel`: direct, organic search, social, referral, or campaign source.
- `utm_campaign`: campaign value from the landing URL.
- `reply_owner`: default `Jason Huang`.
- `is_test`: `yes` only for an explicit test submission; weekly business metrics exclude these rows.
- `reference_links`: Google Drive, Instagram post, Dropbox, product URL, or tech pack link supplied by the buyer.
- `email`: optional business email.
- `service_type` and `page_topic`: distinguish garment and fabric landing-page leads.
- `development_route`, `size_range`, `decoration`, `target_cost`, `destination`, and `delivery_date`: garment brief details when supplied.
- `submittedAt` and `form_started_at`: submission timing used by the anti-spam check.

Recommended status flow:

```text
new_inquiry -> replied -> sample_sent -> quoted -> won
new_inquiry -> replied -> sample_sent -> quoted -> lost
```

Use `next_action_at` as the daily follow-up queue. A row should not stay in `new_inquiry` after the first WhatsApp or email reply.

### Reference Image / Tech Pack Links

Static hosting does not store uploaded files. The website form now accepts a link field for buyer-supplied references, including Google Drive, Dropbox, Instagram posts, product pages, or tech packs. Keep file permissions viewable before quoting.

### Apps Script Deployment Boundary

Updating GitHub Pages does not update the deployed Google Apps Script Web App. After changing `scripts/google_apps_script_lead_webhook.gs`, paste or sync that file into the existing Apps Script project, create a new Web App deployment version, and keep the same production URL in the site configuration. Until that manual deployment is complete, the live Sheet will continue using the previous validation and column logic.

### Weekly Conversion Report

Export the Website Leads Google Sheet as CSV into `data/website_leads_export_YYYY-MM-DD.csv`, then run. Rows with `is_test=yes` are reported separately and excluded from every funnel and quote metric:

```bash
node scripts/weekly_conversion_report.js --crm-csv data/website_leads_export_YYYY-MM-DD.csv --visits 120 --whatsapp-clicks 18
```

Optional date range:

```bash
node scripts/weekly_conversion_report.js --week-start 2026-07-01 --week-end 2026-07-07 --crm-csv data/website_leads_export_2026-07-07.csv
```

If npm is available, the same script is also exposed as `npm run report:weekly-conversion -- ...`.

The report writes to `reports/weekly-conversion-START_to_END.md` and covers:

- Visits.
- Form submissions.
- WhatsApp clicks.
- Sheet rows.
- Replies.
- Sample requests.
- Quotes.

`reports/` and real CRM CSV exports stay outside the deployment repository.

## 5. Verification Checklist

After deployment:

1. Open the live site in an incognito window.
2. Accept analytics consent.
3. Add `?crm_test=1` to the page URL and submit a test sourcing brief.
4. Confirm WhatsApp opens with a prefilled message.
5. Confirm the lead row appears in Google Sheets.
6. Confirm the Sheet row includes `is_test=yes`, `lead_status`, `next_action_at`, `source_channel`, `sample_requested`, `reference_links`, `email`, `service_type`, and `form_started_at`.
7. Confirm GA4 Realtime shows activity.
8. Confirm Meta Events Manager receives `PageView`, `Lead`, and `Contact`.
9. Confirm Search Console verifies the site and the sitemap is submitted.

## Remaining Account Checks

The repository can verify that the correct IDs load and that the three event mappings fire. GA4 Realtime and Meta Events Manager receipt still require access to their account dashboards. Any Apps Script source change must also be copied into the Apps Script project and deployed as a new Web App version.

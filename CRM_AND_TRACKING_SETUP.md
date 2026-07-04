# CRM and Tracking Setup

This project now supports GA4, Search Console, Meta Pixel, and CRM lead capture. Publishing and social automations remain paused unless you explicitly reactivate them.

## 1. Google Analytics 4

Manual step:

1. Open Google Analytics.
2. Create or select the Bingo Textile property.
3. Add a Web data stream for `https://www.bingofabric.com/`.
4. Copy the Measurement ID, such as `G-XXXXXXXXXX`.

Project step:

Edit `config/marketing-config.js`:

```js
ga4MeasurementId: "G-XXXXXXXXXX"
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

Manual step:

1. Open Meta Events Manager.
2. Create or select a Web data source.
3. Copy the Pixel ID.

Project step:

Edit `config/marketing-config.js`:

```js
metaPixelId: "PIXEL_ID"
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
5. Add `CRM_WEBHOOK_TOKEN` with a long random value. Do not commit this value to Git.
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

`scripts/google_apps_script_lead_webhook.gs` checks `crmSubmitToken` before appending to the Sheet. Keep the token in `config/marketing-config.js` and the Apps Script `CRM_WEBHOOK_TOKEN` script property aligned.

When a visitor submits a valid form, the site sends the lead payload to the webhook and still opens WhatsApp.

If the webhook is not configured, the site stores recent lead payloads in browser localStorage as a temporary fallback only.

### Sales Pipeline Fields

The Apps Script keeps the existing lead columns and adds CRM pipeline fields when the Sheet is created or when an older Sheet is used:

- `lead_status`: default `new_inquiry`.
- `next_action_at`: default next calendar day.
- `sample_requested`: `yes` when the visitor requests swatches, lab dips, or sample matching support.
- `quoted_value`: manual quote value for weekly review.
- `source_channel`: direct, organic search, social, referral, or campaign source.
- `utm_campaign`: campaign value from the landing URL.
- `reply_owner`: default `Jason Huang`.
- `reference_links`: Google Drive, Instagram post, Dropbox, product URL, or tech pack link supplied by the buyer.

Recommended status flow:

```text
new_inquiry -> replied -> sample_sent -> quoted -> won
new_inquiry -> replied -> sample_sent -> quoted -> lost
```

Use `next_action_at` as the daily follow-up queue. A row should not stay in `new_inquiry` after the first WhatsApp or email reply.

### Reference Image / Tech Pack Links

Static hosting does not store uploaded files. The website form now accepts a link field for buyer-supplied references, including Google Drive, Dropbox, Instagram posts, product pages, or tech packs. Keep file permissions viewable before quoting.

### Weekly Conversion Report

Export the Website Leads Google Sheet as CSV into `data/website_leads_export_YYYY-MM-DD.csv`, then run:

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
3. Submit a test sourcing brief.
4. Confirm WhatsApp opens with a prefilled message.
5. Confirm the lead row appears in Google Sheets.
6. Confirm the Sheet row includes `lead_status`, `next_action_at`, `source_channel`, `sample_requested`, and `reference_links`.
7. Confirm GA4 Realtime shows activity.
8. Confirm Meta Events Manager receives `PageView`, `Lead`, and `Contact`.
9. Confirm Search Console verifies the site and the sitemap is submitted.

## Manual Values Needed

Send these values back to Codex when ready:

```text
GA4 Measurement ID:
Search Console verification code or DNS status:
Meta Pixel ID:
Google Apps Script Web App URL:
```

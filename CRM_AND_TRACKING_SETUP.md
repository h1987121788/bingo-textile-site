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

## 5. Verification Checklist

After deployment:

1. Open the live site in an incognito window.
2. Accept analytics consent.
3. Submit a test sourcing brief.
4. Confirm WhatsApp opens with a prefilled message.
5. Confirm the lead row appears in Google Sheets.
6. Confirm GA4 Realtime shows activity.
7. Confirm Meta Events Manager receives `PageView`, `Lead`, and `Contact`.
8. Confirm Search Console verifies the site and the sitemap is submitted.

## Manual Values Needed

Send these values back to Codex when ready:

```text
GA4 Measurement ID:
Search Console verification code or DNS status:
Meta Pixel ID:
Google Apps Script Web App URL:
```

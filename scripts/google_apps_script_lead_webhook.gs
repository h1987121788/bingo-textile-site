const SHEET_NAME = 'Website Leads';
const SPREADSHEET_NAME = 'Bingo Textile Website Leads';
const SPREADSHEET_ID_PROPERTY = 'LEAD_SPREADSHEET_ID';
const CRM_WEBHOOK_TOKEN_PROPERTY = 'CRM_WEBHOOK_TOKEN';
const DEFAULT_CRM_WEBHOOK_TOKEN = '';

const CRM_HEADERS = [
  'receivedAt',
  'formName',
  'brand',
  'country',
  'garmentType',
  'reference',
  'reference_links',
  'quantity',
  'timeline',
  'whatsapp',
  'whatsappConsent',
  'message',
  'productInterest',
  'landingUrl',
  'currentUrl',
  'referrer',
  'source_channel',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utm_campaign',
  'utmContent',
  'utmTerm',
  'sourceLabel',
  'lead_status',
  'next_action_at',
  'sample_requested',
  'quoted_value',
  'reply_owner'
];

function doPost(e) {
  const payload = parsePayload_(e);
  if (!isAuthorizedPayload_(payload)) {
    return jsonOutput_({ ok: false, error: 'unauthorized' });
  }

  const crm = getLeadSheet_();
  const now = new Date();
  crm.sheet.appendRow(rowFromPayload_(payload, now, crm.headers));

  return jsonOutput_({ ok: true });
}

function getLeadSheet_() {
  const ss = getLeadSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  return {
    sheet,
    headers: ensureHeaders_(sheet)
  };
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CRM_HEADERS);
    return CRM_HEADERS.slice();
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  const missing = CRM_HEADERS.filter((header) => headers.indexOf(header) === -1);
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }

  return headers.concat(missing);
}

function rowFromPayload_(payload, now, headers) {
  const values = valueMapFromPayload_(payload, now);
  return headers.map((header) => {
    if (Object.prototype.hasOwnProperty.call(values, header)) {
      return values[header];
    }
    return payload[header] || '';
  });
}

function valueMapFromPayload_(payload, now) {
  return {
    receivedAt: now,
    formName: payload.formName || '',
    brand: payload.brand || '',
    country: payload.country || '',
    garmentType: payload.garment_type || payload.garmentType || '',
    reference: payload.reference || '',
    reference_links: payload.reference_links || payload.referenceLinks || '',
    quantity: payload.quantity || '',
    timeline: payload.timeline || '',
    whatsapp: payload.whatsapp || '',
    whatsappConsent: payload.whatsapp_consent || payload.whatsappConsent || '',
    message: payload.message || '',
    productInterest: payload.productInterest || '',
    landingUrl: payload.landingUrl || '',
    currentUrl: payload.currentUrl || '',
    referrer: payload.referrer || '',
    source_channel: payload.source_channel || fallbackSourceChannel_(payload),
    utmSource: payload.utm_source || payload.utmSource || '',
    utmMedium: payload.utm_medium || payload.utmMedium || '',
    utmCampaign: payload.utm_campaign || payload.utmCampaign || '',
    utm_campaign: payload.utm_campaign || payload.utmCampaign || '',
    utmContent: payload.utm_content || payload.utmContent || '',
    utmTerm: payload.utm_term || payload.utmTerm || '',
    sourceLabel: payload.sourceLabel || '',
    lead_status: payload.lead_status || 'new_inquiry',
    next_action_at: payload.next_action_at || defaultNextActionDate_(now),
    sample_requested: normalizeSampleRequested_(payload.sample_requested),
    quoted_value: payload.quoted_value || '',
    reply_owner: payload.reply_owner || 'Jason Huang'
  };
}

function defaultNextActionDate_(now) {
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return Utilities.formatDate(next, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function normalizeSampleRequested_(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return /^(1|true|yes|y|on|sample|samples|swatch|swatches)$/i.test(text) ? 'yes' : String(value);
}

function fallbackSourceChannel_(payload) {
  if (payload.utm_source) return payload.utm_source;
  const referrer = String(payload.referrer || '').trim();
  if (!referrer || referrer === 'Direct / unavailable') return 'direct';
  if (/google|bing|yahoo|duckduckgo|baidu|naver/i.test(referrer)) return 'organic_search';
  if (/instagram|facebook|fb\.com|t\.co|twitter|x\.com|linkedin|pinterest|youtube|tiktok/i.test(referrer)) return 'social';
  return 'referral';
}

function getLeadSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const savedSpreadsheetId = properties.getProperty(SPREADSHEET_ID_PROPERTY);
  if (savedSpreadsheetId) {
    return SpreadsheetApp.openById(savedSpreadsheetId);
  }

  const spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
  properties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  return spreadsheet;
}

function isAuthorizedPayload_(payload) {
  const expectedToken = getExpectedWebhookToken_();
  return Boolean(expectedToken) && payload.crmSubmitToken === expectedToken;
}

function getExpectedWebhookToken_() {
  const properties = PropertiesService.getScriptProperties();
  const savedToken = properties.getProperty(CRM_WEBHOOK_TOKEN_PROPERTY);
  return savedToken || DEFAULT_CRM_WEBHOOK_TOKEN;
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return { raw: e.postData.contents };
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

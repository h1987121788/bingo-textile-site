const SHEET_NAME = 'Website Leads';
const SPREADSHEET_NAME = 'Bingo Textile Website Leads';
const SPREADSHEET_ID_PROPERTY = 'LEAD_SPREADSHEET_ID';
const CRM_WEBHOOK_TOKEN_PROPERTY = 'CRM_WEBHOOK_TOKEN';
const DEFAULT_CRM_WEBHOOK_TOKEN = '';
const MAX_PAYLOAD_CHARS = 24000;
const RATE_LIMIT_SECONDS = 600;
const RATE_LIMIT_MAX = 5;
const MIN_FORM_FILL_MS = 1500;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const SUBMISSION_CACHE_SECONDS = 6 * 60 * 60;

const CRM_HEADERS = [
  'receivedAt',
  'submissionId',
  'submittedAt',
  'form_started_at',
  'formName',
  'service_type',
  'page_topic',
  'brand',
  'country',
  'email',
  'development_route',
  'garmentType',
  'reference',
  'reference_links',
  'quantity',
  'size_range',
  'decoration',
  'target_cost',
  'destination',
  'delivery_date',
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
  'is_test',
  'lead_status',
  'next_action_at',
  'sample_requested',
  'quoted_value',
  'reply_owner'
];

function doPost(e) {
  const payload = parsePayload_(e);
  if (!isAuthorizedPayload_(payload)) {
    return responseOutput_(payload, { ok: false, error: 'unauthorized' });
  }

  const validation = validatePayload_(payload);
  if (!validation.ok) {
    return responseOutput_(payload, { ok: false, error: 'invalid_payload', field: validation.field || '' });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return responseOutput_(payload, { ok: false, error: 'busy' });
  }

  try {
    const crm = getLeadSheet_();
    if (payload.submissionId && isDuplicateSubmission_(payload, crm)) {
      return responseOutput_(payload, { ok: true, duplicate: true });
    }

    if (!consumeRateLimit_(payload)) {
      return responseOutput_(payload, { ok: false, error: 'rate_limited' });
    }

    const now = new Date();
    crm.sheet.appendRow(rowFromPayload_(payload, now, crm.headers));
    if (payload.submissionId) rememberSubmission_(payload);
  } catch (error) {
    return responseOutput_(payload, { ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }

  return responseOutput_(payload, { ok: true });
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
    if (header === 'crmSubmitToken' || header === 'fax_number') {
      return '';
    }
    if (Object.prototype.hasOwnProperty.call(values, header)) {
      return safeSheetValue_(values[header]);
    }
    return safeSheetValue_(Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : '');
  });
}

function valueMapFromPayload_(payload, now) {
  return {
    receivedAt: now,
    submissionId: payload.submissionId || '',
    submittedAt: payload.submittedAt || '',
    form_started_at: payload.form_started_at || '',
    formName: payload.formName || '',
    service_type: payload.service_type || '',
    page_topic: payload.page_topic || '',
    brand: payload.brand || '',
    country: payload.country || '',
    email: payload.email || '',
    development_route: payload.development_route || '',
    garmentType: payload.garment_type || payload.garmentType || '',
    reference: payload.reference || '',
    reference_links: payload.reference_links || payload.referenceLinks || '',
    quantity: payload.quantity || '',
    size_range: payload.size_range || '',
    decoration: payload.decoration || '',
    target_cost: payload.target_cost || '',
    destination: payload.destination || '',
    delivery_date: payload.delivery_date || '',
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
    is_test: normalizeBooleanText_(payload.is_test || payload.isTest),
    lead_status: payload.lead_status || 'new_inquiry',
    next_action_at: payload.next_action_at || defaultNextActionDate_(now),
    sample_requested: normalizeSampleRequested_(payload.sample_requested),
    quoted_value: payload.quoted_value || '',
    reply_owner: payload.reply_owner || 'Jason Huang'
  };
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, field: 'payload' };
  }

  let serialized = '';
  try {
    serialized = JSON.stringify(payload);
  } catch (error) {
    return { ok: false, field: 'payload' };
  }

  if (serialized.length > MAX_PAYLOAD_CHARS) {
    return { ok: false, field: 'payload_size' };
  }

  if (textValue_(payload.fax_number)) {
    return { ok: false, field: 'fax_number' };
  }

  const fieldLimits = {
    brand: 160,
    country: 100,
    email: 254,
    garment_type: 200,
    garmentType: 200,
    reference: 500,
    reference_links: 1000,
    referenceLinks: 1000,
    quantity: 160,
    size_range: 160,
    decoration: 500,
    target_cost: 160,
    destination: 200,
    whatsapp: 40,
    message: 3000
  };

  const limitedFields = Object.keys(fieldLimits);
  for (let index = 0; index < limitedFields.length; index += 1) {
    const field = limitedFields[index];
    const value = payload[field];
    if (value !== undefined && value !== null && typeof value === 'object') {
      return { ok: false, field };
    }
    if (textValue_(value).length > fieldLimits[field]) {
      return { ok: false, field };
    }
  }

  const requiredFields = ['brand', 'country', 'reference', 'quantity', 'whatsapp'];
  for (let index = 0; index < requiredFields.length; index += 1) {
    const field = requiredFields[index];
    if (!textValue_(payload[field])) {
      return { ok: false, field };
    }
  }

  const submissionId = textValue_(payload.submissionId);
  if (submissionId && !/^[a-zA-Z0-9_-]{16,80}$/.test(submissionId)) {
    return { ok: false, field: 'submissionId' };
  }

  if (payload.responseMode && textValue_(payload.responseMode) !== 'iframe') {
    return { ok: false, field: 'responseMode' };
  }
  if (textValue_(payload.responseMode) === 'iframe' && !submissionId) {
    return { ok: false, field: 'submissionId' };
  }

  const serviceType = textValue_(payload.service_type);
  const isGarmentLead = /garment|private label/i.test(serviceType) || Boolean(textValue_(payload.garment_type || payload.garmentType));
  if (isGarmentLead && !textValue_(payload.garment_type || payload.garmentType)) {
    return { ok: false, field: 'garment_type' };
  }

  if (!/^(yes|true|1|on)$/i.test(textValue_(payload.whatsapp_consent || payload.whatsappConsent))) {
    return { ok: false, field: 'whatsapp_consent' };
  }

  const email = textValue_(payload.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, field: 'email' };
  }

  const whatsappDigits = textValue_(payload.whatsapp).replace(/\D/g, '');
  if (whatsappDigits.length < 7 || whatsappDigits.length > 18) {
    return { ok: false, field: 'whatsapp' };
  }

  const startedAt = Date.parse(textValue_(payload.form_started_at));
  const submittedAt = Date.parse(textValue_(payload.submittedAt));
  const fillTime = submittedAt - startedAt;
  if (!Number.isFinite(startedAt) || !Number.isFinite(submittedAt) || fillTime < MIN_FORM_FILL_MS || fillTime > MAX_FORM_AGE_MS) {
    return { ok: false, field: 'form_timing' };
  }

  return { ok: true };
}

function consumeRateLimit_(payload) {
  const identity = [payload.whatsapp, payload.email, payload.brand, payload.country]
    .map((value) => textValue_(value).toLowerCase())
    .join('|');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity, Utilities.Charset.UTF_8);
  const key = 'lead_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '').slice(0, 32);
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || 0);

  if (current >= RATE_LIMIT_MAX) {
    return false;
  }

  cache.put(key, String(current + 1), RATE_LIMIT_SECONDS);
  return true;
}

function submissionCacheKey_(payload) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    textValue_(payload.submissionId),
    Utilities.Charset.UTF_8
  );
  return 'submission_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '').slice(0, 40);
}

function isDuplicateSubmission_(payload, crm) {
  if (CacheService.getScriptCache().get(submissionCacheKey_(payload)) === 'accepted') {
    return true;
  }

  if (!crm || !crm.sheet || !Array.isArray(crm.headers)) return false;
  const columnIndex = crm.headers.indexOf('submissionId');
  const lastRow = crm.sheet.getLastRow();
  if (columnIndex < 0 || lastRow < 2) return false;

  const match = crm.sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(textValue_(payload.submissionId))
    .matchEntireCell(true)
    .findNext();
  return Boolean(match);
}

function rememberSubmission_(payload) {
  try {
    CacheService.getScriptCache().put(submissionCacheKey_(payload), 'accepted', SUBMISSION_CACHE_SECONDS);
  } catch (error) {
    // The Sheet submissionId column remains the durable idempotency check.
  }
}

function textValue_(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function safeSheetValue_(value) {
  if (value instanceof Date) return value;
  const text = textValue_(value).slice(0, 5000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
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

function normalizeBooleanText_(value) {
  return /^(1|true|yes|y|on)$/i.test(textValue_(value)) ? 'yes' : 'no';
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
  if (e && e.parameter && e.parameter.payload) {
    try {
      return JSON.parse(e.parameter.payload);
    } catch (error) {
      return { raw: e.parameter.payload };
    }
  }

  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return { raw: e.postData.contents };
  }
}

function responseOutput_(requestPayload, responsePayload) {
  const payload = {
    type: 'bingo-crm-result',
    submissionId: textValue_(requestPayload && requestPayload.submissionId),
    ...responsePayload
  };

  if (requestPayload && requestPayload.responseMode === 'iframe') {
    return iframeOutput_(payload);
  }

  return jsonOutput_(payload);
}

function iframeOutput_(payload) {
  const safePayload = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const html = '<!doctype html><meta charset="utf-8"><script>' +
    'window.top.postMessage(' + safePayload + ', "*");' +
    '</script>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

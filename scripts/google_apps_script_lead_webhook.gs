const SHEET_NAME = 'Website Leads';
const SPREADSHEET_NAME = 'Bingo Textile Website Leads';
const SPREADSHEET_ID_PROPERTY = 'LEAD_SPREADSHEET_ID';
const CRM_WEBHOOK_TOKEN_PROPERTY = 'CRM_WEBHOOK_TOKEN';
const DEFAULT_CRM_WEBHOOK_TOKEN = '';

function doPost(e) {
  const payload = parsePayload_(e);
  if (!isAuthorizedPayload_(payload)) {
    return jsonOutput_({ ok: false, error: 'unauthorized' });
  }

  const sheet = getLeadSheet_();
  const now = new Date();
  const values = [
    now,
    payload.formName || '',
    payload.brand || '',
    payload.country || '',
    payload.garment_type || '',
    payload.reference || '',
    payload.quantity || '',
    payload.timeline || '',
    payload.whatsapp || '',
    payload.whatsapp_consent || '',
    payload.message || '',
    payload.productInterest || '',
    payload.landingUrl || '',
    payload.currentUrl || '',
    payload.referrer || '',
    payload.utm_source || '',
    payload.utm_medium || '',
    payload.utm_campaign || '',
    payload.utm_content || '',
    payload.utm_term || '',
    payload.sourceLabel || ''
  ];

  sheet.appendRow(values);

  return jsonOutput_({ ok: true });
}

function getLeadSheet_() {
  const ss = getLeadSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'receivedAt',
      'formName',
      'brand',
      'country',
      'garmentType',
      'reference',
      'quantity',
      'timeline',
      'whatsapp',
      'whatsappConsent',
      'message',
      'productInterest',
      'landingUrl',
      'currentUrl',
      'referrer',
      'utmSource',
      'utmMedium',
      'utmCampaign',
      'utmContent',
      'utmTerm',
      'sourceLabel'
    ]);
  }

  return sheet;
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

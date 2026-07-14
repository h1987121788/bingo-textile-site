const body = document.body;
const isPreviewMode = body?.dataset.previewMode === "true";
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const filterButtons = document.querySelectorAll("[data-filter]");
const productGrid = document.querySelector("[data-product-grid]");
const leadForms = document.querySelectorAll("[data-lead-form]");
const salesWhatsApp = "8613827719946";
const salesEmail = "57317996@qq.com";
const minimumFormFillMs = 1800;
const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const catalogProducts = Array.isArray(window.bingoProductCatalog) ? window.bingoProductCatalog : [];
const marketingConfig = window.bingoMarketingConfig || {};
let productCards = document.querySelectorAll("[data-category]");
let productInterestLinks = document.querySelectorAll("[data-product-interest]");

const safeSessionSet = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Tracking is helpful but not required for the form flow.
  }
};

const safeSessionGet = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return "";
  }
};

const safeLocalAppend = (key, value, limit = 30) => {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift(value);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, limit)));
  } catch {
    // CRM fallback is best-effort only.
  }
};

const isConfiguredValue = (value) => {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && ![
    "PASTE_WEBHOOK_URL",
    "WEBHOOK_URL",
    "SAME_TOKEN_AS_APPS_SCRIPT",
    "CRM_WEBHOOK_TOKEN"
  ].includes(normalized);
};

const isoDateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sourceChannelFromReferrer = (params) => {
  if (params.get("utm_source")) {
    return params.get("utm_source");
  }

  const referrer = safeSessionGet("initialReferrer") || document.referrer || "";
  if (!referrer) {
    return "direct";
  }

  let hostname = "";
  try {
    hostname = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "referral";
  }

  if (/google|bing|yahoo|duckduckgo|baidu|naver/.test(hostname)) return "organic_search";
  if (/instagram|facebook|fb\.com|t\.co|twitter|x\.com|linkedin|pinterest|youtube|tiktok/.test(hostname)) return "social";
  return "referral";
};

const trackMarketingEvent = (eventName, params = {}) => {
  if (typeof window.bingoTrackEvent === "function") {
    window.bingoTrackEvent(eventName, {
      event_source: "website",
      ...params
    });
  }
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });

const categoryNotes = {
  "single-jersey": "Soft jersey direction for T-shirts, fitted tops and summer knit programs.",
  sweatshirt: "Stable sweatshirt fabric direction for casual sets, hoodies and daily outer tops.",
  "double-knit": "Structured double-knit option for cleaner silhouettes and streetwear weight.",
  terry: "Loop-back terry direction for hoodies, joggers and premium casual sets.",
  "brushed-fleece": "Brushed fleece direction for warm winter streetwear and soft hand feel."
};

const renderProductCatalog = () => {
  if (!productGrid || catalogProducts.length === 0) {
    return;
  }

  productGrid.innerHTML = catalogProducts
    .map((product) => {
      const productInterest = `${product.code} ${product.name}`;
      const productSummary = `${categoryNotes[product.category] || "Knit fabric option for custom development"} Reference use: ${product.application}.`;

      return `
        <article class="product-card catalog-card" data-category="${escapeHtml(product.category)}" data-product-code="${escapeHtml(product.code)}">
          <figure class="product-media">
            <img
              class="product-photo"
              src="${escapeHtml(product.image)}"
              alt="${escapeHtml(`${product.code} ${product.name} knit fabric`)}"
              loading="lazy"
            />
            <figcaption>
              <span>${escapeHtml(product.code)}</span>
              ${escapeHtml(product.series)} / ${escapeHtml(product.gsm)}
            </figcaption>
          </figure>
          <div class="card-body">
            <p class="tag">${escapeHtml(product.series)}</p>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(productSummary)}</p>
            <dl class="product-specs">
              <div>
                <dt>Comp.</dt>
                <dd>${escapeHtml(product.composition)}</dd>
              </div>
              <div>
                <dt>GSM</dt>
                <dd>${escapeHtml(product.gsm)}</dd>
              </div>
              <div>
                <dt>Width</dt>
                <dd>${escapeHtml(product.width)}</dd>
              </div>
              <div>
                <dt>Season</dt>
                <dd>${escapeHtml(product.season)}</dd>
              </div>
              <div>
                <dt>Use</dt>
                <dd>${escapeHtml(product.application)}</dd>
              </div>
            </dl>
            <a href="#contact" data-product-interest="${escapeHtml(productInterest)}">Ask for matching sample</a>
          </div>
        </article>
      `;
    })
    .join("");

  productCards = document.querySelectorAll("[data-category]");
  productInterestLinks = document.querySelectorAll("[data-product-interest]");
};

renderProductCatalog();

if (!safeSessionGet("landingUrl")) {
  safeSessionSet("landingUrl", window.location.href);
}

if (document.referrer && !safeSessionGet("initialReferrer")) {
  safeSessionSet("initialReferrer", document.referrer);
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    productCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

productInterestLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const productInterest = link.dataset.productInterest || link.textContent.trim();
    safeSessionSet("productInterest", productInterest);
    trackMarketingEvent("product_interest", {
      product_interest: productInterest
    });
  });
});

const getFieldValue = (field) => {
  if (field.type === "checkbox") {
    return field.checked ? "Yes" : "";
  }

  return String(field.value).trim();
};

const getFieldLabel = (field) =>
  field.dataset.label || field.closest("label")?.querySelector("span")?.textContent?.trim() || field.name;

const getTrackingPayload = (form) => {
  const params = new URLSearchParams(window.location.search);
  const payload = {
    formName: form.dataset.formName || "Website lead form",
    landingUrl: safeSessionGet("landingUrl") || window.location.href,
    currentUrl: window.location.href,
    referrer: safeSessionGet("initialReferrer") || document.referrer || "Direct / unavailable",
    productInterest: safeSessionGet("productInterest") || "Not selected",
    source_channel: sourceChannelFromReferrer(params),
    sourceLabel: marketingConfig.sourceLabel || "Bingo Textile website"
  };

  trackingKeys.forEach((key) => {
    if (params.get(key)) {
      payload[key] = params.get(key);
    }
  });

  return payload;
};

const getTrackingLines = (form) => {
  const payload = getTrackingPayload(form);
  return [
    `Form: ${payload.formName}`,
    `Landing page: ${payload.landingUrl}`,
    `Current page: ${payload.currentUrl}`,
    `Referrer: ${payload.referrer}`,
    `Source channel: ${payload.source_channel}`,
    `Product button source: ${payload.productInterest}`,
    ...trackingKeys.filter((key) => payload[key]).map((key) => `${key}: ${payload[key]}`)
  ];
};

const getLeadPayload = (form, fields) => {
  const fieldPayload = {};
  fields.forEach((field) => {
    fieldPayload[field.name] = getFieldValue(field);
  });

  const serviceType = String(fieldPayload.service_type || "");
  const isGarmentLead = /garment|private label/i.test(serviceType);
  const startedAt = new Date(Number(form.dataset.startedAt || 0));
  const formStartedAt = Number.isNaN(startedAt.getTime()) ? "" : startedAt.toISOString();

  const payload = {
    submittedAt: new Date().toISOString(),
    form_started_at: formStartedAt,
    lead_status: isGarmentLead ? "new_garment_lead" : "new_fabric_lead",
    next_action_at: isoDateAfterDays(1),
    quoted_value: "",
    reply_owner: "Jason Huang",
    ...fieldPayload,
    ...getTrackingPayload(form)
  };

  if (isConfiguredValue(marketingConfig.crmSubmitToken)) {
    payload.crmSubmitToken = marketingConfig.crmSubmitToken;
  }

  return payload;
};

const submitLeadToCrm = (payload) => {
  const localPayload = { ...payload };
  delete localPayload.crmSubmitToken;

  if (isPreviewMode || !isConfiguredValue(marketingConfig.crmWebhookUrl)) {
    safeLocalAppend("bingoWebsiteLeadDrafts", localPayload, 5);
    return;
  }

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });

  if (navigator.sendBeacon && navigator.sendBeacon(marketingConfig.crmWebhookUrl, blob)) {
    return;
  }

  fetch(marketingConfig.crmWebhookUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8"
    },
    body
  }).catch(() => {
    // WhatsApp remains the visible fallback if the background CRM request fails.
  });
};

leadForms.forEach((form) => {
  form.dataset.startedAt = String(Date.now());

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = form.querySelector("[data-form-message]");
    const honeypot = form.querySelector('[name="fax_number"]');

    if (honeypot?.value.trim()) {
      message.textContent = "The form could not be submitted. Please refresh the page and try again.";
      message.style.color = "#b66a7d";
      form.reset();
      form.dataset.startedAt = String(Date.now());
      return;
    }

    const elapsedMs = Date.now() - Number(form.dataset.startedAt || 0);
    if (!Number.isFinite(elapsedMs) || elapsedMs < minimumFormFillMs) {
      message.textContent = "Please review your details, then submit the form again.";
      message.style.color = "#b66a7d";
      return;
    }

    const fields = [...form.querySelectorAll("input[name], select[name], textarea[name]")]
      .filter((field) => field.name !== "fax_number");
    const requiredFields = fields.filter((field) => field.required);
    const isComplete = requiredFields.every((field) => getFieldValue(field).length > 0);

    if (!isComplete || !form.checkValidity()) {
      message.textContent = "Please check the required fields and input formats.";
      message.style.color = "#b66a7d";
      form.reportValidity?.();
      return;
    }

    const leadLines = fields
      .map((field) => [getFieldLabel(field), getFieldValue(field)])
      .filter(([, value]) => value.length > 0)
      .map(([label, value]) => `${label}: ${value}`);
    const serviceType = form.querySelector('[name="service_type"]')?.value || "";
    const isGarmentLead = /garment|private label/i.test(serviceType);
    const subject = isGarmentLead
      ? "Private label garment development brief from Bingo Garments website"
      : form.classList.contains("quote-form")
        ? "Streetwear fabric sourcing intake from Bingo Textile website"
        : "Fabric sourcing brief from Bingo Textile website";
    const leadPayload = getLeadPayload(form, fields);
    const inquiryText = [
      subject,
      "",
      ...leadLines,
      "",
      "Lead source",
      ...getTrackingLines(form),
      "",
      "Source: https://www.bingofabric.com/"
    ].join("\n");
    const whatsappUrl = `https://wa.me/${salesWhatsApp}?text=${encodeURIComponent(inquiryText)}`;
    const emailUrl = `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryText)}`;

    submitLeadToCrm(leadPayload);
    trackMarketingEvent("generate_lead", {
      form_name: leadPayload.formName,
      garment_type: leadPayload.garment_type || "",
      country: leadPayload.country || "",
      timeline: leadPayload.timeline || "",
      development_route: leadPayload.development_route || "",
      destination: leadPayload.destination || "",
      product_interest: leadPayload.productInterest || "",
      source_channel: leadPayload.source_channel || "",
      sample_requested: leadPayload.sample_requested || ""
    });

    if (isPreviewMode) {
      message.textContent = "Local preview: the test brief was saved in this browser only. Nothing was sent externally.";
      message.style.color = "#3f8f7c";
      form.reset();
      form.dataset.startedAt = String(Date.now());
      return;
    }

    message.textContent = "Submitting your brief and opening WhatsApp. If it does not open, ";
    const fallbackLink = document.createElement("a");
    fallbackLink.href = emailUrl;
    fallbackLink.textContent = "email this inquiry instead";
    message.appendChild(fallbackLink);
    message.append(".");
    message.style.color = "#3f8f7c";

    window.open(whatsappUrl, "_blank", "noopener");
    form.reset();
    form.dataset.startedAt = String(Date.now());
  });
});

document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
  link.addEventListener("click", () => {
    trackMarketingEvent("contact_whatsapp", {
      link_url: link.href,
      link_text: link.textContent.trim()
    });
  });
});

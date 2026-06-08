const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const filterButtons = document.querySelectorAll("[data-filter]");
const productCards = document.querySelectorAll("[data-category]");
const leadForms = document.querySelectorAll("[data-lead-form]");
const productInterestLinks = document.querySelectorAll("[data-product-interest]");
const salesWhatsApp = "8613827719946";
const salesEmail = "57317996@qq.com";
const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

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
    safeSessionSet("productInterest", link.dataset.productInterest || link.textContent.trim());
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

const getTrackingLines = (form) => {
  const params = new URLSearchParams(window.location.search);
  const utmLines = trackingKeys
    .filter((key) => params.get(key))
    .map((key) => `${key}: ${params.get(key)}`);

  return [
    `Form: ${form.dataset.formName || "Website lead form"}`,
    `Landing page: ${safeSessionGet("landingUrl") || window.location.href}`,
    `Current page: ${window.location.href}`,
    `Referrer: ${safeSessionGet("initialReferrer") || document.referrer || "Direct / unavailable"}`,
    `Product button source: ${safeSessionGet("productInterest") || "Not selected"}`,
    ...utmLines
  ];
};

leadForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = form.querySelector("[data-form-message]");
    const fields = [...form.querySelectorAll("input[name], select[name], textarea[name]")];
    const requiredFields = fields.filter((field) => field.required);
    const isComplete = requiredFields.every((field) => getFieldValue(field).length > 0);

    if (!isComplete) {
      message.textContent = "Please complete the required fields first.";
      message.style.color = "#b66a7d";
      form.reportValidity?.();
      return;
    }

    const leadLines = fields
      .map((field) => [getFieldLabel(field), getFieldValue(field)])
      .filter(([, value]) => value.length > 0)
      .map(([label, value]) => `${label}: ${value}`);
    const subject = form.classList.contains("quote-form")
      ? "Streetwear fabric sourcing intake from Bingo Textile website"
      : "Fabric sourcing brief from Bingo Textile website";
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

    message.textContent = "Opening WhatsApp with your inquiry. If it does not open, ";
    const fallbackLink = document.createElement("a");
    fallbackLink.href = emailUrl;
    fallbackLink.textContent = "email this inquiry instead";
    message.appendChild(fallbackLink);
    message.append(".");
    message.style.color = "#3f8f7c";

    window.open(whatsappUrl, "_blank", "noopener");
    form.reset();
  });
});

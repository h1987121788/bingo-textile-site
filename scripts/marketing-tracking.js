(function () {
  const config = window.bingoMarketingConfig || {};
  const placeholderValues = new Set(["", "G-XXXXXXXXXX", "PIXEL_ID", "PASTE_WEBHOOK_URL"]);
  const consentKey = "bingoMarketingConsent";
  let initialized = false;
  const queuedEvents = [];

  const hasValue = (value) => typeof value === "string" && !placeholderValues.has(value.trim());
  const trackingEnabled = hasValue(config.ga4MeasurementId) || hasValue(config.metaPixelId);
  const consentRequired = config.requireMarketingConsent !== false;

  const loadScript = (src, attrs = {}) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    document.head.appendChild(script);
  };

  const initGa4 = () => {
    if (!hasValue(config.ga4MeasurementId)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", config.ga4MeasurementId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4MeasurementId)}`);
  };

  const initMetaPixel = () => {
    if (!hasValue(config.metaPixelId)) {
      return;
    }

    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq("init", config.metaPixelId);
    window.fbq("track", "PageView");
  };

  const dispatchEvent = (eventName, params = {}) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }

    if (typeof window.fbq === "function") {
      const metaEventMap = {
        generate_lead: "Lead",
        contact_whatsapp: "Contact",
        product_interest: "ViewContent"
      };
      const metaEventName = metaEventMap[eventName];
      if (metaEventName) {
        window.fbq("track", metaEventName, params);
      } else {
        window.fbq("trackCustom", eventName, params);
      }
    }
  };

  const flushEvents = () => {
    while (queuedEvents.length > 0) {
      const [eventName, params] = queuedEvents.shift();
      dispatchEvent(eventName, params);
    }
  };

  const initializeTracking = () => {
    if (initialized || !trackingEnabled) {
      return;
    }

    initialized = true;
    initGa4();
    initMetaPixel();
    flushEvents();
  };

  const createConsentBanner = () => {
    if (!trackingEnabled || document.querySelector("[data-marketing-consent]")) {
      return;
    }

    const banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.dataset.marketingConsent = "true";
    banner.innerHTML = `
      <p>We use analytics to understand which garment-development channels bring useful inquiries.</p>
      <div>
        <button type="button" class="button secondary" data-consent-choice="reject">Reject</button>
        <button type="button" class="button primary" data-consent-choice="accept">Accept</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-consent-choice]")?.dataset.consentChoice;
      if (!choice) {
        return;
      }

      try {
        localStorage.setItem(consentKey, choice);
      } catch {
        // Consent remains session-only if localStorage is blocked.
      }

      banner.remove();
      if (choice === "accept") {
        initializeTracking();
      }
    });
  };

  window.bingoTrackEvent = (eventName, params = {}) => {
    if (!trackingEnabled) {
      return;
    }

    if (!initialized) {
      queuedEvents.push([eventName, params]);
      return;
    }

    dispatchEvent(eventName, params);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!trackingEnabled) {
      return;
    }

    let storedConsent = "";
    try {
      storedConsent = localStorage.getItem(consentKey) || "";
    } catch {
      storedConsent = "";
    }

    if (!consentRequired || storedConsent === "accept") {
      initializeTracking();
      return;
    }

    if (storedConsent !== "reject") {
      createConsentBanner();
    }
  });
})();

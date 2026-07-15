const garmentCatalog = Array.isArray(window.bingoGarmentCatalog) ? window.bingoGarmentCatalog : [];
const garmentPricing = window.bingoGarmentPricing || {};
const garmentReviewRegistry = window.bingoGarmentReviewStatus || {
  defaultReview: {},
  products: {}
};
const garmentLaunchCodes = new Set(
  Array.isArray(window.bingoGarmentLaunchCodes) ? window.bingoGarmentLaunchCodes : []
);

const escapeGarmentHtml = (value) =>
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

const getGarmentReview = (product) => ({
  ...(garmentReviewRegistry.defaultReview || {}),
  ...((garmentReviewRegistry.products || {})[product.code] || {})
});

const hasVerifiedSpecifications = (review) =>
  review.supplierSpecification === "verified" && review.physicalSample === "verified";

const getPublicGarmentName = (product, review) => {
  if (hasVerifiedSpecifications(review)) return product.name;

  const withoutUnverifiedWeight = String(product.name || "")
    .replace(/\b\d{2,4}\s*gsm\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return withoutUnverifiedWeight || "Streetwear style reference";
};

const renderGarmentPrice = (product, review) => {
  if (review.commercialPrice !== "verified") {
    return `
      <div class="garment-price-block is-unverified" data-commercial-status="quote-required">
        <span>Current quote required</span>
        <p><strong>Request verified price</strong></p>
        <em>Confirmed against the current supplier quote, MOQ, customization and destination.</em>
      </div>
    `;
  }

  const priceCny = Number(product.priceCny);
  const cnyPerUsd = Number(garmentPricing.cnyPerUsd);
  const decimalPlaces = Number.isInteger(garmentPricing.decimalPlaces)
    ? garmentPricing.decimalPlaces
    : 2;

  if (!Number.isFinite(priceCny) || !Number.isFinite(cnyPerUsd) || cnyPerUsd <= 0) return "";

  const priceUsd = priceCny / cnyPerUsd;
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(priceUsd);

  return `
    <div class="garment-price-block">
      <span>USD settlement price</span>
      <p>
        <strong>${escapeGarmentHtml(formattedPrice)}</strong>
        <small>/ ${escapeGarmentHtml(product.unit || "piece")}</small>
      </p>
      <em>Fixed conversion: USD 1 = CNY ${escapeGarmentHtml(cnyPerUsd)}. Customization, freight, duties and taxes are separate.</em>
    </div>
  `;
};

const getGarmentDetailImage = (product) =>
  `./assets/garments/details/${String(product.code || "").toLowerCase()}-detail.webp`;

const renderGarmentCard = (product, contactTarget) => {
  const review = getGarmentReview(product);
  const verifiedSpecifications = hasVerifiedSpecifications(review);
  const publicName = getPublicGarmentName(product, review);
  const detailImage = getGarmentDetailImage(product);
  const publicComposition = verifiedSpecifications ? product.composition : "To confirm by physical sample";
  const publicGsm = verifiedSpecifications ? product.gsm : "To confirm by physical sample";
  const publicSizes = verifiedSpecifications ? product.sizes : "To confirm before quotation";

  return `
  <article class="product-card garment-card" data-category="${escapeGarmentHtml(product.category)}" data-product-code="${escapeGarmentHtml(product.code)}">
    <figure class="product-media garment-media" data-garment-media>
      ${product.image
        ? `<img
            class="product-photo garment-photo"
            src="${escapeGarmentHtml(product.image)}"
            alt="Unbranded style reference for ${escapeGarmentHtml(publicName)}"
            data-primary-src="${escapeGarmentHtml(product.image)}"
            data-primary-alt="Unbranded style reference for ${escapeGarmentHtml(publicName)}"
            ${verifiedSpecifications ? `data-detail-src="${escapeGarmentHtml(detailImage)}" data-detail-alt="Verified detail board for ${escapeGarmentHtml(publicName)}"` : ""}
            loading="lazy"
            decoding="async"
          />`
        : `<div
            class="garment-placeholder garment-placeholder--${escapeGarmentHtml(product.tone)}"
            data-visual="${escapeGarmentHtml(product.visual)}"
            role="img"
            aria-label="Style reference pending for ${escapeGarmentHtml(product.name)}"
          >
            <span class="garment-shape" aria-hidden="true"></span>
            <small>Style reference pending</small>
          </div>`}
      ${verifiedSpecifications
        ? `<div class="garment-image-switch" role="group" aria-label="Image view for ${escapeGarmentHtml(publicName)}">
            <button class="active" type="button" data-garment-view="product" aria-pressed="true">Product</button>
            <button type="button" data-garment-view="details" aria-pressed="false">Details</button>
          </div>`
        : `<div class="garment-image-status">AI style reference</div>`}
      <figcaption>
        <span data-garment-caption>${escapeGarmentHtml(product.code)} / Style reference</span>
        ${escapeGarmentHtml(product.categoryLabel)} / ${verifiedSpecifications ? escapeGarmentHtml(product.gsm) : "Specifications pending"}
      </figcaption>
    </figure>
    <div class="card-body">
      <div class="garment-card-heading">
        <p class="tag">${escapeGarmentHtml(product.categoryLabel)}</p>
        <span class="sample-gate">Sample first</span>
      </div>
      <h3>${escapeGarmentHtml(publicName)}</h3>
      <p>${escapeGarmentHtml(product.description)}</p>
      ${renderGarmentPrice(product, review)}
      <dl class="product-specs garment-specs">
        <div><dt>Fabric</dt><dd>${escapeGarmentHtml(publicComposition)}</dd></div>
        <div><dt>Weight</dt><dd>${escapeGarmentHtml(publicGsm)}</dd></div>
        <div><dt>Fit</dt><dd>${escapeGarmentHtml(product.fit)}</dd></div>
        <div><dt>Sizes</dt><dd>${escapeGarmentHtml(publicSizes)}</dd></div>
        <div><dt>Season</dt><dd>${escapeGarmentHtml(product.season)}</dd></div>
      </dl>
      <p class="verification-note">${verifiedSpecifications
        ? "Verified specifications still require current stock, color, quantity and order confirmation."
        : "Supplier specifications, physical sample, stock and order terms are not yet verified."}</p>
      <div class="garment-card-actions">
        ${verifiedSpecifications
          ? `<a href="${escapeGarmentHtml(detailImage)}" target="_blank" rel="noopener">Open verified details</a>`
          : `<span>Technical details pending sample review</span>`}
        <a
          href="${escapeGarmentHtml(contactTarget)}"
          data-product-interest="${escapeGarmentHtml(`${product.code} ${publicName}`)}"
        >Ask about this style</a>
      </div>
    </div>
  </article>
`;
};

document.querySelectorAll("[data-garment-grid]").forEach((garmentGrid) => {
  const launchOnly = garmentGrid.dataset.launchOnly === "true";
  const contactTarget = garmentGrid.dataset.contactTarget || "#garment-contact";
  const products = launchOnly
    ? garmentCatalog.filter((product) => garmentLaunchCodes.has(product.code))
    : garmentCatalog;

  garmentGrid.innerHTML = products
    .map((product) => renderGarmentCard(product, contactTarget))
    .join("");
});

document.querySelectorAll("[data-product-interest]").forEach((link) => {
  link.addEventListener("click", () => {
    const targetSelector = link.getAttribute("href");
    const targetSection = targetSelector?.startsWith("#")
      ? document.querySelector(targetSelector)
      : null;
    const referenceField = targetSection?.querySelector('[name="reference"]');

    if (referenceField) {
      referenceField.value = link.dataset.productInterest || "";
    }
  });
});

document.querySelectorAll("[data-garment-media]").forEach((media) => {
  const image = media.querySelector("[data-primary-src]");
  const caption = media.querySelector("[data-garment-caption]");
  const buttons = media.querySelectorAll("[data-garment-view]");
  if (!image || !image.dataset.detailSrc) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const showDetails = button.dataset.garmentView === "details";
      image.src = showDetails ? image.dataset.detailSrc : image.dataset.primarySrc;
      image.alt = showDetails ? image.dataset.detailAlt : image.dataset.primaryAlt;

      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      if (caption) {
        const code = caption.textContent.split("/")[0].trim();
        caption.textContent = `${code} / ${showDetails ? "English details" : "Style reference"}`;
      }
    });
  });
});

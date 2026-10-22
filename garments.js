const garmentCatalog = Array.isArray(window.bingoGarmentCatalog) ? window.bingoGarmentCatalog : [];
const garmentReviewRegistry = window.bingoGarmentReviewStatus || {
  defaultReview: {},
  products: {}
};
const garmentLaunchCodes = Array.isArray(window.bingoGarmentLaunchCodes)
  ? window.bingoGarmentLaunchCodes
  : [];

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
  return withoutUnverifiedWeight || "Streetwear sample garment";
};

const renderGarmentPrice = () => {
  return `
    <div class="garment-price-block is-unverified" data-commercial-status="quote-required">
      <span>Pricing</span>
      <p><strong>Request current quotation</strong></p>
      <em>Quoted privately after quantity, customization, destination and timing are confirmed.</em>
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
  const approvedSamplePhoto = review.publicImage === "approved_sample_photo";
  const imageDescription = approvedSamplePhoto
    ? `Finished sample photo of ${publicName}`
    : `Standardized catalog visual for finished sample garment style: ${publicName}`;
  const publicComposition = verifiedSpecifications ? product.composition : "To confirm by physical sample";
  const publicGsm = verifiedSpecifications ? product.gsm : "To confirm by physical sample";
  const publicSizes = verifiedSpecifications ? product.sizes : "To confirm before quotation";

  return `
  <article class="product-card garment-card${product.detailPage ? " garment-card--flagship" : ""}" data-category="${escapeGarmentHtml(product.category)}" data-product-code="${escapeGarmentHtml(product.code)}">
    <figure class="product-media garment-media" data-garment-media>
      ${product.image
        ? `<img
            class="product-photo garment-photo"
            src="${escapeGarmentHtml(product.image)}"
            alt="${escapeGarmentHtml(imageDescription)}"
            data-primary-src="${escapeGarmentHtml(product.image)}"
            data-primary-alt="${escapeGarmentHtml(imageDescription)}"
            ${verifiedSpecifications ? `data-detail-src="${escapeGarmentHtml(detailImage)}" data-detail-alt="Verified detail board for ${escapeGarmentHtml(publicName)}"` : ""}
            loading="lazy"
            decoding="async"
          />`
        : `<div
            class="garment-placeholder garment-placeholder--${escapeGarmentHtml(product.tone)}"
            data-visual="${escapeGarmentHtml(product.visual)}"
            role="img"
            aria-label="Product image pending for ${escapeGarmentHtml(product.name)}"
          >
            <span class="garment-shape" aria-hidden="true"></span>
            <small>Product image pending</small>
          </div>`}
      ${verifiedSpecifications
        ? `<div class="garment-image-switch" role="group" aria-label="Image view for ${escapeGarmentHtml(publicName)}">
            <button class="active" type="button" data-garment-view="product" aria-pressed="true">Product</button>
            <button type="button" data-garment-view="details" aria-pressed="false">Details</button>
          </div>`
        : ""}
      <figcaption>
        <span data-garment-caption>${escapeGarmentHtml(product.code)} / Finished sample</span>
        ${escapeGarmentHtml(product.categoryLabel)} / ${verifiedSpecifications ? escapeGarmentHtml(product.gsm) : "Specifications pending"}
      </figcaption>
    </figure>
    <div class="card-body">
      <div class="garment-card-heading">
        <p class="tag">${escapeGarmentHtml(product.categoryLabel)}</p>
        <span class="sample-gate${product.detailPage ? " is-flagship" : ""}">${product.detailPage ? "Flagship" : "Sample first"}</span>
      </div>
      <h3>${escapeGarmentHtml(publicName)}</h3>
      <p>${escapeGarmentHtml(product.description)}</p>
      ${renderGarmentPrice()}
      <dl class="product-specs garment-specs">
        <div><dt>Fabric</dt><dd>${escapeGarmentHtml(publicComposition)}</dd></div>
        <div><dt>Weight</dt><dd>${escapeGarmentHtml(publicGsm)}</dd></div>
        <div><dt>Fit</dt><dd>${escapeGarmentHtml(product.fit)}</dd></div>
        <div><dt>Sizes</dt><dd>${escapeGarmentHtml(publicSizes)}</dd></div>
        <div><dt>Season</dt><dd>${escapeGarmentHtml(product.season)}</dd></div>
      </dl>
      <p class="verification-note">${verifiedSpecifications
        ? product.printingOrdersAccepted
          ? "Specification verified on 2026-07-22. Confirm quantity, color, artwork, quotation, stock and lead time before ordering."
          : "Verified specifications still require current stock, color, quantity and order confirmation."
        : "Supplier specifications, physical sample, stock and order terms are not yet verified."}</p>
      <div class="garment-card-actions">
        ${product.detailPage
          ? `<a href="${escapeGarmentHtml(product.detailPage)}">View product details</a>`
          : verifiedSpecifications
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
    ? garmentLaunchCodes
        .map((code) => garmentCatalog.find((product) => product.code === code))
        .filter(Boolean)
    : [...garmentCatalog].sort(
        (left, right) => Number(Boolean(right.detailPage)) - Number(Boolean(left.detailPage))
      );

  garmentGrid.innerHTML = products
    .map((product) => renderGarmentCard(product, contactTarget))
    .join("");
});

const aw26Batches = Array.isArray(window.bingoAw26ProductBatches)
  ? window.bingoAw26ProductBatches
  : [];

const renderAw26Product = (product, batchLabel, contactTarget) => `
  <article class="aw26-product-card" data-product-code="${escapeGarmentHtml(product.code)}">
    <a
      class="aw26-product-sheet"
      href="${escapeGarmentHtml(product.image)}"
      target="_blank"
      rel="noopener"
      aria-label="Open the English product sheet for ${escapeGarmentHtml(product.code)} ${escapeGarmentHtml(product.name)}"
    >
      <img
        src="${escapeGarmentHtml(product.image)}"
        alt="English AW26 product sheet for ${escapeGarmentHtml(product.code)} ${escapeGarmentHtml(product.name)}"
        loading="lazy"
        decoding="async"
      />
      <span>Open English product sheet</span>
    </a>
    <div class="aw26-product-copy">
      <div class="aw26-product-meta">
        <span>${escapeGarmentHtml(batchLabel)}</span>
        <strong>${escapeGarmentHtml(product.code)}</strong>
      </div>
      <p class="tag">${escapeGarmentHtml(product.category)}</p>
      <h3>${escapeGarmentHtml(product.name)}</h3>
      <dl>
        <div><dt>Material</dt><dd>${escapeGarmentHtml(product.material)}</dd></div>
        <div><dt>Size range</dt><dd>${escapeGarmentHtml(product.sizes)}</dd></div>
      </dl>
      <p class="aw26-product-note">Confirm colours, specifications, MOQ, stock and lead time with the current quotation.</p>
      <a
        class="text-link"
        href="${escapeGarmentHtml(contactTarget)}"
        data-product-interest="AW26 ${escapeGarmentHtml(product.code)} ${escapeGarmentHtml(product.name)}"
      >Request a quote for this style</a>
    </div>
  </article>
`;

document.querySelectorAll("[data-aw26-batches]").forEach((catalog) => {
  const contactTarget = catalog.dataset.contactTarget || "#garment-contact";
  catalog.innerHTML = aw26Batches
    .map(
      (batch) => `
        <section class="aw26-batch" id="${escapeGarmentHtml(batch.id)}" aria-labelledby="${escapeGarmentHtml(batch.id)}-title">
          <div class="aw26-batch-heading">
            <p class="eyebrow">${escapeGarmentHtml(batch.label)} / 5 styles</p>
            <h3 id="${escapeGarmentHtml(batch.id)}-title">${escapeGarmentHtml(batch.title)}</h3>
            <p>${escapeGarmentHtml(batch.description)}</p>
          </div>
          <div class="aw26-product-grid">
            ${batch.products
              .map((product) => renderAw26Product(product, batch.label, contactTarget))
              .join("")}
          </div>
        </section>
      `
    )
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
        caption.textContent = `${code} / ${showDetails ? "English details" : "Finished sample"}`;
      }
    });
  });
});

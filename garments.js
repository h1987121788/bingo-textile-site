const garmentCatalog = Array.isArray(window.bingoGarmentCatalog) ? window.bingoGarmentCatalog : [];
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

const renderGarmentCard = (product, contactTarget) => `
  <article class="product-card garment-card" data-category="${escapeGarmentHtml(product.category)}">
    <figure class="product-media garment-media">
      ${product.image
        ? `<img
            class="product-photo garment-photo"
            src="${escapeGarmentHtml(product.image)}"
            alt="Concept product image for ${escapeGarmentHtml(product.name)}"
            loading="lazy"
            decoding="async"
          />`
        : `<div
            class="garment-placeholder garment-placeholder--${escapeGarmentHtml(product.tone)}"
            data-visual="${escapeGarmentHtml(product.visual)}"
            role="img"
            aria-label="Concept product image pending for ${escapeGarmentHtml(product.name)}"
          >
            <span class="garment-shape" aria-hidden="true"></span>
            <small>Concept image pending</small>
          </div>`}
      <figcaption>
        <span>${escapeGarmentHtml(product.code)} / Concept visual</span>
        ${escapeGarmentHtml(product.categoryLabel)} / ${escapeGarmentHtml(product.gsm)}
      </figcaption>
    </figure>
    <div class="card-body">
      <div class="garment-card-heading">
        <p class="tag">${escapeGarmentHtml(product.categoryLabel)}</p>
        <span class="sample-gate">Sample gate</span>
      </div>
      <h3>${escapeGarmentHtml(product.name)}</h3>
      <p>${escapeGarmentHtml(product.description)}</p>
      <dl class="product-specs garment-specs">
        <div><dt>Fabric</dt><dd>${escapeGarmentHtml(product.composition)}</dd></div>
        <div><dt>Weight</dt><dd>${escapeGarmentHtml(product.gsm)}</dd></div>
        <div><dt>Fit</dt><dd>${escapeGarmentHtml(product.fit)}</dd></div>
        <div><dt>Sizes</dt><dd>${escapeGarmentHtml(product.sizes)}</dd></div>
        <div><dt>Season</dt><dd>${escapeGarmentHtml(product.season)}</dd></div>
      </dl>
      <p class="verification-note">Physical sample and order specification required before quotation.</p>
      <a
        href="${escapeGarmentHtml(contactTarget)}"
        data-product-interest="${escapeGarmentHtml(`${product.code} ${product.name}`)}"
      >Discuss this style</a>
    </div>
  </article>
`;

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

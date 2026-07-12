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

const renderGarmentPrice = (product) => {
  const price = Number(product.priceCny);
  if (!Number.isFinite(price)) return "";

  return `
    <div class="garment-price-block">
      <span>Wholesale price</span>
      <p>
        <strong>CNY ¥${escapeGarmentHtml(price.toLocaleString("en-US"))}</strong>
        <small>/ ${escapeGarmentHtml(product.unit || "piece")}</small>
      </p>
      <em>Customization, freight, duties and taxes are quoted separately.</em>
    </div>
  `;
};

const renderGarmentCard = (product, contactTarget) => `
  <article class="product-card garment-card" data-category="${escapeGarmentHtml(product.category)}">
    <figure class="product-media garment-media">
      ${product.image
        ? `<img
            class="product-photo garment-photo"
            src="${escapeGarmentHtml(product.image)}"
            alt="Unbranded style reference for ${escapeGarmentHtml(product.name)}"
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
      <figcaption>
        <span>${escapeGarmentHtml(product.code)} / Style reference</span>
        ${escapeGarmentHtml(product.categoryLabel)} / ${escapeGarmentHtml(product.gsm)}
      </figcaption>
    </figure>
    <div class="card-body">
      <div class="garment-card-heading">
        <p class="tag">${escapeGarmentHtml(product.categoryLabel)}</p>
        <span class="sample-gate">Sample first</span>
      </div>
      <h3>${escapeGarmentHtml(product.name)}</h3>
      <p>${escapeGarmentHtml(product.description)}</p>
      ${renderGarmentPrice(product)}
      <dl class="product-specs garment-specs">
        <div><dt>Fabric</dt><dd>${escapeGarmentHtml(product.composition)}</dd></div>
        <div><dt>Weight</dt><dd>${escapeGarmentHtml(product.gsm)}</dd></div>
        <div><dt>Fit</dt><dd>${escapeGarmentHtml(product.fit)}</dd></div>
        <div><dt>Sizes</dt><dd>${escapeGarmentHtml(product.sizes)}</dd></div>
        <div><dt>Season</dt><dd>${escapeGarmentHtml(product.season)}</dd></div>
      </dl>
      <p class="verification-note">Confirm stock, color, size, quantity and the physical sample before ordering.</p>
      <a
        href="${escapeGarmentHtml(contactTarget)}"
        data-product-interest="${escapeGarmentHtml(`${product.code} ${product.name}`)}"
      >Ask about this style</a>
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

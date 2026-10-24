(() => {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const icons = () =>
    window.lucide?.createIcons({ attrs: { "stroke-width": 1.6 } });
  const track = (name, params) => window.bingoTrackEvent?.(name, params);
  const batches = window.bingoAw26ProductBatches || [];
  const newProducts = batches
    .flatMap((batch) =>
      batch.products
        .filter((product) => product.status === "published")
        .map((product) => ({
          ...product,
          batch: batch.label,
          collection: "aw26",
          weight: product.name.match(/\d+gsm/i)?.[0] || "",
          title: product.name.replace(/^\d+gsm\s+/i, ""),
          sheet: product.image,
          image: product.coverImage,
          material: product.material,
          imageLabel: "AW26 on-body collection image",
          scope:
            "Collection reference. Confirm current specifications, colours, MOQ, stock and lead time with your quotation.",
        })),
    )
    .sort(
      (a, b) =>
        new Date(b.releasedAt) - new Date(a.releasedAt) ||
        a.sortOrder - b.sortOrder,
    );
  const coreProducts = (window.bingoGarmentCatalog || [])
    .map((product) => {
      const registry = window.bingoGarmentReviewStatus || {};
      const review = {
        ...registry.defaultReview,
        ...registry.products?.[product.code],
      };
      const verified =
        review.supplierSpecification === "verified" &&
        review.physicalSample === "verified";
      return {
        ...product,
        collection: "core",
        verified,
        title: verified
          ? product.name
          : product.name.replace(/\b\d{2,4}\s*gsm\s*/gi, ""),
        image: product.image,
        sheet: verified
          ? `./assets/garments/details/${product.code.toLowerCase()}-detail.webp`
          : "",
        material: verified ? product.composition : "Confirm with sample",
        weight: verified ? product.gsm : "",
        sizes: verified ? product.sizes : "Confirm with sample",
        family:
          product.unit === "set" || product.visual === "set"
            ? "sets"
            : product.categoryLabel === "Long sleeves"
              ? "long-sleeves"
              : ({
                  tank: "tanks",
                  shorts: "shorts",
                  pants: "pants",
                  hoodie: "hoodies",
                  tee: "t-shirts",
                })[product.visual] || "other",
        imageLabel:
          review.publicImage === "approved_sample_photo"
            ? "Finished sample photograph"
            : "Standardized catalog visual for a finished sample style",
        scope: verified
          ? "Verified sample specification. Current colours, stock, printing and order terms are confirmed with your quotation."
          : "Finished sample style. Supplier specifications and order terms require confirmation before quotation.",
      };
    })
    .sort((a, b) => Number(b.verified) - Number(a.verified));
  const products = [...newProducts, ...coreProducts];
  const productMap = new Map(
    products.map((product) => [product.code, product]),
  );
  const selectionKey = "bingoShowroomInquiryV2";
  let selected = [];
  try {
    const saved = JSON.parse(localStorage.getItem(selectionKey) || "[]");
    if (Array.isArray(saved))
      selected = [...new Set(saved)].filter((code) => productMap.has(code));
  } catch {
    /* Selection still works in memory if browser storage is unavailable. */
  }
  const familyNames = {
    all: "All styles",
    "t-shirts": "T-shirts",
    tanks: "Tanks",
    "long-sleeves": "Long sleeves",
    sweatshirts: "Sweatshirts",
    hoodies: "Hoodies",
    thermal: "Thermal layers",
    shorts: "Shorts",
    pants: "Pants",
    sets: "Sets",
    other: "Other garments",
  };
  const inquiryTypes = {
    "t-shirts": "T-shirts",
    tanks: "Tanks / sleeveless tops",
    "long-sleeves": "Long-sleeve tops",
    sweatshirts: "Sweatshirts / hoodies",
    hoodies: "Sweatshirts / hoodies",
    thermal: "Thermal layers",
    shorts: "Shorts",
    pants: "Pants",
    sets: "Sets / tracksuits",
    other: "Other garments",
  };
  const query = new URLSearchParams(location.search);
  let collection = query.get("collection") === "core" ? "core" : "aw26";
  let family = Object.hasOwn(familyNames, query.get("category"))
    ? query.get("category")
    : "all";
  let search = "";
  let sort = "featured";
  let currentProduct = null;
  let currentGalleryView = "photo";
  let toastTimer;
  const productDialog = $("#product-dialog");
  const inquiryDialog = $("#inquiry-dialog");
  const isNew = (product) => {
    const age =
      Date.now() - new Date(`${product.releasedAt}T00:00:00+08:00`).getTime();
    return Number.isFinite(age) && age >= 0 && age < 30 * 86400000;
  };
  const toast = (message) => {
    const element = $("[data-toast]");
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("visible"), 2600);
  };
  const card = (product, index = 10) => {
    const chosen = selected.includes(product.code);
    const badge =
      product.collection === "aw26"
        ? isNew(product)
          ? "NEW / AW26"
          : "AW26"
        : product.verified
          ? "FLAGSHIP"
          : "CORE";
    return `<article class="style-card ${product.collection === "core" ? "is-core" : ""}" data-style-code="${escape(product.code)}"><div class="style-image-wrap"><button class="style-image-button" data-open-product="${escape(product.code)}" aria-label="View ${escape(product.title)}"><img class="style-image" src="${escape(product.image)}" alt="${escape(`${product.imageLabel}: ${product.title}`)}" width="720" height="900" loading="${index < 3 ? "eager" : "lazy"}" decoding="async" /></button><span class="style-badge ${product.collection === "core" ? "core-badge" : ""}">${badge}</span><button class="style-save" data-toggle-style="${escape(product.code)}" aria-label="${chosen ? "Remove" : "Add"} ${escape(product.code)} ${chosen ? "from" : "to"} inquiry" aria-pressed="${chosen}" title="${chosen ? "Remove from inquiry" : "Add to inquiry"}">${icon(chosen ? "check" : "plus")}</button><span class="style-image-caption"><span>${escape(product.code)}</span>${icon("arrow-up-right")}</span></div><div class="style-info"><div class="style-info-top"><span>${escape(familyNames[product.family] || product.categoryLabel)}</span><span>${escape(product.weight || "SAMPLE STYLE")}</span></div><h3><button data-open-product="${escape(product.code)}">${escape(product.title)}</button></h3><p class="style-spec">${escape(product.material)} / ${escape(product.sizes)}</p><div class="style-actions"><button data-open-product="${escape(product.code)}">View style ${icon("arrow-up-right")}</button><button data-toggle-style="${escape(product.code)}" data-selection-label="${escape(product.code)}">${chosen ? "Added to inquiry" : "Add to inquiry"} ${icon(chosen ? "check" : "plus")}</button></div></div></article>`;
  };
  const syncSelection = () => {
    try {
      localStorage.setItem(selectionKey, JSON.stringify(selected));
    } catch {
      /* In-memory fallback. */
    }
    $$("[data-inquiry-count]").forEach((node) => {
      node.textContent = selected.length;
    });
    $$("[data-toggle-style]").forEach((button) => {
      const code = button.dataset.toggleStyle;
      const chosen = selected.includes(code);
      if (button.classList.contains("style-save")) {
        button.setAttribute("aria-pressed", String(chosen));
        button.setAttribute(
          "aria-label",
          `${chosen ? "Remove" : "Add"} ${code} ${chosen ? "from" : "to"} inquiry`,
        );
        button.title = chosen ? "Remove from inquiry" : "Add to inquiry";
        button.innerHTML = icon(chosen ? "check" : "plus");
      } else {
        button.innerHTML = `${chosen ? "Added to inquiry" : "Add to inquiry"} ${icon(chosen ? "check" : "plus")}`;
      }
    });
    const reference = $('input[name="reference"]');
    if (reference && selected.length) {
      reference.value = selected.join(", ");
      reference.dataset.selectedCodes = reference.value;
    } else if (reference && reference.value === reference.dataset.selectedCodes) {
      reference.value = "";
      delete reference.dataset.selectedCodes;
    }
    const garmentType = $('select[name="garment_type"]');
    if (garmentType && selected.length) {
      const chosenProducts = selected.map((code) => productMap.get(code));
      const types = new Set(
        chosenProducts.map((product) => inquiryTypes[product.family]),
      );
      garmentType.value =
        types.size === 1
          ? [...types][0]
          : chosenProducts.every((product) => product.collection === "aw26")
            ? "AW26 mixed collection"
            : "Mixed garment collection";
      garmentType.dataset.selectedType = garmentType.value;
    } else if (
      garmentType &&
      garmentType.value === garmentType.dataset.selectedType
    ) {
      garmentType.value = "";
      delete garmentType.dataset.selectedType;
    }
    icons();
  };
  const toggleStyle = (code) => {
    if (!productMap.has(code)) return;
    const existed = selected.includes(code);
    selected = existed
      ? selected.filter((value) => value !== code)
      : [...selected, code];
    syncSelection();
    toast(
      existed
        ? `${code} removed from your inquiry`
        : `${code} added to your inquiry`,
    );
    if (!existed)
      track("product_interest", {
        product_interest: `${code} ${productMap.get(code).title}`,
        action: "add_to_inquiry",
      });
    if (inquiryDialog.open) renderInquiry();
  };
  const renderCatalog = () => {
    const grid = $("[data-catalog-grid]");
    if (!grid) return;
    const catalogProducts = collection === "aw26" ? newProducts : coreProducts;
    const availableFamilies = new Set(
      catalogProducts.map((product) => product.family),
    );
    if (family !== "all" && !availableFamilies.has(family)) family = "all";
    const filters = $(".category-filters");
    if (filters.dataset.collection !== collection) {
      filters.innerHTML = Object.entries(familyNames)
        .filter(([key]) => key === "all" || availableFamilies.has(key))
        .map(([key, label]) =>
          `<button data-family="${key}" aria-pressed="false">${label}</button>`,
        )
        .join("");
      filters.dataset.collection = collection;
    }
    let shown = catalogProducts.filter(
      (product) =>
        (family === "all" || product.family === family) &&
        `${product.code} ${product.title} ${product.material} ${product.weight}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    if (sort === "name")
      shown = [...shown].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "newest")
      shown = [...shown].sort(
        (a, b) =>
          new Date(b.releasedAt || "2000-01-01") -
            new Date(a.releasedAt || "2000-01-01") ||
          a.code.localeCompare(b.code),
      );
    if (sort === "weight")
      shown = [...shown].sort(
        (a, b) =>
          (parseInt(a.weight) || Infinity) - (parseInt(b.weight) || Infinity),
      );
    grid.innerHTML = shown.map(card).join("");
    $("[data-result-count]").textContent =
      `${shown.length} ${shown.length === 1 ? "style" : "styles"}`;
    $("[data-catalog-empty]").hidden = shown.length > 0;
    $("[data-collection-note]").textContent =
      collection === "aw26"
        ? "AW26 / AUTUMN-WINTER 2026"
        : "CORE / FINISHED SAMPLE STYLES";
    $$("[data-collection]").forEach((button) => {
      const active = button.dataset.collection === collection;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $("#collection-panel").setAttribute("aria-labelledby", `tab-${collection}`);
    $$("[data-family]").forEach((button) => {
      const active = button.dataset.family === family;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    icons();
  };
  const openProduct = (code) => {
    const product = productMap.get(code);
    if (!product) return;
    currentProduct = product;
    currentGalleryView = "photo";
    const peers = product.collection === "aw26" ? newProducts : coreProducts;
    const at = peers.findIndex((item) => item.code === code);
    const previous = peers[(at - 1 + peers.length) % peers.length];
    const next = peers[(at + 1) % peers.length];
    const chosen = selected.includes(code);
    $("[data-product-dialog-content]").innerHTML =
      `<div class="product-detail"><div class="detail-gallery"><a class="detail-image-link" data-full-image href="${escape(product.image)}" target="_blank" rel="noopener" aria-label="Open full-size product photograph"><img class="detail-main-image" data-detail-image src="${escape(product.image)}" alt="${escape(`${product.imageLabel}: ${product.title}`)}" width="720" height="900" /></a><div class="detail-gallery-tools"><div class="gallery-tabs" role="group" aria-label="Product image view"><button data-gallery-view="photo" aria-pressed="true">On-body / product</button>${product.sheet ? '<button data-gallery-view="sheet" aria-pressed="false">English sheet</button>' : ""}</div><a class="icon-button" data-full-image href="${escape(product.image)}" target="_blank" rel="noopener" aria-label="Open image at full size" title="Open full size">${icon("expand")}</a></div></div><div class="detail-copy"><p class="kicker">${product.collection === "aw26" ? `AW26 / ${product.batch}` : "CORE COLLECTION"} / ${escape(code)}</p><h2 id="product-dialog-title">${escape(product.title)}</h2><p>${escape(product.collection === "aw26" ? "A new-season direction for your next private-label collection." : product.description)}</p><dl class="detail-specs"><div><dt>Material</dt><dd>${escape(product.material)}</dd></div><div><dt>Weight</dt><dd>${escape(product.weight || "Confirm with sample")}</dd></div><div><dt>Size range</dt><dd>${escape(product.sizes)}</dd></div><div><dt>Pricing</dt><dd>Current quote on request</dd></div></dl><button class="btn btn-dark" data-toggle-style="${escape(code)}">${chosen ? "Added to inquiry" : "Add to inquiry"} ${icon(chosen ? "check" : "plus")}</button><button class="text-link" data-product-to-brief="${escape(code)}">Ask about this style ${icon("arrow-up-right")}</button><p class="detail-note">${escape(product.scope)}</p>${product.sheet ? `<a class="detail-sheet-link" href="${escape(product.sheet)}" target="_blank" rel="noopener">Open full English product sheet ${icon("external-link")}</a>` : ""}</div></div><div class="detail-pager"><button data-open-product="${escape(previous.code)}">${icon("arrow-left")} Previous style</button><span>${at + 1} / ${peers.length}</span><button data-open-product="${escape(next.code)}">Next style ${icon("arrow-right")}</button></div>`;
    if (!productDialog.open) productDialog.showModal();
    else productDialog.scrollTop = 0;
    icons();
    track("product_interest", {
      product_interest: `${code} ${product.title}`,
      action: "view_style",
    });
  };
  const renderInquiry = () => {
    $("[data-inquiry-items]").innerHTML = selected.length
      ? selected
          .map((code) => {
            const product = productMap.get(code);
            return `<article class="inquiry-row"><img src="${escape(product.image)}" alt="${escape(product.title)}" width="70" height="90" /><div><h3>${escape(product.title)}</h3><p>${escape(code)} / ${escape(product.weight || "Core collection")}</p></div><button class="icon-button" data-remove-style="${escape(code)}" aria-label="Remove ${escape(code)} from inquiry" title="Remove style">${icon("x")}</button></article>`;
          })
          .join("")
      : `<div class="empty-inquiry">${icon("shopping-bag")}<p>Your next collection starts here.<br>Add a style to prepare your inquiry.</p><a class="btn btn-dark" href="./garments.html#aw26-latest">Explore AW26 ${icon("arrow-right")}</a></div>`;
    $("[data-continue-inquiry]").hidden = selected.length === 0;
    icons();
  };
  const openInquiry = () => {
    renderInquiry();
    inquiryDialog.showModal();
  };
  const toBrief = () => {
    if (productDialog.open) productDialog.close();
    if (inquiryDialog.open) inquiryDialog.close();
    syncSelection();
    if (selected.length) {
      try {
        sessionStorage.setItem("productInterest", selected.join(", "));
      } catch {
        /* Optional attribution. */
      }
    }
    $("#contact").scrollIntoView({ behavior: "smooth" });
    setTimeout(
      () => $('input[name="brand"]')?.focus({ preventScroll: true }),
      450,
    );
  };
  $$("[data-aw26-count]").forEach((node) => {
    node.textContent = newProducts.length;
  });
  const featuredGrid = $("[data-featured-grid]");
  if (featuredGrid)
    featuredGrid.innerHTML = newProducts
      .filter((product) => product.featured)
      .slice(0, 6)
      .map(card)
      .join("");
  renderCatalog();
  syncSelection();
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button,a");
    if (!target) return;
    if (target.dataset.openProduct) openProduct(target.dataset.openProduct);
    if (target.dataset.toggleStyle) toggleStyle(target.dataset.toggleStyle);
    if (target.hasAttribute("data-open-inquiry")) openInquiry();
    if (target.hasAttribute("data-close-dialog"))
      target.closest("dialog").close();
    if (target.dataset.removeStyle) toggleStyle(target.dataset.removeStyle);
    if (target.hasAttribute("data-continue-inquiry")) toBrief();
    if (target.dataset.productToBrief) {
      const code = target.dataset.productToBrief;
      if (!selected.includes(code)) {
        selected.push(code);
        syncSelection();
      }
      toBrief();
    }
    if (target.dataset.collection) {
      collection = target.dataset.collection;
      family = "all";
      renderCatalog();
    }
    if (target.dataset.family) {
      family = target.dataset.family;
      renderCatalog();
    }
    if (target.hasAttribute("data-clear-filters")) {
      family = "all";
      search = "";
      $("[data-catalog-search]").value = "";
      renderCatalog();
    }
    if (target.dataset.galleryView && currentProduct) {
      currentGalleryView = target.dataset.galleryView;
      const sheet = currentGalleryView === "sheet";
      const src = sheet ? currentProduct.sheet : currentProduct.image;
      $("[data-detail-image]").src = src;
      $("[data-detail-image]").alt =
        `${sheet ? "English product sheet" : currentProduct.imageLabel}: ${currentProduct.title}`;
      $("[data-detail-image]").classList.toggle("is-sheet", sheet);
      $$("[data-full-image]").forEach((link) => {
        link.href = src;
      });
      $$("[data-gallery-view]").forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.galleryView === currentGalleryView),
        ),
      );
    }
  });
  $("[data-catalog-search]")?.addEventListener("input", (event) => {
    search = event.target.value.trim();
    renderCatalog();
  });
  $("[data-catalog-sort]")?.addEventListener("change", (event) => {
    sort = event.target.value;
    renderCatalog();
  });
  $$("[data-collection]").forEach((tab) =>
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      collection =
        event.key === "Home"
          ? "aw26"
          : event.key === "End"
            ? "core"
            : collection === "aw26"
              ? "core"
              : "aw26";
      family = "all";
      renderCatalog();
      $(`#tab-${collection}`).focus();
    }),
  );
  const menuButton = $("[data-menu-toggle]");
  const nav = $("#main-nav");
  const closeMenu = () => {
    nav.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
  };
  menuButton.addEventListener("click", () => {
    const expanded = nav.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(expanded));
    menuButton.setAttribute(
      "aria-label",
      expanded ? "Close menu" : "Open menu",
    );
  });
  $$("a", nav).forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  for (const dialog of [productDialog, inquiryDialog]) {
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom)
      )
        dialog.close();
    });
  }
  if (query.get("style")) openProduct(query.get("style"));
})();

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const strictCommercial = process.argv.includes("--strict-commercial");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "garment-data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "garment-review-status.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "aw26-product-data.js"), "utf8"), context);

const catalog = context.window.bingoGarmentCatalog;
const launchCodes = context.window.bingoGarmentLaunchCodes;
const publicRegistry = context.window.bingoGarmentReviewStatus;
const aw26Batches = context.window.bingoAw26ProductBatches;
const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "garment_review_status.json"), "utf8")
);
const errors = [];
const warnings = [];
const requiredFields = [
  "code",
  "name",
  "unit",
  "image",
  "category",
  "categoryLabel",
  "gsm",
  "composition",
  "fit",
  "sizes",
  "season",
  "description"
];
const verifiedValues = new Set(["recorded", "verified", "approved_sample_photo"]);
const publicReviewFields = [
  "sourceMapping",
  "supplierSpecification",
  "physicalSample",
  "commercialPrice",
  "publicImage",
  "reviewedAt"
];

if (!Array.isArray(catalog)) errors.push("window.bingoGarmentCatalog must be an array");
if (context.window.bingoGarmentPricing) {
  errors.push("public catalog pricing metadata must not be shipped");
}
if (!publicRegistry || !publicRegistry.defaultReview || !publicRegistry.products) {
  errors.push("public garment review status is missing or invalid");
}

const rendererSource = fs.readFileSync(path.join(ROOT, "garments.js"), "utf8");
for (const marker of [
  'review.supplierSpecification === "verified"',
  'review.physicalSample === "verified"',
  'data-commercial-status="quote-required"',
  'Request current quotation'
]) {
  if (!rendererSource.includes(marker)) errors.push(`garment renderer is missing commercial gate: ${marker}`);
}

const products = Array.isArray(catalog) ? catalog : [];
const codes = products.map((product) => product.code);
if (new Set(codes).size !== codes.length) errors.push("duplicate garment codes found");
if (!Array.isArray(launchCodes) || launchCodes[0] !== "BG-GM-047") {
  errors.push("BG-GM-047 must remain the first homepage launch code");
}

for (let index = 0; index < products.length; index += 1) {
  const product = products[index];
  const expectedCode = `BG-GM-${String(index + 1).padStart(3, "0")}`;
  if (product.code !== expectedCode) errors.push(`expected ${expectedCode}, found ${product.code}`);

  for (const field of requiredFields) {
    if (product[field] === undefined || product[field] === null || product[field] === "") {
      errors.push(`${product.code || expectedCode} is missing ${field}`);
    }
  }

  if (Object.keys(product).some((field) => /price|cost/i.test(field))) {
    errors.push(`${product.code} exposes a public price or cost field`);
  }
  if (!["piece", "set"].includes(product.unit)) errors.push(`${product.code} has an invalid unit`);

  const productImage = path.resolve(ROOT, String(product.image || "").replace(/^\.\//, ""));
  const detailImage = path.join(
    ROOT,
    "assets",
    "garments",
    "details",
    `${String(product.code || "").toLowerCase()}-detail.webp`
  );
  for (const asset of [productImage, detailImage]) {
    if (!fs.existsSync(asset) || fs.statSync(asset).size < 1024) {
      errors.push(`${product.code} is missing a usable asset: ${path.relative(ROOT, asset)}`);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(registry.products || {}, product.code)) {
    errors.push(`${product.code} is missing from the review registry`);
    continue;
  }

  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  const publicReview = {
    ...(publicRegistry?.defaultReview || {}),
    ...((publicRegistry?.products || {})[product.code] || {})
  };
  for (const field of publicReviewFields) {
    if (String(publicReview[field] || "") !== String(review[field] || "")) {
      errors.push(`${product.code} public review status does not match ${field}`);
    }
  }
  const hasVerifiedStatus = [
    review.sourceMapping,
    review.supplierSpecification,
    review.physicalSample,
    review.commercialPrice,
    review.publicImage
  ].some((value) => verifiedValues.has(value));
  if (hasVerifiedStatus && (!review.reviewedAt || !Array.isArray(review.evidence) || !review.evidence.length)) {
    errors.push(`${product.code} has a verified status without dated evidence`);
  }
  if (strictCommercial && review.commercialPrice !== "quote_only_not_published") {
    errors.push(`${product.code} must remain quote-only with no public price`);
  }
}

for (const code of Object.keys(registry.products || {})) {
  if (!codes.includes(code)) errors.push(`review registry contains unknown code ${code}`);
}

const flagship = products.find((product) => product.code === "BG-GM-047");
const flagshipReview = {
  ...registry.defaultReview,
  ...((registry.products || {})["BG-GM-047"] || {})
};
if (!flagship) {
  errors.push("BG-GM-047 flagship product is missing");
} else {
  const expectedFlagshipFields = {
    unit: "piece",
    gsm: "280gsm",
    composition: "100% cotton",
    sizes: "S-2XL",
    detailPage: "./280gsm-cotton-oversized-t-shirt.html",
    printingOrdersAccepted: true,
    freightIncluded: false
  };
  for (const [field, expected] of Object.entries(expectedFlagshipFields)) {
    if (flagship[field] !== expected) {
      errors.push(`BG-GM-047 ${field} must be ${JSON.stringify(expected)}`);
    }
  }
  if (!Array.isArray(flagship.gallery) || flagship.gallery.length !== 4) {
    errors.push("BG-GM-047 must retain four finished-sample gallery images");
  } else {
    for (const entry of flagship.gallery) {
      const galleryImage = path.resolve(ROOT, String(entry.src || "").replace(/^\.\//, ""));
      if (!entry.alt || !fs.existsSync(galleryImage) || fs.statSync(galleryImage).size < 1024) {
        errors.push(`BG-GM-047 has an invalid gallery entry: ${entry.src || "missing src"}`);
      }
    }
  }
}
for (const [field, expected] of Object.entries({
  supplierSpecification: "verified",
  physicalSample: "verified",
  commercialPrice: "quote_only_not_published",
  publicImage: "approved_sample_photo",
  reviewedAt: "2026-07-22"
})) {
  if (flagshipReview[field] !== expected) {
    errors.push(`BG-GM-047 review ${field} must be ${expected}`);
  }
}

const unconfirmed = (field) => products.filter((product) => /confirm/i.test(String(product[field] || ""))).length;
const incompleteSpecificationCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.physicalSample !== "verified" || review.supplierSpecification !== "verified";
}).length;
const unverifiedSampleCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.physicalSample !== "verified";
}).length;
const unverifiedSupplierSpecificationCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.supplierSpecification !== "verified";
}).length;
const publiclyQuotedCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.commercialPrice === "verified";
}).length;
const publiclySpecifiedCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.supplierSpecification === "verified" && review.physicalSample === "verified";
}).length;

if (unverifiedSampleCount) {
  warnings.push(`${unverifiedSampleCount} products remain explicitly unverified as physical samples`);
}
if (unverifiedSupplierSpecificationCount) {
  warnings.push(`${unverifiedSupplierSpecificationCount} products still require supplier specification verification`);
}

const aw26Products = Array.isArray(aw26Batches)
  ? aw26Batches.flatMap((batch) => (Array.isArray(batch.products) ? batch.products : []))
  : [];
if (!Array.isArray(aw26Batches) || aw26Batches.length !== 4) {
  errors.push("AW26 catalog must contain four batches");
}
for (const batch of Array.isArray(aw26Batches) ? aw26Batches : []) {
  if (!Array.isArray(batch.products) || batch.products.length !== 5) {
    errors.push(`${batch.id || "unknown AW26 batch"} must contain five products`);
  }
}
if (aw26Products.length !== 20) errors.push("AW26 catalog must contain twenty products");
const aw26Codes = aw26Products.map((product) => product.code);
if (new Set(aw26Codes).size !== aw26Codes.length) errors.push("duplicate AW26 product codes found");
for (const product of aw26Products) {
  for (const field of ["code", "name", "category", "material", "sizes", "image"]) {
    if (!product[field]) errors.push(`AW26 ${product.code || "unknown"} is missing ${field}`);
  }
  if (Object.keys(product).some((field) => /price|cost/i.test(field))) {
    errors.push(`AW26 ${product.code || "unknown"} exposes a public price or cost field`);
  }
  const image = path.resolve(ROOT, String(product.image || "").replace(/^\.\//, ""));
  if (!fs.existsSync(image) || fs.statSync(image).size < 1024) {
    errors.push(`AW26 ${product.code || "unknown"} is missing a usable English product sheet`);
  }
}

const result = {
  ok: errors.length === 0,
  strictCommercial,
  catalogCount: products.length,
  aw26BatchCount: Array.isArray(aw26Batches) ? aw26Batches.length : 0,
  aw26ProductCount: aw26Products.length,
  reviewRegistryCount: Object.keys(registry.products || {}).length,
  publiclyQuotedCount,
  publiclySpecifiedCount,
  unconfirmedFields: {
    composition: unconfirmed("composition"),
    gsm: unconfirmed("gsm"),
    sizes: unconfirmed("sizes")
  },
  incompleteSpecificationCount,
  flagship: flagship
    ? {
        code: flagship.code,
        specificationVerified: flagshipReview.supplierSpecification === "verified",
        commercialTerms: flagshipReview.commercialPrice
      }
    : null,
  errors,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

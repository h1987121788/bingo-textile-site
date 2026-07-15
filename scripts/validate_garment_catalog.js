const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const strictCommercial = process.argv.includes("--strict-commercial");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "garment-data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "garment-review-status.js"), "utf8"), context);

const catalog = context.window.bingoGarmentCatalog;
const pricing = context.window.bingoGarmentPricing;
const publicRegistry = context.window.bingoGarmentReviewStatus;
const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "garment_review_status.json"), "utf8")
);
const errors = [];
const warnings = [];
const requiredFields = [
  "code",
  "name",
  "priceCny",
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
if (!pricing || pricing.currency !== "USD" || pricing.cnyPerUsd !== 6.5) {
  errors.push("catalog pricing must explicitly retain USD and CNY 6.5 conversion metadata");
}
if (!publicRegistry || !publicRegistry.defaultReview || !publicRegistry.products) {
  errors.push("public garment review status is missing or invalid");
}

const rendererSource = fs.readFileSync(path.join(ROOT, "garments.js"), "utf8");
for (const marker of [
  'review.commercialPrice !== "verified"',
  'review.supplierSpecification === "verified"',
  'review.physicalSample === "verified"',
  'data-commercial-status="quote-required"'
]) {
  if (!rendererSource.includes(marker)) errors.push(`garment renderer is missing commercial gate: ${marker}`);
}

const products = Array.isArray(catalog) ? catalog : [];
const codes = products.map((product) => product.code);
if (new Set(codes).size !== codes.length) errors.push("duplicate garment codes found");

for (let index = 0; index < products.length; index += 1) {
  const product = products[index];
  const expectedCode = `BG-GM-${String(index + 1).padStart(3, "0")}`;
  if (product.code !== expectedCode) errors.push(`expected ${expectedCode}, found ${product.code}`);

  for (const field of requiredFields) {
    if (product[field] === undefined || product[field] === null || product[field] === "") {
      errors.push(`${product.code || expectedCode} is missing ${field}`);
    }
  }

  if (!Number.isFinite(Number(product.priceCny)) || Number(product.priceCny) <= 0) {
    errors.push(`${product.code} has an invalid priceCny`);
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
  if (strictCommercial && review.commercialPrice !== "verified") {
    errors.push(`${product.code} commercial price is not verified`);
  }
}

for (const code of Object.keys(registry.products || {})) {
  if (!codes.includes(code)) errors.push(`review registry contains unknown code ${code}`);
}

const unconfirmed = (field) => products.filter((product) => /confirm/i.test(String(product[field] || ""))).length;
const allDefaultUnverified = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.physicalSample !== "verified" || review.supplierSpecification !== "verified";
}).length;
const publiclyQuotedCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.commercialPrice === "verified";
}).length;
const publiclySpecifiedCount = products.filter((product) => {
  const review = { ...registry.defaultReview, ...registry.products[product.code] };
  return review.supplierSpecification === "verified" && review.physicalSample === "verified";
}).length;

if (allDefaultUnverified) {
  warnings.push(`${allDefaultUnverified} products remain explicitly unverified for sample or supplier specifications`);
}

const usdPrices = products.map((product) => Number(product.priceCny) / Number(pricing.cnyPerUsd));
const result = {
  ok: errors.length === 0,
  strictCommercial,
  catalogCount: products.length,
  reviewRegistryCount: Object.keys(registry.products || {}).length,
  publiclyQuotedCount,
  publiclySpecifiedCount,
  unconfirmedFields: {
    composition: unconfirmed("composition"),
    gsm: unconfirmed("gsm"),
    sizes: unconfirmed("sizes")
  },
  usdPriceRange: usdPrices.length
    ? [Math.min(...usdPrices).toFixed(2), Math.max(...usdPrices).toFixed(2)]
    : [],
  errors,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

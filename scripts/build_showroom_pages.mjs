import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const original = await fs.readFile(path.join(root, "index.html"), "utf8");
const graph =
  original.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1] || "{}";
const versions = {};
for (const file of ["aw26-product-data.js", "aw26-size-guides.js", "showroom.js", "showroom.css"]) {
  versions[file] = createHash("sha256")
    .update(await fs.readFile(path.join(root, file)))
    .digest("hex")
    .slice(0, 12);
}
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const header = (catalog) => `
<a class="skip-link" href="#main">Skip to content</a>
<div class="announcement"><span>AW26 / THE NEW COLLECTION</span><a href="./garments.html#aw26-latest">Explore the drop ${icon("arrow-up-right")}</a><span class="announcement-location">GUANGZHOU / WORLDWIDE</span></div>
<header class="showroom-header">
  <a class="wordmark" href="./index.html" aria-label="Bingo Garments home">BINGO<span>GARMENTS</span><b class="brand-dot" aria-hidden="true"></b></a>
  <nav class="main-nav" id="main-nav" aria-label="Primary navigation">
    <a ${catalog ? 'aria-current="page"' : ""} href="./garments.html#aw26-latest">New AW26 <span class="new-dot"></span></a>
    <a href="./garments.html?collection=core#aw26-latest">Core collection</a>
    <a href="./index.html#private-label">Private label</a>
    <a href="./index.html#contact">Contact</a>
  </nav>
  <div class="header-tools"><button class="inquiry-toggle" data-open-inquiry aria-label="Open inquiry list" title="Your inquiry list">${icon("shopping-bag")}<span class="inquiry-label">Inquiry</span><span data-inquiry-count>0</span></button><button class="icon-button mobile-menu" data-menu-toggle aria-label="Open menu" aria-controls="main-nav" aria-expanded="false">${icon("menu")}</button></div>
</header>`;
const footer = `
<footer class="showroom-footer"><div class="footer-top"><a class="footer-brand" href="./index.html">BINGO GARMENTS<span>From first reference to your next collection.</span></a><div><a href="./garments.html">New AW26</a><a href="./280gsm-cotton-oversized-t-shirt.html">280gsm flagship tee</a><a href="./fabric-sample-matching-service.html">Material library</a></div><div><a href="mailto:57317996@qq.com">57317996@qq.com</a><a href="https://wa.me/8613827719946" target="_blank" rel="noopener">WhatsApp ${icon("arrow-up-right")}</a><span>Jason Huang / Guangzhou, China</span></div></div><div class="footer-bottom"><span>&copy; 2026 Bingo Garments / Bingo Textile</span><span>Independent collections. Considered production.</span><a href="#top">Back to top ${icon("arrow-up")}</a></div></footer>
<dialog class="product-dialog" id="product-dialog" aria-labelledby="product-dialog-title"><div class="dialog-tools"><button class="dialog-close icon-button" data-close-dialog aria-label="Close product details">${icon("x")}</button></div><div data-product-dialog-content></div></dialog>
<dialog class="inquiry-dialog" id="inquiry-dialog" aria-labelledby="inquiry-dialog-title"><div class="dialog-heading"><div><p class="kicker">YOUR SELECTION</p><h2 id="inquiry-dialog-title">The next collection.</h2></div><button class="icon-button" data-close-dialog aria-label="Close inquiry list">${icon("x")}</button></div><div data-inquiry-items></div><div class="inquiry-bottom"><p>Pricing, colours and lead time are confirmed for your order.</p><button class="btn btn-dark" data-continue-inquiry>Prepare my brief ${icon("arrow-right")}</button></div></dialog>
<p class="toast" role="status" aria-live="polite" data-toast></p>`;
const contact = `
<section class="contact-section section-pad" id="contact"><div class="contact-heading"><p class="kicker">LET'S MAKE YOUR NEXT DROP</p><h2>Good garments<br>start with a brief.</h2><p>Send your selected styles, quantity and reference. Jason will help shape the sample and quotation.</p><a class="text-link" href="https://wa.me/8613827719946" target="_blank" rel="noopener">Talk on WhatsApp ${icon("arrow-up-right")}</a><span class="contact-person">Jason Huang / Guangzhou</span></div>
<form class="contact-form" data-lead-form data-form-name="Showroom garment inquiry">
  <input name="service_type" type="hidden" value="Private label garments" />
  <label class="form-honeypot" aria-hidden="true"><span>Fax number</span><input name="fax_number" type="text" tabindex="-1" autocomplete="off" /></label>
  <label><span>Brand / company</span><input name="brand" type="text" maxlength="160" autocomplete="organization" placeholder="Your brand name" required /></label>
  <label><span>Country / market</span><input name="country" type="text" maxlength="100" autocomplete="country-name" placeholder="United States" required /></label>
  <label class="field-full"><span>Selected styles / reference</span><input name="reference" type="text" maxlength="500" placeholder="Select styles above or add your reference" required /></label>
  <label><span>Garment type</span><select name="garment_type" required><option value="">Select a type</option><option>T-shirts</option><option>Tanks / sleeveless tops</option><option>Long-sleeve tops</option><option>Sweatshirts / hoodies</option><option>Thermal layers</option><option>Shorts</option><option>Pants</option><option>Sets / tracksuits</option><option>Other garments</option><option>AW26 mixed collection</option><option>Mixed garment collection</option><option>Full custom style</option></select></label>
  <label><span>Estimated quantity</span><input name="quantity" type="text" maxlength="160" placeholder="e.g. 100 pieces per style" required /></label>
  <label><span>WhatsApp number</span><input name="whatsapp" type="tel" maxlength="40" autocomplete="tel" placeholder="+1 555 000 0000" required /></label>
  <label><span>Business email <small>Optional</small></span><input name="email" type="email" maxlength="254" autocomplete="email" placeholder="you@brand.com" /></label>
  <details class="brief-extras field-full"><summary>Artwork, sizes &amp; delivery details ${icon("plus")}</summary><div class="extras-grid"><label><span>Reference / tech pack link</span><input name="reference_links" type="url" maxlength="1000" placeholder="https://drive.google.com/..." /></label><label><span>Sizes &amp; colours</span><input name="size_range" type="text" maxlength="160" placeholder="S-XL / black and white" /></label><label><span>Print / label requirements</span><input name="decoration" type="text" maxlength="500" placeholder="Screen print, embroidery, labels..." /></label><label><span>Delivery destination</span><input name="destination" type="text" maxlength="200" placeholder="City, country and postal code" /></label><label class="field-full"><span>Project notes</span><textarea name="message" rows="3" maxlength="3000" placeholder="Target budget, timing and anything else we should know"></textarea></label></div></details>
  <label class="checkbox-field field-full"><input name="whatsapp_consent" type="checkbox" required data-label="WhatsApp consent" /><span>I agree to be contacted on WhatsApp about this project.</span></label>
  <button class="btn btn-dark field-full" type="submit">Send inquiry ${icon("arrow-up-right")}</button><p class="form-note field-full" data-form-message>Your brief is used for sampling, quotation and project follow-up.</p>
</form></section>`;
const home = `
<section class="editorial-hero" aria-labelledby="hero-title"><picture class="hero-picture"><source media="(max-width: 640px)" srcset="./assets/garments/aw26/still-life/253.webp" /><img src="./assets/garments/aw26/still-life/collection.webp" alt="AW26 white cotton long-sleeve tee and pink vintage-wash zip hoodie, garments only" width="1920" height="1000" fetchpriority="high" /></picture><div class="hero-copy"><p class="kicker">AUTUMN / WINTER 2026</p><h1 id="hero-title">BINGO<br>GARMENTS</h1><p class="hero-description">Considered essentials.<br>Made for your label.</p><a class="btn btn-dark" href="./garments.html#aw26-latest">View AW26 collection ${icon("arrow-up-right")}</a><p class="hero-service">Wholesale &amp; private-label garments</p></div><div class="hero-index"><span>AW26 / <span data-aw26-count>20</span> SELECTED STYLES</span><span>GUANGZHOU / WORLDWIDE</span>${icon("arrow-down-right")}</div></section>
<div class="collection-strip"><span>THE NEW SEASON, IN EVERY LAYER.</span><span>LONG SLEEVES <b>+</b> HEAVYWEIGHT SWEATS <b>+</b> VINTAGE WASH</span></div>
<section class="section-pad new-arrivals" id="new-arrivals"><div class="section-heading"><div><p class="kicker">JUST ADDED / AW26</p><h2>New season. New possibilities.</h2></div><a class="text-link" href="./garments.html#aw26-latest">All <span data-aw26-count>20</span> new styles ${icon("arrow-up-right")}</a></div><div class="style-grid" data-featured-grid></div><div class="section-end"><a class="btn btn-outline" href="./garments.html#aw26-latest">Explore the full AW26 collection ${icon("arrow-right")}</a></div></section>
<section class="category-section section-pad"><div class="section-heading"><div><p class="kicker">FIND YOUR SILHOUETTE</p><h2>Three ways to layer.</h2></div><span class="muted">The AW26 edit.</span></div><div class="category-grid"><a href="./garments.html?category=long-sleeves#aw26-latest"><img src="./assets/garments/aw26/still-life/04c.webp" alt="White long-sleeve cotton tee, garment only" loading="lazy" width="720" height="900" /><span>01 / LONG SLEEVES ${icon("arrow-up-right")}</span></a><a href="./garments.html?category=sweatshirts#aw26-latest"><img src="./assets/garments/aw26/still-life/251.webp" alt="Pink vintage-wash crewneck sweatshirt, garment only" loading="lazy" width="720" height="900" /><span>02 / SWEATSHIRTS ${icon("arrow-up-right")}</span></a><a href="./garments.html?category=hoodies#aw26-latest"><img src="./assets/garments/aw26/still-life/252.webp" alt="Vintage-wash pullover hoodie, garment only" loading="lazy" width="720" height="900" /><span>03 / HOODIES ${icon("arrow-up-right")}</span></a></div></section>
<section class="flagship-band section-pad" id="flagship-tee"><div><p class="kicker">THE CORE BLANK / BG-GM-047</p><h2>The 280gsm cotton tee.</h2><p>100% cotton. An oversized fit. Your artwork.</p><div class="flagship-facts"><span>S-2XL</span><span>BLACK / WHITE</span><span>PRINT TO ORDER</span></div></div><a class="btn btn-outline" href="./280gsm-cotton-oversized-t-shirt.html">Explore the flagship ${icon("arrow-up-right")}</a></section>
<section class="private-label section-pad" id="private-label"><div class="section-heading"><div><p class="kicker">YOUR LABEL. YOUR DIRECTION.</p><h2>From reference to ready.</h2></div><a class="text-link" href="#contact">Start a conversation ${icon("arrow-up-right")}</a></div><div class="process-grid"><article><span>01</span><h3>Share your idea</h3><p>A selected style, reference image or tech pack. Add your quantity and destination.</p></article><article><span>02</span><h3>Shape the sample</h3><p>Review fabric, fit, print placement and branding with a focused sample plan.</p></article><article><span>03</span><h3>Approve the details</h3><p>Confirm the sample, measurements, order terms and packing before production.</p></article><article><span>04</span><h3>Make your collection</h3><p>Coordinate the approved production, quality checks and shipment.</p></article></div></section>
${contact}`;
const catalog = `
<section class="catalog-intro section-pad"><div><p class="kicker"><a href="./index.html">HOME</a> / COLLECTIONS / AW26</p><h1>The new layer.</h1><p>Long sleeves, heavy sweats and vintage washes.<br>A new season of possibilities for your label.</p></div><div class="season-mark" aria-label="Autumn Winter 2026">AW<span>26</span><b><span data-aw26-count>20</span> NEW STYLES</b></div></section>
<section class="catalog-section section-pad" id="aw26-latest"><div class="collection-tabs" role="tablist" aria-label="Collection"><button id="tab-aw26" role="tab" aria-selected="true" aria-controls="collection-panel" data-collection="aw26">New AW26 <span data-aw26-count>20</span></button><button id="tab-core" role="tab" aria-selected="false" aria-controls="collection-panel" data-collection="core" tabindex="-1">Core collection <span>47</span></button></div><div role="tabpanel" id="collection-panel" aria-labelledby="tab-aw26"><div class="catalog-tools"><div class="category-filters" role="group" aria-label="Garment category"><button class="active" data-family="all" aria-pressed="true">All styles</button><button data-family="long-sleeves" aria-pressed="false">Long sleeves</button><button data-family="sweatshirts" aria-pressed="false">Sweatshirts</button><button data-family="hoodies" aria-pressed="false">Hoodies</button><button data-family="thermal" aria-pressed="false">Thermal layers</button></div><div class="search-sort"><label class="catalog-search">${icon("search")}<input type="search" data-catalog-search placeholder="Search styles or codes" aria-label="Search styles or codes" /></label><label class="sort-control"><span class="sr-only">Sort styles</span><select data-catalog-sort><option value="featured">Curated order</option><option value="newest">Newest first</option><option value="name">Name A-Z</option><option value="weight">Weight: light to heavy</option></select></label></div></div><div class="results-meta"><span data-result-count role="status" aria-live="polite">20 styles</span><span data-collection-note>AW26 / AUTUMN-WINTER 2026</span></div><div class="style-grid" data-catalog-grid data-aw26-batches></div><div class="catalog-empty" data-catalog-empty hidden>${icon("search")}<h2>No styles found.</h2><p>Try a different name, code or category.</p><button class="btn btn-dark" data-clear-filters>Clear filters ${icon("rotate-ccw")}</button></div></div><p class="collection-note">These catalog styles correspond to finished garment samples. Current specifications, colours and order terms are confirmed with the selected source before quotation and ordering.</p></section>
<section class="catalog-callout section-pad"><p class="kicker">MAKE IT YOUR OWN</p><h2>Found your direction?</h2><p>Choose your styles. Send your quantity, artwork and destination. Let's build your sample plan.</p><button class="btn btn-lime" data-open-inquiry>Review your selection ${icon("arrow-up-right")}</button><a href="./280gsm-cotton-oversized-t-shirt.html">Or start with the 280gsm flagship tee ${icon("arrow-right")}</a></section>
${contact}`;

for (const [name, body, title, description] of [
  [
    "index.html",
    home,
    "Bingo Garments | AW26 Streetwear & Private Label",
    "Discover twenty new AW26 long-sleeve tops, sweatshirts and hoodies. Build your collection with Bingo Garments wholesale and private-label development.",
  ],
  [
    "garments.html",
    catalog,
    "New AW26 Garment Collection | Bingo Garments",
    "Explore twenty AW26 garment-only product images, reference size guides and a multi-style inquiry list. Private-label garments from Guangzhou.",
  ],
]) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title><meta name="description" content="${description}" /><meta name="robots" content="index, follow" /><meta name="google-site-verification" content="GohRVRiXIyc-ETT24wVPRFC2hK0ZxReiS0LjBT9DJSA" /><meta name="theme-color" content="#171717" /><link rel="canonical" href="https://www.bingofabric.com/${name === "index.html" ? "" : name}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:type" content="website" /><meta property="og:image" content="https://www.bingofabric.com/assets/garments/aw26/still-life/collection.webp" /><link rel="icon" href="./favicon.ico" /><link rel="stylesheet" href="./showroom.css?v=20261022-v2" /><link rel="preload" as="image" href="./assets/garments/aw26/still-life/${name === "index.html" ? "collection" : "253"}.webp" /><script type="application/ld+json">${graph}</script></head><body class="showroom-site ${name === "index.html" ? "showroom-home" : "showroom-catalog"}" id="top">${header(name === "garments.html")}<main id="main">${body}</main>${footer}<script src="./assets/vendor/lucide.min.js"></script><script src="./config/marketing-config.js?v=20260715-p0-r2"></script><script src="./scripts/marketing-tracking.js?v=20261022-v2"></script><script src="./aw26-size-guides.js?v=20261024-still-life"></script><script src="./aw26-product-data.js?v=20261022-v2"></script><script src="./garment-data.js?v=20261022-quote-only"></script><script src="./garment-review-status.js?v=20261022-quote-only"></script><script src="./showroom.js?v=20261022-v2"></script><script src="./script.js?v=20260715-p0-r2"></script></body></html>\n`;
  const versioned = html
    .replace(
      /(\.\/)(aw26-product-data\.js|aw26-size-guides\.js|showroom\.js|showroom\.css)\?v=[^"']+/g,
      (_match, prefix, file) => `${prefix}${file}?v=${versions[file]}`,
    )
    .replace(
      "<select data-catalog-sort>",
      '<select data-catalog-sort aria-label="Sort styles">',
    );
  await fs.writeFile(path.join(root, name), versioned);
}
console.log("Built local showroom homepage and catalog.");

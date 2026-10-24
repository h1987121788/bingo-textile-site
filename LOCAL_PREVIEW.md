# AW26 Garment-Only Local Preview

Branch: `codex/aw26-still-life-preview`, based on the published P0 release `1fb8a65`.

Preview:

```sh
npm run preview:showroom
```

- Home: http://127.0.0.1:4173/
- New AW26: http://127.0.0.1:4173/garments.html
- Core: http://127.0.0.1:4173/garments.html?collection=core

The HTTP server binds to localhost. Local form submissions use the existing browser-only draft behavior. GA4 and Meta are disabled on localhost and file previews.

## Content updates

`aw26-product-data.js` is the source for AW26 names, specifications, categories, release dates, product covers, featured selections and published status. Both pages read it directly. Published styles sort by release date and curated order; a NEW label expires after thirty days. New unknown codes default to pending review. Set their verified publication state and release date explicitly when approved.

The first six published featured products appear on the homepage. The new collection remains the default catalog tab. The original forty-seven core styles remain in the second tab, with the existing specification gate preserved.

Rebuild after updating product data. The builder computes content hashes for the product script, interaction script and CSS, so changed content receives a fresh cache URL on the generated pages.

`scripts/build_showroom_pages.mjs` owns the homepage and catalog page templates. After changing a template, run `npm run build:showroom`. Shared visual styles and interactive behavior live in `showroom.css` and `showroom.js`.

All twenty AW26 covers now use existing garment-only product objects from the supplied supplier catalog. Sixteen objects were already exported as transparent SKU files; four wash-style objects were extracted directly from the source PDF. No garment was generated, recoloured or reshaped. Assets are optimized for web delivery under `assets/garments/aw26/still-life/`.

The homepage, AW26 directory, dialogs and inquiry thumbnails do not use the earlier AW26 model covers. Model-containing English boards are replaced in the dialog by accessible HTML reference-size tables from the already published catalog data. `aw26-size-guides.js` contains those tables. Commercial and verification boundaries remain unchanged.

To regenerate the derivative images after installing sharp:

```sh
node scripts/prepare_aw26_still_life.mjs /absolute/path/to/exported-product-objects
```

Lucide 0.468.0 is vendored locally in `assets/vendor/lucide.min.js`; the preview does not require an icon CDN.

The operator approved this garment-only design for production publication on 2026-10-25. Production releases use `origin/main`; localhost remains available for development without creating production leads. Confirm release completion from GitHub Pages and live resource/browser checks, not from the local preview alone.

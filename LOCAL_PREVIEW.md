# Local Showroom V2

Branch: `codex/showroom-v2-local`, based on `origin/main` at `a84d7e9`.

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

The twenty cover images are cropped from the existing operator-supplied AW26 model-image assets. They do not add new garment views or constitute specification, inventory or factory evidence. Full English sheets are available in each style dialog. The new hero combines two existing source-image crops, without generating models or garments.

To regenerate the derivative images after installing sharp:

```sh
node scripts/prepare_showroom_images.mjs /absolute/path/to/aw26/model-images
```

Lucide 0.468.0 is vendored locally in `assets/vendor/lucide.min.js`; the preview does not require an icon CDN.

The operator approved this design for production publication on 2026-10-22. Production is published through `origin/main`; this localhost preview remains available for development and does not submit real inquiries.

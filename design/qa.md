# AW26 Product-Only Preview QA

Date: 2026-10-24. Source of truth: `design/context.md` and the garment-only request.
Prototype: http://127.0.0.1:4173/

## Product-Only Checks

- All twenty AW26 covers use existing supplier garment-only product objects, not model crops or regenerated garments.
- The homepage hero, featured grid, categories, AW26 dialog and inquiry thumbnails use the new assets. Model-containing English boards are not linked from AW26 dialogs.
- All twenty detail images loaded in actual browser checks.
- Size guides contain real table headings and rows. Product / size switching preserves inquiry selection.
- The P0 category and automatic inquiry-type regression tests remain covered. Full validation includes 25 showroom tests.
- Browser checks at 375x667, 390x844, 768x1024, default desktop and 1920x1080 found no document-level horizontal overflow or incoherent image/text overlap. The next homepage section remains hinted below the hero.
- Mobile menu, collection navigation, product dialog, size-guide toggle and inquiry selection work. No browser console errors were captured in the checked states.
- Localhost disables marketing requests and real lead submission. This work did not submit a production lead or send a message.

## Current Scope

- Core sample verification, quote-only terms and the legacy flagship detail page remain unchanged. The scope is the homepage and AW26 presentation, not replacement of every historical image on every page.
- Size-guide values come from the existing English catalog; exact measurement methods and order specifications still require confirmation.
- Keyboard and visible-layout checks are not a full screen-reader or WCAG audit.
- These checks were performed on the local preview before deployment. The operator subsequently approved website publication on 2026-10-25; production verification is a separate release check.
- Screenshots are in the operations workspace at `reports/aw26-still-life-preview/`.

Verdict: LOCAL QA PASSED; PRODUCTION PUBLICATION APPROVED.

## Previous V2 QA (Historical)

Date: 2026-10-22. Source of truth: `design/context.md` and the requested local-only redesign.
Preview: http://127.0.0.1:4173/

Verdict: READY FOR LOCAL VISUAL REVIEW.

## Verified

- Homepage leads with AW26 imagery and a direct collection link, then six featured new-season styles.
- Catalog defaults to the twenty AW26 styles; the original forty-seven core styles remain in a separate collection tab.
- All twenty style dialogs were opened through the next-style flow, producing twenty unique titles and cover-image paths.
- Twenty cover files and twenty English sheets returned HTTP 200. All twenty-one new WebP assets passed a nonblank pixel-variance check.
- Photo / English-sheet switching, full-size image links, category filtering, search, empty result recovery, alphabetical and weight sorting were exercised in the browser.
- Hoodies filter returned only 253 and 252. Switching to core returned forty-seven styles with BG-GM-047 first.
- Inquiry selection survived navigation, appeared in the selection dialog and prefilled the form. Removing the final style cleared the automatically filled reference. Empty selection has a working catalog link.
- Empty required form fields remained invalid. A completed test brief produced the existing local-only saved-draft message; no real inquiry was submitted.
- Mobile menu expanded and closed. Native dialogs support Escape and explicit close buttons. The product close button remained at y=12px after scrolling the mobile dialog.
- Responsive layouts were inspected at 360, 390, 768, 1440 and 1920 pixels. No whole-page horizontal overflow was found. Category filters intentionally scroll horizontally on small phones. Final grid is one column on phones, two on tablets, three on desktop.
- Mobile homepage leaves the next section visible below the hero. Product images remain visible at phone size; forms use 16px input text on phones.
- The existing full `npm run validate` command passed, including catalog governance, metadata, webhook controls, outreach gates, reporting and tracking mappings. `git diff --check` passed.

## Evidence

Screenshots in ignored `reports/showroom-v2/`:
- `home-desktop.png`
- `home-mobile.png`
- `catalog-desktop.png`
- `catalog-mobile.png`
- `product-mobile.png`

## Boundaries

This QA was performed on localhost before the operator's production approval. Local analytics and Meta requests are disabled. The original receipt-based CRM handler is retained; this redesign's form walkthrough was local only, not a fresh production Google Sheet test. Publication was subsequently approved on 2026-10-22.

The original forty-six core styles still require supplier specification confirmation. Their unpublished specifications and detail boards remain gated. AW26 images and materials retain the source catalog's confirmation boundary.

Keyboard and responsive sanity checks do not constitute a complete assistive-technology accessibility audit.

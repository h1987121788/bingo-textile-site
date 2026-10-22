# Showroom V2 Local QA

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

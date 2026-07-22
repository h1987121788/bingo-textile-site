# Garment Product Review Gate

`data/garment_review_status.json` is the clean-repository review registry for public garment codes. `garment-review-status.js` is its sanitized browser mirror. Both deliberately contain no supplier IDs, source URLs, costs or private operating data.

## Current baseline

The original 46 public styles currently inherit these factual statuses:

- `sourceMapping: not_recorded`: no reviewed source-to-public SKU mapping is stored in this repository.
- `supplierSpecification: not_verified`: supplier composition, GSM, size and stock evidence is not recorded here.
- `physicalSample: verified`: the operator confirmed on 2026-07-16 that all current catalog styles correspond to real finished garment samples.
- `commercialPrice: formula_only_not_verified`: an internal formula exists, but margin, set contents, fees and final trade terms are not approved.
- `publicImage: standardized_catalog_visual`: public images use a standardized catalog presentation. Image-generation provenance remains recorded in `assets/garments/SOURCES.md`.

`BG-GM-047` has a dated product override from 2026-07-22:

- `supplierSpecification: verified`: 100% cotton, 280gsm and sizes S-2XL were confirmed by the operator.
- `physicalSample: verified`: operator-provided finished-sample photos were reviewed.
- `commercialPrice: verified`: USD 6.00 per piece, freight excluded.
- `publicImage: approved_sample_photo`: four operator-provided sample views and an English size chart are deployed.
- Finished-garment printing orders are accepted; the printing route and price remain artwork- and quantity-specific.

## Marking a field verified

Override a status only after evidence has been checked. The product entry must include:

```json
{
  "supplierSpecification": "verified",
  "reviewedAt": "2026-07-14",
  "evidence": ["Private operations record or approved sample reference"]
}
```

Do not commit private supplier IDs, source URLs, costs, customer files or credentials. Store those in the operations workspace and use a non-sensitive evidence reference here.

The website fails closed. It displays a current-quote request and hides composition, GSM, size and detail-board claims until the matching review fields are `verified`. Any verified override must also be copied into the sanitized `garment-review-status.js`; validation fails when the two effective statuses differ.

Run `npm run validate:catalog` after every catalog change. Use `npm run validate:catalog:strict` only when preparing a catalog in which every commercial field must be verified.

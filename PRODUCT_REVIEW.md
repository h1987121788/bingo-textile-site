# Garment Product Review Gate

`data/garment_review_status.json` is the clean-repository review registry for public garment codes. `garment-review-status.js` is its sanitized browser mirror. Both deliberately contain no supplier IDs, source URLs, costs or private operating data.

## Current baseline

All 46 public styles currently inherit these factual statuses:

- `sourceMapping: not_recorded`: no reviewed source-to-public SKU mapping is stored in this repository.
- `supplierSpecification: not_verified`: supplier composition, GSM, size and stock evidence is not recorded here.
- `physicalSample: not_verified`: no approved physical-sample evidence is recorded here.
- `commercialPrice: formula_only_not_verified`: an internal formula exists, but margin, set contents, fees and final trade terms are not approved.
- `publicImage: ai_style_reference`: the public image is an AI style reference, not product photography.

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

# Garment Product Review Gate

`data/garment_review_status.json` is the clean-repository review registry for public garment codes. It deliberately contains no supplier IDs, source URLs, costs or private operating data.

## Current baseline

All 46 public styles currently inherit these factual statuses:

- `sourceMapping: not_recorded`: no reviewed source-to-public SKU mapping is stored in this repository.
- `supplierSpecification: not_verified`: supplier composition, GSM, size and stock evidence is not recorded here.
- `physicalSample: not_verified`: no approved physical-sample evidence is recorded here.
- `commercialPrice: formula_only_not_verified`: the public formula is present, but margin, set contents, fees and final trade terms are not approved here.
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

Run `npm run validate:catalog` after every catalog change. Use `npm run validate:catalog:strict` only when preparing a catalog in which every commercial field must be verified.

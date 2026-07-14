# Social Media Acquisition Automation

This document defines the guarded social-content workflow for Bingo Garments / Bingo Textile.

Status as of 2026-07-14: Facebook, Instagram, and X publishing are all paused by the operator's latest instruction. Drafting and dry-run validation are allowed; no channel may publish until the operator explicitly re-enables it in a reviewed change.

Runtime guard:

- `scripts/facebook_publish.js` requires both `socialPublishing: true` and `facebookPublishing: true`.
- `scripts/instagram_publish.js` requires both `socialPublishing: true` and `instagramPublishing: true`.
- Dry runs are allowed only for validation and must not publish posts.

## Objective

Prepare accurate garment-first content that can drive qualified streetwear brand prospects to the website and WhatsApp Business after manual approval.

Positioning:

> Private-label streetwear sourcing and development coordination from Guangzhou. Send a garment reference, tech pack, quantity and target market so feasibility and a sample route can be checked before quotation.

Primary CTA:

> Send a garment reference, tech pack or product link using the clean WhatsApp link in `config/social-contact.json`.

Secondary CTA:

> View garment style references: https://www.bingofabric.com/garments.html

## Contact Information Gate

Contact information is a hard publishing gate.

Status as of 2026-06-09: contact information confirmed by the user. Validation remains mandatory before every social post and outreach email.

Before every publishing run:

1. Read `config/social-contact.json`.
2. Run `node scripts/validate_social_contacts.js`.
3. Publish only when the script returns `CONTACT CHECK PASSED`.
4. If the script fails, do not publish. Save a Chinese report under `reports/` explaining that contact information is not confirmed.

Rules:

- Do not reuse old phone, WeChat, email, or WhatsApp values from previous reports, screenshots, drafts, or environment defaults.
- Do not invent contact details from memory.
- The final caption must use only the confirmed values in `config/social-contact.json`.
- Public Facebook captions must use clean contact links only: no tracking query strings, no WhatsApp prefilled query, and no URL-encoded text.
- Every Facebook caption must include this clean contact block:

```text
Contact Bingo Textile:
Website: https://www.bingofabric.com/
WhatsApp: https://wa.me/8613827719946
Phone: +86 13827719946
WeChat: 13827719946
Email: 57317996@qq.com
```

- The website must remain `https://www.bingofabric.com/`.
- If `.env.social.local` has `WA_BUSINESS_URL` or `SITE_URL`, they must match `config/social-contact.json` before publishing.

## Target Audience

Included:

- Small and mid-size streetwear brands
- Independent apparel brands
- Product developers, founders, sourcing managers, and creative directors
- Regions: US, Canada, UK, EU, Japan, South Korea, Singapore, Australia, New Zealand
- Product needs: heavyweight tees, hoodies, sweatshirts, polos, rib trims, jersey basics, french terry, interlock, spacer/scuba, stretch jersey

Excluded:

- Lowest-price bulk buyers
- POD-only sellers without fabric development needs
- Buyers asking only for commodity blank apparel
- Low-end markets that do not fit margin or service positioning

Do not publicly say that some regions are excluded. Filter by targeting, lead score, and manual qualification.

## Dormant Timing Reference

No daily publishing job is active. The times below are planning references only if the operator later re-enables a channel through a reviewed configuration change. Use Asia/Shanghai as the control timezone.

- APAC post: 08:30 China time
  - Japan/Korea: 09:30
  - Singapore: 08:30
  - Australia east coast: 10:30 standard time / 11:30 daylight saving time
  - New Zealand: 12:30 standard time / 13:30 daylight saving time
- EU/US post: 21:00 China time
  - London summer: 14:00
  - Central Europe summer: 15:00
  - New York summer: 09:00
  - Los Angeles summer: 06:00

Possible future cadence after explicit reactivation:

- Prepare up to 2 reviewed drafts per day, one for APAC and one for Europe/North America.
- Publishing remains a separate approved action; generating a draft never authorizes posting.
- A future post should use one new topic-matched image and produce a completion report.
- Public copy should be in English; operator feedback reports should be in Chinese.

## Platform Publishing Path

Use official APIs or official scheduling products. Do not use browser bots, fake accounts, automated login scripts, automated comments, automated follows, or automated DMs.

### Instagram

Instagram is inactive for automatic publishing.

Current rule:

- Do not run `scripts/instagram_publish.js` in daily automation.
- Do not generate Instagram captions as required deliverables.
- Do not fail a daily Facebook publishing run because Instagram permissions are missing.
- Keep the Instagram profile aligned manually or through official tools only.
- Re-enable Instagram only after Meta grants valid Instagram publishing permissions and the user explicitly asks to turn it back on.

Future requirements before reactivation:

- Instagram professional account
- Meta app
- Required publishing permissions
- Valid access token
- Media hosted on a public URL
- Image posts should use supported image formats

Relevant official path:

- Create media container: `/<IG_ID>/media`
- Publish media container: `/<IG_ID>/media_publish`
- Check publishing limit: `/<IG_ID>/content_publishing_limit`

Local publishing helper:

- Use `scripts/instagram_publish.js` for Instagram publishing.
- The helper loads `.env.social.local`, verifies the account, checks publishing quota, creates the media container, polls container status, and publishes.
- The helper should use Meta Facebook Graph IG User publishing first with `META_PAGE_ACCESS_TOKEN` and `INSTAGRAM_PROFESSIONAL_ACCOUNT_ID`.
- The legacy `graph.instagram.com` token path may remain as a fallback only when the Meta Page token path is not configured.
- If local DNS maps `graph.instagram.com` to `198.18.*` and TLS fails, the legacy path falls back to a real Meta IP while keeping `graph.instagram.com` as Host/SNI.
- Example:

```bash
node scripts/instagram_publish.js \
  --image-url https://www.bingofabric.com/assets/products/rib-knit.jpg \
  --caption-file /tmp/bingo-instagram-caption.txt
```

### Facebook

Use Facebook Pages API for the Facebook Page, not personal profile posting.

Requirements:

- Facebook Page
- Meta app
- Page access token
- Page user with content creation permissions
- Required permissions such as `pages_manage_posts` and `pages_read_engagement`

Relevant official path:

- Text/link post: `POST /<PAGE_ID>/feed`
- Photo post: `POST /<PAGE_ID>/photos`

Local publishing helper dry-run example:

```bash
node scripts/facebook_publish.js \
  --image-url https://www.bingofabric.com/assets/products/plain-jersey.jpg \
  --caption-file reports/facebook-caption-example.txt \
  --media-source-url https://www.bingofabric.com/assets/products/plain-jersey.jpg \
  --license-status "Owned Bingo Textile website product image" \
  --relevance-note "Plain jersey texture matches a jersey sourcing and sampling post." \
  --dry-run
```

### X

X is not part of the active publishing scope.

- Keep the X profile aligned with the brand manually if needed.
- Do not call X API in daily automation.
- Do not require X credits for the current Facebook publishing flow.

## Information Collection Rules

Allowed source types for topic discovery:

- Official RSS feeds and news pages from fashion/textile/trade publications
- Public brand launch pages and press releases
- Public trend reports with citation
- Your own product/spec notes
- Your own website pages and product images
- Licensed stock images, Creative Commons/commercial-use images, official media-kit images with permission, or generated images
- Search result snippets only as discovery, then verify source pages before using the idea

Important:

- Use internet content only to identify a topic or buyer insight.
- Rewrite every post as original English copy for Bingo Textile.
- Do not copy source text into posts.
- Do not publish unlicensed fashion/editorial images found online.
- Internet-sourced images are allowed only when the source page and license/permission status are verified and recorded in the report.
- A direct image URL is not enough; record the source page URL, license/permission status, direct media URL, and why the image matches the post topic.

Disallowed:

- Scraping Instagram/Facebook/X/LinkedIn profiles or posts with automation
- Copying article text directly
- Downloading and reposting copyrighted fashion/editorial photos from the web
- Using competitor brand photos as if they are our product
- Posting unverifiable claims
- Reusing an image URL or media asset already listed in `data/social_media_history.jsonl` or recent `reports/`
- Automated likes, follows, comments, DMs, or mass tagging

Working rule:

Use the internet for topic discovery, then write an original post from the buyer's point of view. Every draft should be about garment development, sample approval, private-label ordering, material choice, or sourcing risk.

Fashion and brand references are allowed only as trend context:

- You may reference public trend pages, official brand product pages, lookbooks, runway recaps, and retailer product pages to identify garment direction.
- You may mention brand names only as market examples, such as "rugby shirts seen across streetwear drops" or "workwear-inspired fleece and jersey layers".
- Do not imply Bingo Textile supplies, works with, is endorsed by, or can reproduce any named brand.
- Do not say "same as Supreme/Stussy/Aime Leon Dore/Fear of God" or similar copycat wording.
- Translate every brand reference into a garment-development angle: silhouette, measurement, construction, wash, decoration, material structure, rib recovery, or trim matching.
- Record source URL, garment type, visible fabric cues, image/license status, and why it supports the post topic in the report.

## Approved Content Themes

Rotate these themes:

1. Garment development
   - How to brief an oversized tee fit
   - What a hoodie sample should prove before bulk
   - Why wash approval must include post-wash measurements
   - How decoration placement changes sample approval

2. Buyer checklist
   - What to send before asking for a quote
   - How to brief garment development when you cannot visit China
   - How to organize reference images, size specs and quantity by color

3. Product and sample application
   - Boxy tee fit, collar and material balance
   - Heavyweight hoodie silhouette and wash checks
   - Vintage wash and garment dye sample risks
   - Stretch top recovery and size-spec checks

4. New garment direction
   - Current catalog style reference
   - Known and still-unverified fields
   - Intended fit or product use
   - Physical-sample requirement
   - CTA to WhatsApp

5. Development coordination
   - Send a garment photo, link or tech pack
   - Convert the reference into a fit, material, decoration and quantity brief
   - Suitable for brands that cannot visit China

6. Fashion / streetwear trend bridge
   - Connect public fashion and streetwear trends to garment-development decisions
   - Examples: rugby shirts, knit polos, heavyweight boxy tees, cropped hoodies, vintage-wash sweats, mesh jerseys, workwear fleece, fitted stretch tops
   - Reference brands, retailers, or fashion publications only as trend context
   - Explain what fit, construction, wash or material detail a buyer should check before sampling
   - CTA: send a reference photo, garment link, or tech pack for a development brief

Suggested content mix:

- 40% garment development and buyer checklist
- 25% fashion / streetwear trend bridge
- 20% product and sample application
- 15% material education or sourcing support

## Content Quality Standard

Every draft prepared for future review must pass the quality gate below. A passing score does not authorize publication; the channel controls must also be explicitly re-enabled by the operator.

Minimum score: 80 / 100.

Core content rule:

- Every draft must be about a garment-development problem, sampling risk, material decision, or buyer decision.
- Do not publish product-picture-only posts.
- The image supports the fabric topic; it is not the topic by itself.
- The hook should name the decision or risk first, such as fit, measurements, shrinkage, wash result, collar balance, decoration placement, GSM, recovery, or sample approval.
- The final copy must include the clean website and WhatsApp lines from `config/social-contact.json`.
- Use only 2-3 focused hashtags.

Scoring:

- Buyer relevance: 25 points
  - Speaks to apparel brands, product developers, founders, sourcing managers, or creative directors
  - Names a real development problem such as shrinkage, GSM choice, hand feel, rib recovery, sample matching, MOQ, or quotation clarity
  - Avoids generic textile slogans
- Development insight: 20 points
  - Gives one useful garment, sample, or material decision rule
  - Connects trend language to an actual development checkpoint
  - Avoids unsupported technical claims
- Click intent: 20 points
  - Uses one clear CTA
  - Includes a reason to click or message now, such as sample matching, quote preparation, or reference fabric matching
  - Uses the clean public website and WhatsApp links from `config/social-contact.json`
- Visual quality: 20 points
  - Uses one new relevant owned product image, generated image, or licensed image
  - Image must visually match the post topic
  - Image source, license/permission status, and relevance note are recorded
  - No random scraped fashion/editorial images
- Brand consistency: 15 points
  - English is direct, professional, and buyer-facing
  - Mentions Bingo Textile naturally, not in every sentence
  - Avoids spammy hashtags, exaggerated claims, and hard-selling language

Reject automatically if any of these appear:

- Copyrighted or unlicensed web image
- Reused image URL, old media asset, or image already present in `data/social_media_history.jsonl`
- Copied article text
- Claims such as "best", "guaranteed", "certified", or exact performance numbers without source proof
- Automated like/follow/comment/DM language
- Too many hashtags or repeated CTA links
- Product photo or display copy without a garment-development, sample, or material decision
- Catalog imagery presented as a physical sample, verified stock, factory proof, or completed production
- Brand names used as endorsement, customer proof, or copycat language

## CTR-Oriented Post Structure

Use this structure for most posts:

1. Hook: one buyer problem or trend translation
2. Insight: one practical fabric decision
3. Proof of fit: what Bingo Textile can help match or quote
4. CTA: send specs, reference photo, or tech pack for sample and quote
5. Clean contact block

Good hook examples:

- "Before sampling a heavyweight tee, check the fabric structure, not only GSM."
- "A rib collar can make or break a knit polo sample."
- "French terry hoodies need different fabric choices for boxy, oversized, and vintage-wash fits."
- "Stretch jersey is not only about spandex percentage."
- "A streetwear rugby shirt trend starts with the collar rib and body fabric choice."
- "When a brand moodboard shows vintage sweats, fabric finishing becomes the sample risk."

Weak hook examples:

- "We are a professional fabric supplier."
- "High quality knit fabric from China."
- "Contact us for best price."

CTA options:

- "Send your reference fabric or tech pack for sample matching."
- "Send specs for jersey, rib, French terry, interlock, or stretch knit options."
- "Need a quote? Send GSM, composition, width, color, and target garment."

Do not use more than one primary CTA in the same post.

## Image Quality Standard

Every Facebook automation run must include one image. The image is a hard publishing gate.

New image rule:

- Do not publish without an image.
- Do not reuse any image URL, local asset, or media file already used in a previous Facebook post.
- Before selecting media, check `data/social_media_history.jsonl` and recent `reports/` for prior image URLs.
- If a matching owned image has already been used, select a new licensed/generate image instead of repeating it.
- If no new compliant image is available, do not publish automatically; save a Chinese report explaining the media block.

Preferred image types:

- Licensed or generated streetwear-style model photo where the garment silhouette clearly supports the fabric topic
- Close-up product fabric texture with visible knit structure
- Fabric swatches with measuring tape, color card, or spec sheet
- Clean apparel development flat lay using owned or generated visuals
- Simple sample-room or sourcing-workflow image
- Licensed apparel/fabric lifestyle image from the web when the license/permission is verified and the image supports the topic

Avoid:

- Generic model photos that do not show garment fabric, silhouette, drape, texture, or construction
- Dark, blurry, over-cropped images
- Fashion editorial or brand campaign images from the web
- Images that imply Bingo Textile made a garment or collection unless true
- Reusing any old image already used by the automation
- Logos, hangtags, model faces, or recognizable campaign images from named brands unless explicitly licensed
- Photos from named streetwear brands, retailer lookbooks, campaign shoots, runway pages, or social media accounts unless the image license explicitly allows reuse in commercial posts

Image rotation rule:

- Do not use the same image URL or media asset again once it has been published.
- Rotate between jersey, rib, French terry, interlock, stretch, mesh, and spacer/scuba topics.
- If no suitable unused owned image exists, use a generated image or verified licensed web image and record it in the report.
- After successful publishing, append the used media details to `data/social_media_history.jsonl`.

Streetwear model photo trial:

- For the next suitable Facebook run, try a streetwear-style model image instead of another fabric-only close-up.
- Preferred safe sources: licensed stock photos, commercial-use photo libraries, own model photos, or generated images.
- The model image should show a relevant garment type such as boxy tee, hoodie, sweat shorts, knit polo, mesh jersey, or fitted stretch top.
- The image must not contain visible brand logos, recognizable trademark graphics, hangtags, store names, or named-brand campaign styling.
- Do not say or imply Bingo Textile supplied, made, or can copy the garment in the photo.
- The caption must translate the image into a fabric-sourcing point, such as GSM, rib recovery, shrinkage, drape, loop density, surface pilling, opacity, stretch recovery, or print support.
- Record source URL, direct media URL, license/permission status, model/photo release status if available, and relevance note in the report.

Recommended generated image style:

```text
Clean studio flat lay for apparel fabric sourcing: knit fabric swatches, rib collar trim, measuring tape, color card, and tech pack sheet on a neutral table. No logos, no people, realistic textile texture, premium sourcing mood, vertical 4:5 composition.
```

Fashion-trend generated image style:

```text
Editorial studio flat lay inspired by contemporary streetwear development: blank heavyweight tee sample, rib collar swatches, French terry fabric, jersey roll, color cards, measuring tape, and tech pack pages on a clean table. No logos, no brand names, no people, realistic textile texture, premium apparel sourcing mood, vertical 4:5 social media composition.
```

Streetwear model generated image style:

```text
Realistic streetwear lookbook-style photo of a model wearing a blank oversized hoodie, boxy tee, sweat shorts, or knit polo in a clean urban studio setting. No logos, no brand names, no trademark graphics, no readable text, no hangtags, natural fabric texture visible, premium apparel development mood, vertical 4:5 social media composition.
```

## Post Format

### Facebook

Length:

- 80-140 words
- 2-3 hashtags
- Clear CTA

Structure:

1. Hook: fabric selection problem or sampling risk
2. Buyer problem
3. Fabric insight or decision rule
4. What Bingo Textile can do
5. Clean contact block
6. 2-3 focused hashtags

Example:

```text
Heavyweight tees are not just about higher GSM.

For a boxy streetwear fit, the fabric needs enough body, clean surface, and stable shrinkage after washing. A 260gsm double yarn jersey can feel more premium than a loose 300gsm fabric if the yarn, knitting tension, and finishing are right.

If you are developing a tee drop and cannot visit China, send us your reference fabric or tech pack. We can help match structure, hand feel, GSM, and sample options.

Contact Bingo Textile:
Website: https://www.bingofabric.com/
WhatsApp: https://wa.me/8613827719946
Phone: +86 13827719946
WeChat: 13827719946
Email: 57317996@qq.com

#knitfabric #heavyweighttee #fabricsourcing
```

## Media Rules

Preferred media priority:

1. Licensed or generated streetwear-style model photos that clearly match the fabric topic
2. New photos taken in warehouse/sample room after they are uploaded to a public URL
3. Generated apparel/fabric lifestyle images hosted on a public URL
4. Licensed web images with source page, license/permission status, and attribution recorded
5. Unused own public product images from `https://www.bingofabric.com/assets/products/`
6. Own local product photos from `assets/products` only after they are uploaded to a public URL

Current local assets:

- `https://www.bingofabric.com/assets/products/plain-jersey.jpg`
- `https://www.bingofabric.com/assets/products/french-terry.jpg`
- `https://www.bingofabric.com/assets/products/interlock.jpg`
- `https://www.bingofabric.com/assets/products/rib-knit.jpg`
- `https://www.bingofabric.com/assets/products/stretch-plain.jpg`
- `assets/products/plain-jersey.jpg`
- `assets/products/double-yarn-plain.jpg`
- `assets/products/streetwear-terry-hoodie.jpg`
- `assets/products/stretch-plain.jpg`
- `assets/products/rib-knit.jpg`
- `assets/products/french-terry.jpg`
- `assets/products/interlock.jpg`
- `assets/products/scuba-spacer.jpg`
- `assets/products/sports-mesh.jpg`
- `assets/products/single-jersey.jpg`
- `assets/social/blue-gray-knit-texture.jpg`
- `assets/social/bingo-textile-x-avatar.png`

Do not automatically pull random clothing photos from the internet. Use internet images only when license/permission is verified and stored with attribution. Do not use old owned images already listed in `data/social_media_history.jsonl`.

## Lead Tracking

Do not show tracking parameters or WhatsApp prefilled text in public Facebook captions. Long query strings and URL-encoded words make the post look broken after Facebook wraps the text.

Public captions must show only:

- `Website: https://www.bingofabric.com/`
- `WhatsApp: https://wa.me/8613827719946`
- `Phone: +86 13827719946`
- `WeChat: 13827719946`
- `Email: 57317996@qq.com`

Tracking metadata may be generated and stored in the Chinese report only. Do not paste tracking URLs into the public post text.

Internal report fields may include:

- `campaignSource: facebook`
- `campaignSlot: apac` or `campaignSlot: eu_us`
- `campaignTopic: short_snake_case_topic`

Recommended fields in the completion report:

- Run time
- Region slot
- Target sub-region(s) considered
- Topic source
- Fashion / brand reference links when used
- Garment type and visible fabric cues from references
- Image source, license status, or generated prompt
- Media history check result
- Content quality score
- Buyer relevance score
- Fabric insight score
- Click intent score
- Visual quality score
- Brand consistency score
- Generated post text
- Public media URL used
- Reason for media selection
- CTA used
- Clean public contact block used
- Internal tracking metadata generated for report only
- Facebook status and post URL/ID
- Instagram status: skipped by current Facebook-only policy
- Errors
- Next suggested action
- Next content test idea

## Future Automation Flow

This flow is documentation only while publishing controls are off. Reaching step 7 in a dry run does not authorize step 8.

1. Fetch sources
   - Use approved RSS/news/search sources
   - Extract 3-5 candidate topics
   - Reject copyrighted photo reuse

2. Choose content angle
   - Score by target audience fit
   - Prefer topics connected to existing product assets

3. Verify contact information
   - Run `node scripts/validate_social_contacts.js`
   - If it fails, skip publishing and save a Chinese report

4. Generate platform copy
   - Facebook copy only
   - Add the clean public contact block
   - Do not include tracking links, WhatsApp prefilled query strings, or URL-encoded text in the public caption
   - Generate tracking metadata only for the internal Chinese report when needed
   - Keep public post text in English

5. Select image
   - Check `data/social_media_history.jsonl` and recent `reports/`
   - Select one new image that directly matches the post topic
   - Prefer new owned photos, generated images, or verified licensed web images
   - Record source page URL, direct media URL, license/permission status, and relevance note
   - Do not publish random scraped web images or old repeated images

6. Compliance check
   - No unsupported claims
   - No copied article text
   - No unauthorized image
   - No reused image
   - No spam language
   - Contact information matches `config/social-contact.json`
   - Public contact block uses clean URLs and no query strings
   - Quality score is at least 80 / 100

7. API preflight
   - Run Meta token check with `node scripts/meta_token_refresh.js --check`
   - Run Facebook dry-run with `scripts/facebook_publish.js --dry-run` and the required media source, license status, relevance fields, and clean caption contact block
   - If token, permission, account, quota, DNS, or media URL checks fail, skip publishing and save a Chinese report

8. Publish
   - Proceed only after a new explicit operator instruction and reviewed channel-control change
   - Use official platform API
   - Use `scripts/facebook_publish.js` for Facebook Page
   - Pass `--media-source-url`, `--license-status`, and `--relevance-note`
   - Store response IDs

9. Feedback
   - Send a Chinese report to operator
   - Save daily log under `reports/`
   - Include the quality score and what should be tested next

## Required Credentials Before Publishing

The system cannot publish until these are provided through environment variables or a secure secret store:

```text
META_APP_ID=
META_APP_SECRET=
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_PAGE_ACCESS_TOKEN_SAVED_AT=
META_PAGE_ACCESS_TOKEN_EXPIRES_AT=
META_LONG_LIVED_USER_ACCESS_TOKEN=
META_LONG_LIVED_USER_ACCESS_TOKEN_SAVED_AT=
META_LONG_LIVED_USER_ACCESS_TOKEN_EXPIRES_AT=
WA_BUSINESS_URL=https://wa.me/8613827719946
SITE_URL=https://www.bingofabric.com/
```

Never commit real tokens into the repository.

`WA_BUSINESS_URL` must match the confirmed WhatsApp URL in `config/social-contact.json`.

## Long-Lived Meta Token Workflow

Use a long-lived Meta User token to generate the Page token used by Facebook Page publishing.

When the current Page token expires:

1. Generate a fresh short-lived User token in Meta Graph API Explorer or Meta login flow.
2. Include these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
3. Convert and save it locally:

```bash
pbpaste | node scripts/meta_token_refresh.js --stdin --save
```

The script:

- Exchanges the short-lived User token for a long-lived User token.
- Reads `/me/accounts` or directly reads `META_PAGE_ID` and extracts the Page access token.
- Updates `.env.social.local` without printing token values.
- Stores saved time and expiration metadata.

Preflight check:

```bash
node scripts/meta_token_refresh.js --check
```

If this check fails, do not publish. Regenerate a short-lived User token and run the conversion again.

X credentials may remain in a local secret file for future use, but they are not required and should not be loaded by the current publishing job.

## Paused Implementation

No automatic publishing schedule is active. The former Facebook schedule is retained below only as a planning reference and must not be installed or run while the total-control switches are off:

- Former APAC planning slot: 08:30 China time for Japan, South Korea, Singapore, Australia, and New Zealand.
- Former EU/US planning slot: 21:00 China time.
- Any future run requires a new explicit operator instruction, reviewed content and a reviewed `config/automation-control.json` change.
- A permitted dry run may validate one English photo-post draft but must not call a publishing endpoint.
- Each run must use one new relevant image and must not reuse media listed in `data/social_media_history.jsonl`.
- Each run records the exact text, source links, media URL, image source/license/relevance, platform IDs/URLs, API status, errors, and next action in `reports/`.
- Successful publishes append the media URL and post ID to `data/social_media_history.jsonl`.
- If a platform API call fails, do not use browser posting as a fallback. Save the error in the report and notify the operator.

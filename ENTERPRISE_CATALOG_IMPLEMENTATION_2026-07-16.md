# Enterprise catalog implementation

Implemented on 2026-07-16 without changing the existing authentication, payment, checkout, order, or seller-approval workflows.

## Delivered

- 966 unique enterprise catalog nodes across Gaming, Social Media, Email Accounts, AI, Software, Digital Goods, and Professional Services.
- Unlimited nested category selection in Seller Center; sellers select predefined values and cannot type arbitrary categories.
- Category metadata for image, icon, banner, SEO, keywords, featured/trending flags, display order, and active state.
- Category-specific seller attributes for game/server/region/platform, social accounts, email stock, AI product types, and software licenses.
- Flexible JSON-backed product translations with English and Simplified Chinese authoring and automatic buyer-language display.
- Rich product data: gallery/video fields, brand, platform, region, country, server, language, delivery method, condition, stock type, duration, warranty, refund policy, stock/order limits, SKU, tags, sale/wholesale pricing, coupons, and delivery flags.
- Seller actions: edit, preview, clone, pause, activate, hide, remove, submit, bulk publish/pause/hide/out-of-stock/remove, CSV import as drafts, and CSV export.
- Recursive catalog filtering, enriched product facts, sticky buy box, responsive seller form, and premium catalog/seller interface styles.
- Additive Prisma migration at `prisma/migrations/202607160001_enterprise_catalog/migration.sql`.

## Seller and discovery refinement

- Replaced the oversized homepage category wall with seven main-category controls, one focused subcategory grid, and clear **View all** links.
- Made **My products** the central list for selecting and managing every seller listing.
- Replaced the prompt-style edit action with a responsive full-page editor covering category path, English and Chinese content, all prices, stock, specifications, policies, media, and delivery inventory.
- Simplified new product creation to category, image, English/Chinese content, price, stock, and delivery; secondary fields now live in an optional advanced section.
- Removed phone number, street address, postal/ZIP code, and document number questions from the seller application while preserving the existing approval data structure.

## Verification

- Production web build: passed.
- API TypeScript build: passed.
- Prisma schema validation: passed.
- Automated tests: 11 passed, 0 failed.
- Catalog integrity: 966 unique slugs, 0 orphaned parent references.

Run `npm run prisma:migrate` against the deployment database before starting the updated API.

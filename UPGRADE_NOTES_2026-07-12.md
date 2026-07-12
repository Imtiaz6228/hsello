# Marketplace dashboard and catalog upgrade

## Implemented

- Separate language and currency controls on desktop and mobile.
- Mobile hamburger contains full language and currency selectors.
- Buyer, seller, and admin dashboard sections use working URL hashes so tabs remain open after refresh and can be linked directly.
- Admin category command center can create main categories and subcategories, set ordering, and hide/show entries.
- Homepage categories now come from the marketplace category API instead of a hard-coded-only catalog.
- Seller product creation uses separate admin-managed category and subcategory selectors.
- Seller Center redesigned with Overview, Products, Orders, and Store Branding workspaces.
- Real seller logo and banner image uploads added to the API and dashboard.
- Product image preview, upload, replacement, delivery-file upload, and inventory upload workflows polished.
- Admin, seller, and buyer dashboard visual styling upgraded with brighter gradients, cards, responsive navigation, and mobile layouts.

## Production upload persistence

For Railway, attach persistent volumes at:

- `/app/uploads` for seller logos, banners, and public product images.
- `/app/private-uploads` for private delivery files.

Set `UPLOAD_DIR=/app/uploads` and `PRIVATE_UPLOAD_DIR=/app/private-uploads`.

## Install and build

```bash
npm install
npm run prisma:generate
npm run build
```

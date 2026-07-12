# HSello smooth marketplace fixes — 12 July 2026

## Completed

- Added a dedicated confirmation-based sign-out page and visible sign-out links for buyer, seller, admin, desktop, and mobile navigation.
- Added Sign in and Register actions to the mobile hamburger menu.
- Rebuilt the admin dashboard layout for desktop, tablet, and mobile.
- Added administrator catalog product creation with a product image, complete category path, pricing, delivery details, inventory, draft/publish behavior, and an official verified marketplace store profile.
- Added administrator category creation and visibility controls with a supported three-level tree:
  - Main category
  - Platform / subcategory
  - Listing type, such as New, Old, With audience, With content, or Business ready
- Seeded common third-level choices under social platforms and kept admin-hidden categories hidden during future seeding.
- Rebuilt seller product creation around the same three-step category path.
- Seller creation now requires a valid active category path and a clear product image, validates seller approval, and returns understandable errors.
- Added seller product-image replacement, delivery-file upload, manual inventory, and inventory-file upload controls.
- Added seller logo and banner file uploads with clear previews and public storefront display.
- Updated marketplace catalog filtering so selecting a parent category includes products inside all of its descendants.
- Made language and currency independent persistent preferences. Added USD, CNY, TWD, RUB, VND, and PKR display currencies.
- Updated public marketplace/store pricing to react to the selected currency.
- Served product, logo, and banner media from the same-origin `/uploads` route, with Vite and Vercel proxy support.
- Changed product/store image presentation to preserve the whole image with clear contained previews rather than destructive cropping.
- Added responsive bottom navigation and simplified layouts for admin and seller dashboards on small screens.

## Validation completed

- `npm run build:web` passes successfully.
- Modified API route and service files pass TypeScript syntax transpilation checks.
- ZIP archive integrity is tested before delivery.

## Deployment

1. Run `npm install` or `npm ci` on the deployment platform.
2. Run `npm run prisma:generate`.
3. Run `npm run build`.
4. Run database migrations with `npm run prisma:migrate`.
5. Configure persistent volumes for `/app/uploads` and `/app/private-uploads` on Railway so product and store images survive redeployments.

No database schema migration was added for this upgrade; the existing category parent relationship supports the new three-level flow.

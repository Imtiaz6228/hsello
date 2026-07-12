# Role dashboard and seller product fixes

## Seller product submission

- Fixed the hidden SEO-length mismatch that caused valid-looking listings to fail with “Please fix the highlighted fields.”
- Product titles and summaries are now trimmed and safely limited when copied into SEO metadata.
- Added clear client-side checks for the category path, listing type, image, title, descriptions, and minimum price.
- API validation now returns the exact field and reason instead of only a generic message.
- Seller-created products continue to use only active admin-managed categories.

## Role separation

- Customer accounts open the buyer dashboard.
- Approved seller accounts open Seller Studio.
- Staff accounts open the admin dashboard.
- Only customers can open, close, or demand a refund through a dispute.
- Sellers can reply in order chats and offer refunds but cannot open a dispute.
- Admins review and resolve buyer disputes; they do not receive buyer dispute controls.
- Removed the seller category-creation endpoint. Category creation and editing remain admin-only.

## Buyer dashboard

- Kept buyer-specific orders, downloads, invoices, chats, disputes, reviews, support, wallet, profile, and seller-application access.
- Buyer wallet now presents top-up methods for card, crypto, PayPal, bank transfer, Easypaisa, and JazzCash.
- Removed seller withdrawal and frozen-earnings controls from the buyer wallet experience.

## Admin catalog

- Admin and super-admin accounts can create new top-level categories, subcategories, and listing types.
- New active categories flow into marketplace navigation and seller product creation.

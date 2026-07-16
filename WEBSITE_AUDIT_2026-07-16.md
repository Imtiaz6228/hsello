# HSello website audit — 16 July 2026

## Scope and confidence

Reviewed the complete React/Express source, public and protected route map, catalog hierarchy, product/store/cart/auth flows, responsive CSS, SEO generation, accessibility controls, API filtering, payment/top-up logic, automated tests, and production build output.

Public routes reviewed: homepage, catalog, category, product, store, cart, blog/article, about, contact, all legal/policy pages, sign-in, registration, password recovery/reset, email verification, and 404. Protected flows reviewed in source: checkout/confirmation, account/orders/support, seller application/studio, and admin operations/earnings.

Limit: authenticated, payment-provider, email, upload, and real-database end-to-end behavior still requires a configured staging environment. The workspace browser could not reach the local preview, so final device screenshots and real Core Web Vitals must be completed after deployment.

## Executive assessment

The product has a strong feature base, clear route separation, lazy-loaded pages, useful trust/legal content, responsive layouts, semantic forms, SEO helpers, and a broad operations system. It was not production-ready because category generations conflicted, the homepage filtered full category paths incorrectly, crypto top-up verification was unsafe, several storefront/ranking controls were placeholders, and the homepage hero consumed too much mobile space.

This revision fixes the highest-risk items that can be corrected safely without a production database. The most important remaining decision is policy alignment: the catalog advertises account, follower, bot, boosting, and credential-adjacent products while the legal policy expressly prohibits them.

## Prioritized findings

| Priority | Area | Problem and user impact | Best solution | Status |
| --- | --- | --- | --- | --- |
| Critical | Crypto top-ups | A transaction was marked network-verified when an explorer merely returned a hash. Destination, token contract, amount, confirmations, and hash reuse were not validated. Any unrelated transaction could be credited. | Keep proofs pending until a provider integration validates every payment property and prevents replay. | Fixed safely: unsafe auto-verification disabled; manual review remains. |
| Critical | Secrets/payment config | Production-looking wallet addresses and a predictable admin password example were committed. This creates deployment mistakes and credential risk. | Configure a separate address per network using secrets; never ship a usable credential default. | Fixed. |
| Critical | Catalog policy | `enterpriseCatalog` promotes accounts, followers, likes, bots, boosting, verified accounts, and similar goods, while Prohibited Products bans account trading, credentials, bots, spam, and fake engagement. Users cannot know what is permitted; payment and platform partners may reject the marketplace. | Choose one lawful marketplace policy, remove prohibited nodes/listings, migrate existing products, and require moderation rules that match the public policy. | Open — requires owner/legal decision before launch. |
| High | Social Media category | Products under legacy roots (`instagram`, `social-media`, etc.) disappeared when users selected `social-media-marketplace`; homepage also compared `Social Media / Instagram / …` with `Social Media`. | Match by hierarchy and canonical aliases in both API and UI; count all descendants. | Fixed with regression tests. |
| High | Homepage search | Search only scrolled to a small homepage subset instead of searching the full catalog. Users could conclude a product did not exist. | Submit to `/catalog?q=…`; make trending chips real searches. | Fixed. |
| High | Hero/mobile | The mobile hero stacked a large heading, two-row search, proof block, and 410px art card, pushing categories roughly a full screen too far down. | Compact one-screen value proposition; single-row search; visible CTAs; omit decorative stage on phones. | Fixed. |
| High | Product trust | Product pages showed invented five-star quotations labeled as verified reviews. | Render only real review API records; show a transparent empty/aggregate state otherwise. | Fabricated quotes removed; real public review feed remains to be connected. |
| High | Store discovery | “Visit store” links on featured sellers went to the generic catalog, and fallback storefronts showed no products. | Link to actual store slugs and derive fallback store inventory from catalog data. | Fixed. A dedicated `/stores` directory is still missing. |
| High | Dynamic SEO | Static prerendering covers company/legal/blog routes but not category, product, and store detail pages. Many crawlers/social previews will see generic SPA HTML. | Add SSR/on-demand prerendering for public dynamic routes and generate product/category OG images. | Open. |
| High | Search completeness | Catalog search filters only the first client-loaded batch (`take=96`). A larger marketplace will silently omit matches and has no pagination. | Use debounced server search, URL-backed filters, total counts, cursor pagination, and loading skeletons. | Open. |
| High | Performance | Public CSS is about 376 KB uncompressed and combines many overlapping generations. Several large admin/seller chunks remain 55–101 KB even after route splitting. | Consolidate tokens/components, delete superseded rules, split dashboard CSS, add bundle budgets, and measure deployed LCP/CLS/INP. | Open. |
| Medium | Header/mobile navigation | Marketplace header handles Escape and focus return; homepage did not lock scroll, expose expanded state, or restore focus. Neither menu fully traps focus. | Add dialog-like focus management and inert background behavior. | Homepage Escape, scroll lock, expanded state, and focus return fixed; full focus trap remains open. |
| Medium | Category controls | Homepage used ARIA tab roles without a real tabpanel/keyboard tab pattern; category selects lacked programmatic names. | Use a pressed-button group or implement the full tabs pattern; label all selects. | Fixed. |
| Medium | Product cards | Wishlist heart looked interactive but had no behavior. Auth pages advertised disabled Google/GitHub buttons. | Implement end-to-end features or remove false affordances. | Removed until functional. |
| Medium | Product structured data | Every product claimed InStock and emitted AggregateRating even for new/unrated products. | Derive availability from stock/type; omit aggregate rating when no reviews exist. | Fixed. |
| Medium | Product detail accuracy | “Updated files included” and “5 protected downloads” were hard-coded regardless of listing terms. | Display fields from the product/delivery policy or use truthful general language. | Fixed copy; explicit entitlement fields are still recommended. |
| Medium | Store contact | “Contact seller” routes to generic protected support, not a seller-scoped conversation, and is unclear for guests. | Open seller-scoped pre-sale questions with abuse controls or rename to “Contact support about this seller.” | Open. |
| Medium | Store directory | There is no `/stores` or true Top Sellers page/API even though the navigation implies store discovery. Featured rankings are static. | Add verified-store list endpoint, deterministic ranking, filters, and storefront cards; change claims until data-backed. | “Top sellers” renamed “Featured sellers”; directory remains open. |
| Medium | Loading/error states | Data hooks frequently swallow API errors and show empty results. Users cannot distinguish “no products” from an outage. | Return `{data, loading, error}` from all marketplace hooks; show retryable error states and skeletons. | Open. |
| Medium | Cart integrity | The cart stores full product snapshots in localStorage. Prices and stock can become stale between visits. | Store IDs/quantity only, refresh catalog data on load, and visibly report server-side price/stock changes before checkout. | Server checkout must remain authoritative; client refresh is open. |
| Medium | Homepage content control | A database `hero` section is rendered as a separate managed banner above the hard-coded hero, which can create duplicate messaging. | Define distinct `announcement` and `hero` schemas and inject managed hero copy into the hero component. | Open. |
| Medium | Product media/CLS | Image containers constrain height, but most images lack explicit intrinsic dimensions and responsive `srcset`. | Store width/height metadata, emit `aspect-ratio`, `srcset`, WebP/AVIF variants, and CDN sizing. | Partially mitigated by fixed containers; open. |
| Medium | Checkout confirmation | Crypto status polls every 15 seconds but provider webhook/reconciliation behavior needs deployed failure testing. | Test duplicate callbacks, delayed confirmation, expiry, refunds, navigation refresh, and idempotency against sandbox providers. | Open; unsafe top-up auto-credit removed. |
| Low | Disabled/empty destinations | Some footer links enter protected areas without explaining sign-in, and seller support links may redirect abruptly. | Preserve a return URL and label protected destinations. | Return path exists; clearer copy remains open. |
| Low | Localization | The redesigned English value proposition is more explicit; other locales retain older generic hero wording. Some marketplace strings remain hard-coded English. | Move all public copy into translation dictionaries and add locale QA. | Open. |
| Low | Visual consistency | Public homepage uses one header/footer system while catalog/detail/legal pages use another. Both are polished but not fully unified. | Share one brand header/footer and one spacing/type/color token set. | Open. |

## Page-by-page notes

### Homepage and hero

- New hero states what can be bought, makes catalog/category CTAs obvious, routes search into the full catalog, and uses a restrained technology grid/gradient treatment.
- Phone layout removes the large decorative stage, compresses search into one row, hides secondary proof/trending content, and turns trust items into a horizontal rail so categories appear earlier.
- Featured seller links now resolve to real fallback stores. Until a store-ranking endpoint exists, do not call these “Top Sellers.”
- The promotional collection, new arrivals, blog, seller CTA, and newsletter sections are visually rich but make the homepage long. After analytics exist, consider moving either the collection banner or new-arrivals rail below the seller block.

### Catalog and categories

- Alias-aware hierarchy matching now handles legacy and enterprise taxonomies on homepage, catalog, category pages, API filtering, and product counts.
- Filters are useful and URL-backed for query/category, but sort/type/price/rating/stock are not fully URL-backed. Preserve every active filter in the URL for sharing and browser history.
- Three-level categories display only one directory level at a time. Add drill-down/breadcrumbs for deep taxonomies rather than hundreds of flat options.

### Product pages

- Strong information architecture: breadcrumb, gallery modes, seller identity, fulfillment details, sticky buy panel, facts, policies, FAQs, and recommendations.
- Remove or condition every promise that is not backed by listing data. The fake review quotations and hard-coded delivery entitlements were corrected.
- Connect real review records returned by the API; include review author privacy rules, pagination, seller responses, and report controls.

### Store pages

- Banner, logo, verification, policy, metrics, and product grid provide a good base.
- Add store search/sort, seller response time, dispute rate presented carefully, last active date, policies in structured sections, and a scoped contact flow.
- Add a verified stores directory and replace static homepage rankings with data-backed featured/ranked lists.

### Cart and checkout

- Empty cart, line items, quantity controls, summary, secure-checkout CTA, and responsive layout are present. Quantity controls now have accessible names and live quantity feedback.
- Re-fetch products before rendering totals and show a clear “price changed/out of stock” state.
- Complete sandbox tests for every enabled provider, webhook replay, failed/abandoned payments, refunds, manual approval, and delivery release.

### Authentication and accounts

- Labels, autocomplete, password strength, consent, verification, protected-route return paths, and role-based dashboards are implemented well.
- Disabled social-login buttons were removed. Reintroduce them only after OAuth is operational.
- Add passkeys or MFA for sellers/admins, session/device management, and recovery-code UX before high-value transactions.

### Header, footer, search, mobile menu

- Both header systems expose semantic navigation, cart, locale, account, and mobile controls.
- Consolidate the duplicate homepage/commerce header systems and implement a complete focus trap for open menus.
- Add a dedicated store directory and avoid links whose labels promise destinations that do not exist.

### About, contact, blog, legal and policy pages

- Legal pages are unusually clear and well structured; blog/article metadata is prerendered.
- Contact is informational only and sends users toward protected support. Add a public, rate-limited contact path for pre-account legal/business inquiries.
- Resolve the catalog-versus-prohibited-policy contradiction before acquiring sellers or processing payments.

### Seller/admin dashboards

- Broad operational coverage exists: listing creation/editing, category management, moderation, disputes, refunds, earnings, support, storefront branding, and analytics.
- Large single-file dashboard components should be split by workspace to reduce change risk and improve testability.
- Add browser tests for role guards, category creation, product moderation, seller application, refund/replacement, and mobile dashboard navigation.

## Verification completed

- Frontend production TypeScript/Vite build.
- Backend TypeScript build.
- Prisma schema validation with a non-production validation URL.
- ESLint with zero warnings/errors after fixes.
- 13 automated tests, including new category-alias regression coverage.
- Static prerender generation for 16 public routes.

## Recommended release gate

Do not accept live money until: prohibited catalog categories are reconciled with policy; staging database migrations and seed data are verified; every enabled payment method passes amount/address/currency/idempotency/refund tests; SMTP and verification flows pass; product/store/category dynamic SEO is addressed; and real mobile/desktop browser QA plus Lighthouse/Web Vitals is completed on the deployed origin.


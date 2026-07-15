# HSello implementation summary — 15 July 2026

## Intentionally unchanged

Per the requested scope, this update does not change SMTP behavior, registration/email-verification behavior, payment/top-up/refund business logic, or the prohibited-products policy.

## Implemented

- Route-level lazy loading for all public, account, seller, and admin pages.
- Root error boundary, route loading skeleton, skip link, and a real no-index 404 page.
- Rebuilt SEO component with canonical origin configuration, robots controls, Open Graph, Twitter cards, article/product types, and stale-tag cleanup.
- Build-time metadata prerendering for 16 public routes.
- Dynamic crawler routing for `robots.txt` and `sitemap.xml` on Vercel and Sites, with expanded static/blog coverage.
- Vercel CSP, HSTS, referrer, permissions, framing, content-type, and immutable asset-cache headers.
- Working blog article routes and four complete guide pages; removed self-linking placeholder behavior.
- Replaced the inert newsletter form with a working content CTA.
- Removed fabricated homepage counts, revenue, seller sales, ratings, and countdown claims from fallback content.
- Added a reusable visual token/polish layer, consistent focus styles, reduced-motion support, responsive recovery/loading states, and mobile support-widget sizing.
- Accessible support dialog semantics, names, live updates, focus trap/restore, Escape behavior, labelled input, and timer cleanup.
- Accessible date-range labels, button types, pressed state, range validation, and errors.
- Mobile navigation focus/keyboard improvements.
- Admin image-preview URL cleanup to prevent memory leaks.
- Deterministic API-origin configuration instead of a mutable runtime fallback.
- Category taxonomy initialization moved from GET requests to API startup.
- Removed unused Next.js, Drizzle/D1, dead page, build-plugin, worker-starter, and starter-asset files.
- Repaired the Sites install/build scripts for the actual Vite stack.
- Added working ESLint/Prettier tooling, runtime tests, production dependency audit, artifact validation, and CI-gated deployment.
- Added a web app manifest and corrected package identity to `hsello-marketplace`.

## Verification

- `npm run build`: passed (web + API + Prisma generation).
- Web TypeScript: passed.
- API TypeScript: passed.
- `npm test`: 8/8 passed.
- `npm run lint`: passed with eight warnings, all limited to excluded registration/auth/payment/top-up files.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `bash scripts/validate-artifact.sh`: passed.
- Initial JS: 68.28 kB gzip, down from 155.44 kB gzip (approximately 56% reduction).

## Deployment note

Set `VITE_SITE_URL` to the final public origin. The configured Sites project ID currently returns `NOT_FOUND`; create or attach the correct Sites project before using that hosting path. Vercel/Railway configuration remains available.

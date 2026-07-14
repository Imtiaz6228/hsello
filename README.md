# HSello digital marketplace

HSello is a full-stack marketplace for reviewed digital downloads and service-based products. It includes secure authentication, seller approval, product moderation, cart and checkout, Stripe and PayPal hosted payment flows, manual payment approval, expiring downloads, invoices, support tickets, reviews, disputes, refunds, seller storefronts, legal pages, SEO metadata, sitemaps, reports, and an operations console.

The trust policy is enforced throughout the product: account and credential trading, hacking tools, stolen files, fake reviews, spam, and bot services are prohibited.

One repository root, two deployment targets:

- **Railway** builds the React app and Express API, runs migrations, and serves everything from one origin.
- **Vercel** builds the React app. Its `/api` and `/uploads` rewrites proxy to Railway, so browser requests stay same-origin.
- **GitHub Actions** checks every pull request and `main` push against PostgreSQL before either platform deploys it.

There are no `frontend` or `backend` root folders and neither platform needs a Root Directory override.

## Railway

1. Create a Railway project from this GitHub repository and select the `main` branch.
2. Add a PostgreSQL service to the same Railway project.
3. On the app service, generate a public domain under **Settings → Networking**.
4. Leave **Root Directory** blank.
5. Railway reads `railway.json`; do not override its build, pre-deploy, start, or health-check commands.
6. Add the variables below and redeploy.

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://YOUR-VERCEL-PROJECT.vercel.app
API_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app
CORS_ORIGIN=https://YOUR-VERCEL-PROJECT.vercel.app
JWT_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
CSRF_SECRET=GENERATE_A_DIFFERENT_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=30
SHORT_REFRESH_TOKEN_HOURS=24
SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SMTP_USER
SMTP_PASS=YOUR_SMTP_PASSWORD
EMAIL_FROM=Hsello <no-reply@your-domain.com>
ADMIN_NOTIFICATION_EMAIL=admin@your-domain.com
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_BYTES=8388608
TURNSTILE_REQUIRED=false
TURNSTILE_SECRET_KEY=

STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
BANK_TRANSFER_INSTRUCTIONS="Bank and account details shown after order creation"
CRYPTO_PAYMENT_INSTRUCTIONS="Supported asset, network, and receiving address"
CRYPTO_WEBHOOK_SECRET=GENERATE_A_THIRD_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
TOPUP_TRC20_ADDRESS=
TOPUP_BEP20_ADDRESS=
TOPUP_ERC20_ADDRESS=
TOPUP_BTC_ADDRESS=
TOPUP_ETH_ADDRESS=
TOPUP_SOL_ADDRESS=
PRIVATE_UPLOAD_DIR=/app/private-uploads
MAX_PRODUCT_FILE_BYTES=104857600
```

`APP_URL`, `API_URL`, and each comma-separated `CORS_ORIGIN` entry must be a complete HTTPS origin without a path. Prefer exact preview URLs over broad wildcards.

Railway injects its own `PORT`; you do not need to create that variable. Before every release, `prisma migrate deploy` applies committed migrations to PostgreSQL. A failed migration stops the release before the new API starts.

Public images (product covers, store logo/banner, profile photos, chat attachments, and top-up proof screenshots) are saved to PostgreSQL and cached at `/app/uploads`, so a stateless redeploy no longer breaks newly uploaded media. A Railway volume at `/app/uploads` is still recommended for faster cache hits, but PostgreSQL is the durable source of truth.

Mount a second private volume at `/app/private-uploads` for seller delivery files. That directory is never exposed as static content; files are released only through validated download grants.

Stripe and PayPal are hidden by the API until their credentials are configured. Bank transfer and crypto are also hidden until instructions are configured. Manual approval remains available for staff-reviewed payments. Hosted provider returns are verified server-side before delivery, and provider refunds are issued through the matching API.

Railway can also host the complete app at its public URL. To start with that same-origin version, set `APP_URL`, `API_URL`, and `CORS_ORIGIN` to the Railway public origin. This is the simplest way to confirm registration and login before configuring Vercel.

## Vercel

1. Import the same repository and leave **Root Directory** blank.
2. Select `main` as the Production Branch.
3. Vercel reads `vercel.json`, proxies `/api` and `/uploads` to Railway, and runs `npm run build:web`.
4. Update the Railway URL inside `vercel.json` if your Railway service URL is different, then redeploy Vercel.

Set `VITE_SITE_URL` to the final Vercel origin so the build can emit canonical metadata for static public routes. Keep browser API calls same-origin through the configured Vercel rewrites; this preserves strict cookies and CSRF protection.

If Turnstile is enabled, also set `VITE_TURNSTILE_SITE_KEY` on Vercel and the matching `TURNSTILE_SECRET_KEY` on Railway. Add a Vercel preview URL to Railway's `CORS_ORIGIN` only when you intend to test that preview.

After Vercel has its final URL, confirm that Railway's `APP_URL` and `CORS_ORIGIN` use that URL and redeploy Railway once.

## GitHub autodeploy safety

Vercel and Railway automatically deploy new commits after their GitHub integrations are connected. In Railway's service settings, enable **Wait for CI** so releases start only after the included GitHub Actions workflow passes.

The workflow installs the locked dependencies, validates the Prisma schema, applies every migration to PostgreSQL 16, and builds the frontend and API. It does not need production secrets.

## Staff accounts

Register the accounts first, then run these commands in the Railway service shell:

```sh
npm run set-role -- super@example.com SUPER_ADMIN
npm run set-role -- admin@example.com ADMIN
npm run set-role -- moderator@example.com MODERATOR
```

Moderators and admins can review seller applications. Super admins can also manage user roles.

## Local verification

Copy `.env.example` to `.env`, replace its placeholders with local values, and use a local PostgreSQL URL.

```sh
npm ci
npm run prisma:migrate
npm run build:railway
```

Use `npm run dev:api` for the API and `npm run dev:web` for Vite. The Vite development server proxies `/api` and `/uploads` to port 4000.

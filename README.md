# Hsello authentication app

One repository root, two deployment targets:

- **Railway** builds the React app and Express API, runs migrations, and serves everything from one origin.
- **Vercel** builds the React app. It calls the Railway API using `VITE_API_BASE_URL`.

There are no `frontend` or `backend` root folders and neither platform needs a Root Directory override.

## Railway

1. Connect this repository and add a PostgreSQL service.
2. Leave **Root Directory** blank.
3. Railway reads `railway.json`; do not override its build/start commands.
4. Add the variables below and redeploy.

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://YOUR-VERCEL-PROJECT.vercel.app
API_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app
CORS_ORIGIN=https://YOUR-VERCEL-PROJECT.vercel.app
COOKIE_DOMAIN=
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
UPLOAD_DIR=uploads
MAX_UPLOAD_BYTES=2097152
TURNSTILE_REQUIRED=false
TURNSTILE_SECRET_KEY=
```

`COOKIE_DOMAIN` must remain blank. `APP_URL`, `API_URL`, and `CORS_ORIGIN` must be complete HTTPS origins without paths.

Railway can also host the complete app at its public URL. This same-origin version is the simplest way to confirm registration and login before configuring Vercel.

## Vercel

1. Import the same repository and leave **Root Directory** blank.
2. Vercel reads `vercel.json` and runs `npm run build:web`.
3. Add this variable to Production and Preview, then redeploy:

```env
VITE_API_BASE_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app
```

Do not append `/api`. Vite embeds this value during the build, so changing it always requires a redeploy.

If Turnstile is enabled, also set `VITE_TURNSTILE_SITE_KEY` on Vercel and the matching `TURNSTILE_SECRET_KEY` on Railway.

## Staff accounts

Register the accounts first, then run these commands in the Railway service shell:

```sh
npm run set-role -- super@example.com SUPER_ADMIN
npm run set-role -- admin@example.com ADMIN
npm run set-role -- moderator@example.com MODERATOR
```

Moderators and admins can review seller applications. Super admins can also manage user roles.

## Local verification

```sh
npm ci
npm run prisma:generate
npm run build
```

Use `npm run dev:api` for the API and `npm run dev:web` for Vite. The Vite development server proxies `/api` and `/uploads` to port 4000.

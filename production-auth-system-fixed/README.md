# Authentication deployment fix

This build fixes the Vercel-to-Railway authentication failure and includes a working role-aware admin panel.

## What was broken

- Production cookies used `SameSite=Strict`. A Vercel page calling Railway is cross-site, so browsers did not send the CSRF/session cookies.
- CORS compared raw strings, so a harmless trailing slash or a Vercel preview domain caused the browser to report a network error.
- The database only defined `ADMIN`; `MODERATOR` and `SUPER_ADMIN` logins could never pass a role guard.
- Staff users were sent to the customer dashboard after login.
- The recovered frontend was missing its application entry point, routes, SPA rewrite, dashboard, and admin screen.

## Deploy Railway (backend)

Set the Railway service root directory to `backend`. The included `railway.json` builds the API, applies Prisma migrations before deployment, starts the server, and checks `/api/health`.

Set these Railway variables (use your real URLs and secrets):

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://your-app.vercel.app
API_URL=https://your-api.up.railway.app
CORS_ORIGIN=https://your-app.vercel.app,https://*.your-team.vercel.app
COOKIE_DOMAIN=
JWT_SECRET=use-at-least-32-random-characters
CSRF_SECRET=use-a-different-32-character-random-secret
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=30
SHORT_REFRESH_TOKEN_HOURS=24
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=Your App <no-reply@your-domain.com>
ADMIN_NOTIFICATION_EMAIL=admin@your-domain.com
UPLOAD_DIR=uploads
MAX_UPLOAD_BYTES=2097152
TURNSTILE_REQUIRED=false
TURNSTILE_SECRET_KEY=
```

`COOKIE_DOMAIN` must stay blank because production cookies use the secure `__Host-` prefix. Redeploy Railway after saving the variables.

## Deploy Vercel (frontend)

Set the Vercel project root directory to `frontend`, then set:

```env
VITE_API_BASE_URL=https://your-api.up.railway.app
VITE_TURNSTILE_SITE_KEY=
```

Do not add a trailing path such as `/api` to `VITE_API_BASE_URL`. Redeploy Vercel after changing any `VITE_` variable because Vite embeds it at build time.

The included `vercel.json` makes direct visits to `/sign-in`, `/register`, `/admin`, and verification links work as SPA routes.

## Create staff accounts

Register each account normally first. After the Railway build has completed, run these commands in the backend service shell (replace the emails):

```sh
npm run set-role -- super@example.com SUPER_ADMIN
npm run set-role -- admin@example.com ADMIN
npm run set-role -- moderator@example.com MODERATOR
```

The command also verifies the staff account so the admin guard can admit it. A super admin can then change roles from the admin panel. Moderators and admins can review seller applications; only super admins can manage user roles.

## Verification

```sh
cd backend
npm ci
npm run prisma:generate
npm run build

cd ../frontend
npm ci
npm run build
```

Expected production header behavior from `GET /api/csrf`:

- `Access-Control-Allow-Origin` equals the requesting Vercel origin.
- `Access-Control-Allow-Credentials: true`.
- CSRF cookie includes `Secure; SameSite=None; Path=/` and has no `Domain` attribute.

For maximum long-term browser compatibility, put the frontend and API on sibling custom domains (for example, `app.example.com` and `api.example.com`). The included cross-site configuration works with the Vercel and Railway domains, but some privacy modes block all third-party cookies regardless of server settings.

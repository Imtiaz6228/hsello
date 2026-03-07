# hsello Marketplace (Vite + React)

This project is a frontend marketplace app with:

- Admin panel login (pre-created admin account)
- Buyer signup/login
- Seller signup/login
- No verification code required for registration
- Local persisted data (demo database in browser memory + Zustand persist)

---

## Default demo/admin accounts

- **Admin**: `admin@hsello.com` / `admin123`
- **Buyer**: `buyer@demo.com` / `buyer123`
- **Seller**: `seller1@demo.com` / `seller123`

You can also create new buyer and seller accounts from the Register tab.

### Seller moderation flow

1. Seller registers from **Seller Register**.
2. Seller status becomes **PENDING**.
3. Seller login will show pending approval message until admin approves.
4. Admin logs in (`admin@hsello.com` / `admin123`) and approves seller in **Admin Panel → Users**.
5. Seller can then login and access **Seller Dashboard**.

---

## Local development

```bash
npm install
npm run dev
```

---

## Production build

```bash
npm install
npm run build
```

Build output will be in:

```text
dist/
```

---

## Environment file

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Current variable:

- `VITE_ENABLE_DEMO_MODE=true`

---

## Upload to Hostinger VPS (recommended with Nginx)

### 1) Build locally (or on VPS)

```bash
npm install
npm run build
```

### 2) Upload files to VPS

Upload the content of `dist/` to your web root, for example:

- `/var/www/hsello/dist`

### 3) Nginx config (SPA)

Use a config similar to:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/hsello/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Then reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Important note for production

This app currently uses a **frontend in-memory/local persisted demo database** (`src/store/database.ts`) and is suitable for demo/prototype deployment.

For real production usage, add a backend API + real database (MySQL/PostgreSQL) for secure authentication and persistent server-side data.

# NEXUS Marketplace - Deployment Guide

## 1. Overview

NEXUS is a digital marketplace for accounts/keys/software with escrow protection, crypto deposits, AI support, and earnings analytics. Built with Prisma + PostgreSQL + Redis + Express + Vite React + Tailwind.

## 2. Architecture

- **Frontend**: Vite + React + TypeScript (deployed to Vercel)
- **Backend**: Express + Prisma + PostgreSQL (deployed to Railway)
- **Redis**: Upstash Redis for caching and pub/sub
- **Workers**: Background workers for frozen fund release, deposit verification, and auto-payout
- **Storage**: Cloudflare R2 for screenshots and voice uploads

## 3. Prerequisites

- Node.js 20+ 
- PostgreSQL database
- Redis instance (Upstash recommended)
- Cloudflare R2 account (for file uploads)
- OpenAI API key (for AI support features)

## 4. Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (use `rediss://` for TLS)
- `JWT_SECRET` / `CSRF_SECRET` - 32+ character secrets
- `ADMIN_WALLET_ADDRESS` - Your TRC20 wallet for receiving commissions
- `OPENAI_API_KEY` - For AI support and Whisper transcription
- `TRONGRID_API_KEY` / `ETHERSCAN_API_KEY` / `BSCSCAN_API_KEY` - For auto-verification

## 5. Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run seed:nexus
npm run dev:api  # Terminal 1 - API server
npm run dev:web  # Terminal 2 - Vite dev server
```

## 6. Railway Deployment

1. Create a new Railway project
2. Add PostgreSQL and Redis services
3. Set environment variables from `.env.example`
4. Railway will use `railway.toml` for build and deploy:
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && npm run start:worker & npm start`
   - Health check: `/api/health`

## 7. Vercel Deployment

1. Import the repository to Vercel
2. Set environment variables (APP_URL, API_URL pointing to Railway)
3. Vercel will use `vercel.json`:
   - Framework: Vite
   - Build: `npm run build:web`
   - API rewrites to Railway
   - Crons: `0 * * * *` release-frozen, `*/5 * * * *` verify-deposits

## 8. Docker Deployment

```bash
docker build -t nexus-marketplace .
docker run -p 3000:3000 --env-file .env nexus-marketplace
```

The Dockerfile uses node:20-alpine with multi-stage builds:
- deps: Install production dependencies
- builder: Build web and API
- runner: Run migrations, workers, and server

## 9. GitHub Actions CI/CD

The `.github/workflows/deploy.yml` workflow:
- **deploy-vercel**: Uses `amondnet/vercel-action` to deploy frontend
- **deploy-railway**: Uses `bervProject/railway-deploy` to deploy backend

Required GitHub secrets:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`

## 10. Post-Deployment

1. Run the seed script: `npm run seed:nexus`
2. Verify health: `curl https://your-domain/api/health`
3. Test the admin panel at `/admin`
4. Test earnings analytics at `/admin/earnings`
5. Configure KB articles at `/admin/kb/editor`
6. Set up cron jobs in Vercel for frozen release and deposit verification

## Escrow Flow Summary

```
Buyer topup (CRYPTO/BANK/PAYPAL/STRIPE) 
  → sends exact amount to address 
  → submits TXID + screenshot 
  → PENDING → auto-verified via TronScan/Etherscan/BSCScan or admin approves 
  → balance credited

Buy flow: $100 product 
  → $10 (10%) → admin wallet COMMISSION_SALE 
  → $90 frozen 72h 
  → download links signed 7 days 
  → after 72h frozen-release worker releases 
  → seller balance +$90 
  → seller withdraws $90 
  → 3% ($2.7) → admin COMMISSION_WITHDRAW 
  → net $87.3 payout
```

## API Endpoints

- `POST /api/nexus/topup/request` - Create topup request
- `POST /api/nexus/topup/proof` - Submit TXID + screenshot proof
- `POST /api/nexus/upload/screenshot` - Upload screenshot with OCR
- `POST /api/nexus/upload/voice` - Upload voice with Whisper transcription
- `GET /api/nexus/kb/search` - Search knowledge base
- `POST /api/nexus/ai/support` - AI support chat
- `PUT /api/nexus/ai/support/quick-action` - Execute quick action
- `GET /api/nexus/admin/earnings/daily` - Admin earnings report
- `GET /api/nexus/seller/earnings/daily` - Seller earnings report
- `GET /api/nexus/health` - Health check (SELECT 1 + redis.ping)
- `POST /api/nexus/cron/release-frozen` - Cron: release frozen funds
- `POST /api/nexus/cron/verify-deposits` - Cron: verify pending deposits

## Workers

Background workers in `src/server/workers/index.ts`:
- `releaseFrozenFunds` - Every 2 minutes, releases funds frozen >72h
- `verifyPendingDeposits` - Every 1 hour, auto-verifies pending deposits
- `autoPayoutWorker` - Every 1 hour, processes approved withdrawals
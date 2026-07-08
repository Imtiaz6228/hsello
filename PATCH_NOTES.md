# HSello checkout/category patch

This patch adds wallet-balance checkout, timed crypto invoices, default marketplace categories, and safer moderation/delivery behavior.

## What changed

- Approved wallet deposits continue to increment `User.balanceCents`; the checkout page now exposes `Wallet balance` as a payment method when the user has enough approved balance.
- Wallet purchases now create real orders, mark payment as paid, generate download grants/inventory delivery, and deduct the buyer balance atomically.
- Seller Studio now loads seeded category options from `/api/seller/categories` and shows one category selector with parent/subcategory labels.
- The backend seeds default categories for social media, email services, games, streaming apps, AI platforms, and subscription platforms when category APIs are called.
- New products now go to `PENDING` moderation instead of failing because a delivery ZIP/inventory row is not attached at creation time.
- Admin approval now blocks publishing downloadable products that still have no active file or inventory row, so approved products can actually be delivered.
- Add-to-cart actions route buyers directly to `/cart`.
- Static demo products are no longer used as live checkout products, preventing stale non-database product IDs from causing unavailable-cart checkout errors.
- The old checkout helper text mentioning “No coupon step...” was removed.
- Crypto checkout creates a timed invoice with amount, network, address, reference, countdown, and status polling.
- `/api/commerce/crypto/webhook` lets a blockchain/payment detector mark a crypto invoice as paid; once detected, the existing delivery pipeline unlocks downloads and ZIP delivery.

## Required environment variables for crypto checkout

```env
CRYPTO_PAYMENT_ADDRESS=replace_with_your_wallet_address
CRYPTO_PAYMENT_ASSET=USDT
CRYPTO_PAYMENT_NETWORK=TRC20
CRYPTO_PAYMENT_TIMEOUT_MINUTES=30
CRYPTO_WEBHOOK_SECRET=replace_with_long_random_webhook_secret
```

Configure your crypto detector/payment processor to POST to:

```text
POST /api/commerce/crypto/webhook
Header: x-hsello-crypto-secret: <CRYPTO_WEBHOOK_SECRET>
Body: { "orderId": "...", "txHash": "...", "amount": "...", "asset": "USDT", "network": "TRC20" }
```

The app does not include a full blockchain node/indexer. Detection becomes automatic once a real detector or payment processor is connected to the webhook.

## Wallet checkout hotfix

- Wallet checkout now completes the order and creates delivery grants even if SMTP/order-confirmation email delivery fails. Email failure is logged only and no longer rolls back the paid wallet order.
- Checkout now displays the current available wallet balance in the order summary.
- Successful wallet checkout updates the authenticated user's in-app balance immediately.
- Account dashboard overview now includes an "Available balance" metric, and the Wallet tab syncs the same latest balance from `/api/wallet/balance`.

## Disputes, seller balance holds, and withdrawals

- Buyers can now open disputes from paid orders, demand a refund, close a dispute, and see a dedicated Disputes menu in the account dashboard.
- Buyer order chats now appear in a Chats dashboard menu after a conversation starts.
- Buyer/seller order chat accepts image screenshots through multipart upload and shows attachments inline in the order workspace.
- Disputes track the party expected to reply and auto-resolve against the party that fails to respond within 24 hours when dispute/order/admin pages are loaded.
- Sellers now see a seller-center dashboard modeled after the supplied screenshots: available balance, frozen balance, product count, orders, sales, today income, and disputes.
- Sellers can view order rows, open buyer chat, view dispute rows by product/order, and submit seller refund requests for admin review.
- Admin can review disputes, message inside the dispute order chat, close disputes, or resolve in favor of buyer or seller.
- Paid orders now create `SellerEarning` rows that remain `FROZEN` for three days; after release, the amount increments the seller's available wallet balance.
- Buyers and sellers can request withdrawals from the Wallet tab by selecting blockchain/network, entering wallet address, and amount.
- Admin has a Withdrawals workspace to approve paid withdrawals or reject them and return the balance.

## New database migration

Run the included migration before using the new dispute/withdrawal features:

```bash
npm run prisma:migrate
npm run prisma:generate
```

The new migration adds dispute timers/party fields, message attachment metadata, seller earnings, and withdrawal requests.

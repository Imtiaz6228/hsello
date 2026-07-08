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

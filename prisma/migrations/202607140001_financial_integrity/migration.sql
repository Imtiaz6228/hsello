-- Financial integrity, replay protection, and privileged-action audit trail.

ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "externalTransactionId" TEXT;

CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fail loudly if historic duplicate business identifiers need operator review.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "TopupRequest" WHERE "txHash" IS NOT NULL GROUP BY "txHash" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate TopupRequest.txHash values must be resolved before this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "Payment" WHERE "providerReference" IS NOT NULL GROUP BY "providerReference" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate Payment.providerReference values must be resolved before this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "DownloadGrant" GROUP BY "orderItemId", "productFileId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate download grants must be resolved before this migration';
  END IF;
END $$;

DROP INDEX IF EXISTS "ProductInventoryItem_productId_isActive_deliveredAt_idx";
DROP INDEX IF EXISTS "Payment_providerReference_idx";
DROP INDEX IF EXISTS "TopupRequest_reference_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "TopupRequest_txHash_key" ON "TopupRequest"("txHash");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerReference_key" ON "Payment"("providerReference");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_externalTransactionId_key" ON "Payment"("externalTransactionId");
CREATE UNIQUE INDEX IF NOT EXISTS "DownloadGrant_orderItemId_productFileId_key" ON "DownloadGrant"("orderItemId", "productFileId");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "ProductInventoryItem_productId_isActive_orderItemId_createdAt_idx" ON "ProductInventoryItem"("productId", "isActive", "orderItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- Database-level safety nets for values that must never become negative.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_balanceCents_nonnegative";
ALTER TABLE "User" ADD CONSTRAINT "User_balanceCents_nonnegative" CHECK ("balanceCents" >= 0);
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_redemptionCount_nonnegative";
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_redemptionCount_nonnegative" CHECK ("redemptionCount" >= 0);
ALTER TABLE "DownloadGrant" DROP CONSTRAINT IF EXISTS "DownloadGrant_counts_valid";
ALTER TABLE "DownloadGrant" ADD CONSTRAINT "DownloadGrant_counts_valid" CHECK ("downloadCount" >= 0 AND "maxDownloads" > 0 AND "downloadCount" <= "maxDownloads");

-- Prevent one blockchain transaction from funding more than one top-up.
CREATE UNIQUE INDEX "TopupRequest_txHash_key" ON "TopupRequest"("txHash");

-- Give every balance mutation a stable business-operation key.
ALTER TABLE "WalletTransaction" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");

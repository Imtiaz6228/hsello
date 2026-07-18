-- Keep marketplace commission records idempotent when a payment callback is retried.
CREATE UNIQUE INDEX "AdminTransaction_type_reference_key" ON "AdminTransaction"("type", "reference");

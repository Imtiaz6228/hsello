import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("seller dashboard cards and revenue periods are interactive", async () => {
  const source = await read("src/pages/SellerStudioPage.tsx");
  assert.match(source, /setAnalyticsPeriod\("7d"\)/);
  assert.match(source, /setAnalyticsPeriod\("30d"\)/);
  assert.match(source, /setAnalyticsPeriod\("year"\)/);
  assert.ok((source.match(/className="seller-metric-action"/g) ?? []).length >= 8);
});

test("open dispute chat exposes seller refund, replacement and full order details", async () => {
  const source = await read("src/pages/OrderDeliveryPage.tsx");
  assert.match(source, /user\?\.role === "SELLER" && activeDispute/);
  assert.match(source, /\/api\/seller\/orders\/\$\{order\.id\}\/refund/);
  assert.match(source, /\/api\/seller\/orders\/\$\{order\.id\}\/items\/\$\{item\.id\}\/replace/);
  for (const label of ["Buyer email", "Product ID", "Quantity bought", "Unit price", "Order time"]) assert.match(source, new RegExp(label));
});

test("replacement API requires seller ownership and an active dispute", async () => {
  const source = await read("src/routes/seller.routes.ts");
  assert.match(source, /items\/:itemId\/replace/);
  assert.match(source, /sellerId: req\.auth!\.id/);
  assert.match(source, /ACTIVE_DISPUTE_REQUIRED/);
  assert.match(source, /productInventoryItem\.updateMany/);
});

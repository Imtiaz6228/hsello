import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("email verification is derived from persisted state and enforced", async () => {
  const authService = await read("src/services/auth.service.ts");
  const authMiddleware = await read("src/middleware/auth.ts");
  assert.match(authService, /emailVerified:\s*Boolean\(user\.emailVerifiedAt\)/);
  assert.match(authMiddleware, /EMAIL_VERIFICATION_REQUIRED/);
  assert.doesNotMatch(authMiddleware, /emailVerified:\s*true/);
});

test("seed scripts contain no default administrator credentials", async () => {
  const sources = `${await read("src/scripts/seed-admin.ts")}\n${await read("src/scripts/seed-nexus.ts")}`;
  assert.doesNotMatch(sources, /Admin@123456|NEXUS-Admin-2024!|hsello\.store@gmail\.com/i);
  assert.match(sources, /ADMIN_PASSWORD/);
});

test("financial transitions have database idempotency and serializable claims", async () => {
  const schema = await read("prisma/schema.prisma");
  const topup = await read("src/services/topup.service.ts");
  const finance = await read("src/services/finance.service.ts");
  const payment = await read("src/services/payment.service.ts");
  assert.match(schema, /txHash\s+String\?\s+@unique/);
  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
  for (const source of [topup, finance, payment]) {
    assert.match(source, /TransactionIsolationLevel\.Serializable/);
  }
});

test("crypto top-ups do not ship hard-coded destinations or existence-only verification", async () => {
  const topup = await read("src/services/topup.service.ts");
  const dashboard = await read("src/pages/AccountDashboardPage.tsx");
  const sources = `${topup}\n${dashboard}`;
  assert.doesNotMatch(sources, /TDffsBmuyrMsNEQX|0x5fe0bc617b008|1CRoGe5BKjST|5K8sYDqmmMDe/);
  assert.doesNotMatch(topup, /autoVerifyTopup|Boolean\(data\?\.(data|result)/);
  assert.match(topup, /autoVerified:\s*false/);
});

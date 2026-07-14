import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("unsafe actions require CSRF except the authenticated provider webhook", async () => {
  const source = await read("src/middleware/csrf.ts");
  assert.match(source, /\/commerce\/crypto\/webhook/);
  assert.doesNotMatch(source, /\/api\/auth\/register.*return next/s);
  assert.doesNotMatch(source, /\/api\/auth\/login.*return next/s);
});

test("public and private uploads validate file contents", async () => {
  const source = await read("src/middleware/upload.ts");
  assert.match(source, /fileTypeFromFile/);
  assert.match(source, /limitInputPixels/);
  assert.match(source, /resolvePrivateUploadPath/);
});

test("financial idempotency and uniqueness are enforced in the data model", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /externalTransactionId\s+String\?\s+@unique/);
  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
  assert.match(schema, /@@unique\(\[orderItemId, productFileId\]\)/);
  assert.match(schema, /txHash\s+String\?\s+@unique/);
});

test("marketplace UI has no fabricated product or store fallback", async () => {
  const hook = await read("src/commerce/useMarketplace.ts");
  const store = await read("src/pages/StorePage.tsx");
  assert.doesNotMatch(hook, /setCategories\(catalogCategories\)/);
  assert.doesNotMatch(store, /const stores:/);
});

test("privileged and dispute flows do not use native browser prompts", async () => {
  const pages = await readdir(new URL("../src/pages", import.meta.url));
  const sources = await Promise.all(pages.filter((name) => name.endsWith(".tsx")).map((name) => read(`src/pages/${name}`)));
  assert.doesNotMatch(sources.join("\n"), /window\.(?:prompt|confirm)\s*\(/);
});

test("production cookies are strict and CSRF tokens expire", async () => {
  const source = await read("src/lib/cookies.ts");
  assert.match(source, /sameSite: isProduction \? "strict"/);
  assert.match(source, /ageSeconds <= 2 \* 60 \* 60/);
});

test("support content does not claim automatic deposit verification", async () => {
  const source = await read("src/services/ai-support.service.ts");
  assert.doesNotMatch(source, /auto-verified|mock transcription|mock OCR/i);
});

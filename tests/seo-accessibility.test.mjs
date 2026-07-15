import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("prerenders public routes with unique metadata", () => {
  const about = readFileSync("dist/about.html", "utf8");
  const blog = readFileSync("dist/blog/evaluate-digital-product-before-checkout.html", "utf8");
  assert.match(about, /<title>About HSello<\/title>/);
  assert.match(about, /rel="canonical" href="http:\/\/localhost:5173\/about"/);
  assert.match(blog, /property="og:type" content="article"/);
  assert.match(blog, /name="twitter:description"/);
});

test("keeps crawler files ahead of the SPA fallback", () => {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  const rewriteSources = vercel.rewrites.map((rule) => rule.source);
  assert.deepEqual(rewriteSources.slice(0, 2), ["/robots.txt", "/sitemap.xml"]);
  assert.equal(rewriteSources.at(-1), "/(.*)");
  assert.ok(vercel.headers.some((rule) => rule.headers.some((header) => header.key === "Content-Security-Policy")));
});

test("provides route recovery and accessible support dialog controls", () => {
  const router = readFileSync("src/WebApp.tsx", "utf8");
  const support = readFileSync("src/components/SupportWidgetPro.tsx", "utf8");
  assert.match(router, /lazy\(\(\) =>\s+import/);
  assert.match(router, /path="\*" element=\{<NotFoundPage \/>\}/);
  assert.match(router, /Skip to main content/);
  assert.match(support, /role="dialog"/);
  assert.match(support, /aria-labelledby="support-dialog-title"/);
  assert.match(support, /aria-label="Send support message"/);
  assert.match(support, /clearTimeout\(guestReplyTimerRef\.current\)/);
});

test("removes abandoned framework and starter assets", () => {
  for (const path of ["app/page.tsx", "db/schema.ts", "drizzle.config.ts", "next.config.ts", "public/file.svg"]) {
    assert.equal(existsSync(path), false, `${path} should not remain in the canonical project`);
  }
});

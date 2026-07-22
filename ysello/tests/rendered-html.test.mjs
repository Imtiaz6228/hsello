import assert from "node:assert/strict";
import test from "node:test";

async function workerUnderTest() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  return (await import(workerUrl.href)).default;
}

function assets(responses) {
  return {
    fetch: async (request) => {
      const pathname = new URL(request.url).pathname;
      return responses[pathname] ?? new Response("Not found", { status: 404 });
    },
  };
}

test("serves a prerendered public page without falling through to the SPA", async () => {
  const worker = await workerUnderTest();
  const response = await worker.fetch(
    new Request("https://ysello.com/about", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: assets({
        "/about.html": new Response("<!doctype html><h1>About Ysello</h1>", {
          headers: { "content-type": "text/html" },
        }),
      }),
    },
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /About Ysello/);
});

test("marks private SPA routes noindex", async () => {
  const worker = await workerUnderTest();
  const response = await worker.fetch(
    new Request("https://ysello.com/dashboard", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: assets({
        "/index.html": new Response('<!doctype html><div id="root"></div>', {
          headers: { "content-type": "text/html" },
        }),
      }),
    },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("returns a real 404 with noindex for unknown routes", async () => {
  const worker = await workerUnderTest();
  const response = await worker.fetch(
    new Request("https://ysello.com/missing-page", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: assets({
        "/404.html": new Response("<!doctype html><h1>Not found</h1>", {
          headers: { "content-type": "text/html" },
        }),
      }),
    },
  );
  assert.equal(response.status, 404);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.match(await response.text(), /Not found/);
});

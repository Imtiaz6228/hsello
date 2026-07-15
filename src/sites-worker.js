const DEFAULT_API_ORIGIN = "https://hsello-production.up.railway.app";

function upstreamRequest(request, apiOrigin) {
  const url = new URL(request.url);
  const upstream = new URL(`${url.pathname}${url.search}`, apiOrigin);
  return new Request(upstream, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiOrigin = env.API_ORIGIN || DEFAULT_API_ORIGIN;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/") || url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml") {
      return fetch(upstreamRequest(request, apiOrigin));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return response;

    if (url.pathname !== "/" && !url.pathname.includes(".")) {
      const staticPageUrl = new URL(`${url.pathname.replace(/\/$/, "")}.html`, request.url);
      const staticPage = await env.ASSETS.fetch(new Request(staticPageUrl, request));
      if (staticPage.status !== 404) return staticPage;
    }

    const fallbackUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  }
};

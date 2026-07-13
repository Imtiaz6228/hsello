const API_ORIGIN = "https://hsello-production.up.railway.app";

function upstreamRequest(request) {
  const url = new URL(request.url);
  const upstream = new URL(`${url.pathname}${url.search}`, API_ORIGIN);
  return new Request(upstream, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
      return fetch(upstreamRequest(request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return response;

    const fallbackUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  }
};

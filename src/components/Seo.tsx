import { useEffect } from "react";

type SeoProps = { title: string; description: string; canonicalPath?: string; image?: string; schema?: Record<string, unknown>; robots?: string };

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function Seo({ title, description, canonicalPath = location.pathname, image, schema, robots }: SeoProps) {
  useEffect(() => {
    document.title = `${title} · HSello`;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", schema ? "product" : "website");
    setMeta('meta[property="og:url"]', "property", "og:url", `${location.origin}${canonicalPath}`);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="robots"]', "name", "robots", robots ?? (/^\/(dashboard|admin|seller|orders|checkout|support|sign-|register|verify|reset|forgot)/.test(canonicalPath) ? "noindex,nofollow" : "index,follow"));
    const oldImage = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    const oldTwitterImage = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]');
    if (image) {
      setMeta('meta[property="og:image"]', "property", "og:image", image);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    } else {
      oldImage?.remove();
      oldTwitterImage?.remove();
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `${location.origin}${canonicalPath}`;

    const id = "page-structured-data";
    document.getElementById(id)?.remove();
    if (schema) {
      const script = document.createElement("script"); script.id = id; script.type = "application/ld+json";
      script.text = JSON.stringify(schema); document.head.appendChild(script);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, [canonicalPath, description, image, robots, schema, title]);
  return null;
}

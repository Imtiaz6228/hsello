import { useEffect } from "react";

type SeoProps = { title: string; description: string; canonicalPath?: string; image?: string; schema?: Record<string, unknown> };

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function Seo({ title, description, canonicalPath = location.pathname, image, schema }: SeoProps) {
  useEffect(() => {
    document.title = `${title} · HSello`;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", schema ? "product" : "website");
    setMeta('meta[property="og:url"]', "property", "og:url", `${location.origin}${canonicalPath}`);
    if (image) setMeta('meta[property="og:image"]', "property", "og:image", image);

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
  }, [canonicalPath, description, image, schema, title]);
  return null;
}

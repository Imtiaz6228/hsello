import { useEffect, useMemo } from "react";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const configuredOrigin = String(
  import.meta.env.VITE_SITE_URL || window.location.origin,
).replace(/\/$/, "");

function setMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

function absoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `${configuredOrigin}${value.startsWith("/") ? value : `/${value}`}`;
}

export function Seo({
  title,
  description,
  canonicalPath = window.location.pathname,
  image,
  type = "website",
  noIndex = false,
  schema,
}: SeoProps) {
  const schemaText = useMemo(
    () => (schema ? JSON.stringify(schema) : ""),
    [schema],
  );

  useEffect(() => {
    const pageTitle = title.toLowerCase().includes("hsello")
      ? title
      : `${title} · HSello`;
    const canonicalUrl = absoluteUrl(canonicalPath);
    document.title = pageTitle;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      image ? "summary_large_image" : "summary",
    );
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      description,
    );
    if (image) {
      const imageUrl = absoluteUrl(image);
      setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);
    } else {
      removeMeta('meta[property="og:image"]');
      removeMeta('meta[name="twitter:image"]');
    }

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const id = "page-structured-data";
    document.getElementById(id)?.remove();
    if (schemaText) {
      const script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      script.text = schemaText;
      document.head.appendChild(script);
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [canonicalPath, description, image, noIndex, schemaText, title, type]);
  return null;
}

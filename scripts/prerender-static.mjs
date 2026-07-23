import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { blogPosts } from "../src/content/blog.ts";
import { legalPages } from "../src/pages/LegalPage.tsx";
import { publicPages } from "../src/content/publicPages.ts";

const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const configuredSiteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.APP_URL ||
  (vercelHost ? `https://${vercelHost}` : "")
).replace(/\/+$/, "");
if (process.env.VERCEL && !configuredSiteUrl) {
  throw new Error(
    "VITE_SITE_URL is required for production prerendering on Vercel.",
  );
}

const template = await readFile("dist/index.html", "utf8");
const indexRobots =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const noIndexRobots = "noindex, nofollow, noarchive";
const commonLinks = [
  ["/", "Marketplace home"],
  ["/catalog", "Browse products and services"],
  ["/blog", "Buying and selling guides"],
  ["/buyer-protection", "Buyer protection"],
  ["/about", "About Ysello"],
  ["/contact", "Contact and support"],
  ["/refund-policy", "Refund policy"],
  ["/seller-policy", "Seller policy"],
  ["/prohibited-products", "Prohibited products"],
  ["/terms", "Terms and conditions"],
  ["/privacy", "Privacy policy"],
  ["/copyright", "Copyright and IP complaints"],
];

const articlePages = blogPosts.map((post) => ({
  path: `/blog/${post.slug}`,
  title: `${post.title} · Ysello`,
  description: post.excerpt,
  heading: post.title,
  intro: post.excerpt,
  type: "article",
  post,
}));
const pages = [...publicPages, ...articlePages];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absolutePath(path) {
  if (!configuredSiteUrl) return path;
  return `${configuredSiteUrl}${path === "/" ? "" : path}`;
}

function replaceMeta(html, attribute, key, value) {
  const expression = new RegExp(
    `<meta\\s+${attribute}=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function staticNavigation() {
  return `<nav aria-label="Marketplace pages">${commonLinks
    .map(([path, label]) => `<a href="${path}">${escapeHtml(label)}</a>`)
    .join("")}</nav>`;
}

function sectionsMarkup(sections) {
  return sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`,
    )
    .join("");
}

function pageBody(page) {
  const legal = legalPages[page.path];
  const article = "post" in page ? page.post : undefined;
  let content = "";

  if (legal) {
    content = sectionsMarkup(legal.sections);
  } else if (article) {
    content = `<p><time datetime="${article.publishedIso}">${escapeHtml(article.published)}</time> · ${escapeHtml(article.time)} read</p>${sectionsMarkup(article.sections)}`;
  } else if (page.path === "/blog") {
    content = `<section><h2>Latest marketplace guides</h2><ul>${blogPosts.map((post) => `<li><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a><p>${escapeHtml(post.excerpt)}</p></li>`).join("")}</ul></section>`;
  } else if (page.path === "/catalog") {
    content = `<section><h2>What you can explore</h2><p>Browse creative assets, software, education, professional services, and other approved digital listings. Use the live catalog to compare delivery type, price, seller, license, availability, and support terms.</p></section><section><h2>Buy with the important details in view</h2><p>Each public listing should explain what is included, when it is delivered, how it may be used, and what support is available after purchase.</p></section>`;
  } else if (page.path === "/") {
    content = `<section><h2>Explore software, assets, courses, and digital services</h2><p>Compare approved listings, seller information, delivery timing, licensing, and support terms before checkout.</p><div class="seo-link-list"><a href="/catalog">Explore all products</a><a href="/seller-policy">Read seller standards</a><a href="/prohibited-products">Review prohibited products</a></div></section><section><h2>Digital marketplace questions</h2><h3>What can I buy on Ysello?</h3><p>Ysello features approved software, creative assets, business templates, courses, productivity resources, and expert digital services.</p><h3>How does digital delivery work?</h3><p>Each listing explains its delivery method and timing before checkout. Eligible instant downloads are available through the buyer dashboard after payment.</p><h3>Is email verification required?</h3><p>No. New buyers can register and enter their account immediately without an email code or verification link.</p></section>`;
  }

  return `<main class="seo-static-shell"><header><a href="/" aria-label="Ysello home">Ysello Digital Marketplace</a>${staticNavigation()}</header><article><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p>${content}</article></main>`;
}

function structuredData(page, canonical) {
  const siteHome = configuredSiteUrl || "/";
  const article = "post" in page ? page.post : undefined;
  const data = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.publishedIso,
        dateModified: article.publishedIso,
        mainEntityOfPage: canonical,
        author: { "@type": "Organization", name: "Ysello", url: siteHome },
        publisher: { "@type": "Organization", name: "Ysello", url: siteHome },
      }
    : page.path === "/"
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ysello",
            url: siteHome,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Ysello",
            url: siteHome,
            potentialAction: {
              "@type": "SearchAction",
              target: `${configuredSiteUrl}/catalog?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What can I buy on Ysello?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Ysello features approved software, creative assets, business templates, courses, productivity resources, and expert digital services.",
                },
              },
              {
                "@type": "Question",
                name: "How does digital delivery work?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Each listing explains its delivery method and timing before checkout. Eligible instant downloads are available through the buyer dashboard after payment.",
                },
              },
              {
                "@type": "Question",
                name: "Is email verification required?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. New buyers can register and enter their account immediately without an email code or verification link.",
                },
              },
            ],
          },
        ]
      : {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.heading,
          description: page.description,
          url: canonical,
        };
  return `<script id="page-structured-data" type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
}

function replaceRoot(html, body) {
  const expression = /(<div\s+id=["']root["']>)[\s\S]*(<\/div>\s*<\/body>)/i;
  if (!expression.test(html))
    throw new Error("Could not locate the application root in the built HTML.");
  return html.replace(expression, `$1${body}$2`);
}

function renderPage(page, { noIndex = false } = {}) {
  const canonical = absolutePath(page.path);
  const socialImage = absolutePath("/og-default.png");
  const robots = noIndex ? noIndexRobots : indexRobots;
  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(page.title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "name", "robots", robots);
  html = replaceMeta(html, "name", "googlebot", robots);
  html = replaceMeta(html, "name", "bingbot", robots);
  html = replaceMeta(html, "property", "og:site_name", "Ysello");
  html = replaceMeta(html, "property", "og:locale", "en_US");
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:type", page.type ?? "website");
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "property", "og:image", socialImage);
  html = replaceMeta(
    html,
    "property",
    "og:image:alt",
    "Ysello digital marketplace",
  );
  html = replaceMeta(html, "name", "twitter:card", "summary_large_image");
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", socialImage);
  html = replaceMeta(
    html,
    "name",
    "twitter:image:alt",
    "Ysello digital marketplace",
  );
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, "");
  html = html.replace(
    /<script\s+id=["']page-structured-data["'][\s\S]*?<\/script>/i,
    "",
  );
  html = html.replace(
    "</head>",
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />\n    ${structuredData(page, canonical)}\n  </head>`,
  );
  return replaceRoot(html, pageBody(page));
}

for (const page of pages) {
  const output =
    page.path === "/"
      ? "dist/index.html"
      : join("dist", `${page.path.slice(1)}.html`);
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, renderPage(page), "utf8");
}

const notFoundPage = {
  path: "/404",
  title: "Page not found · Ysello",
  description:
    "The requested page could not be found. Browse the Ysello marketplace or return to the homepage.",
  heading: "That page does not exist",
  intro:
    "The address may be outdated or mistyped. Continue with a valid marketplace page below.",
};
await writeFile(
  "dist/404.html",
  renderPage(notFoundPage, { noIndex: true }),
  "utf8",
);

console.log(
  `Prerendered ${pages.length} public routes and a production 404 page${configuredSiteUrl ? ` for ${configuredSiteUrl}` : " with host-relative canonicals"}.`,
);

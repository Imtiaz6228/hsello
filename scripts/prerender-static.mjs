import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const configuredSiteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.APP_URL ||
  (vercelHost ? `https://${vercelHost}` : "")
).replace(/\/$/, "");
if (process.env.VERCEL && !configuredSiteUrl) {
  throw new Error(
    "VITE_SITE_URL is required for production prerendering on Vercel.",
  );
}
const siteUrl = configuredSiteUrl || "http://localhost:5173";
const template = await readFile("dist/index.html", "utf8");

const pages = [
  [
    "/",
    "HSello — trusted digital products and expert services",
    "Discover digital products and expert services with clear delivery terms, reviewed sellers, protected order records, and human support.",
  ],
  [
    "/catalog",
    "Browse digital products · HSello",
    "Explore digital products and services by category, seller, price, and delivery type on HSello.",
  ],
  [
    "/blog",
    "Marketplace field notes · HSello",
    "Practical guides for buying, selling, licensing, delivery, and trust in digital marketplaces.",
  ],
  [
    "/blog/evaluate-digital-product-before-checkout",
    "How to evaluate a digital product before checkout · HSello",
    "A practical way to read licenses, delivery promises, reviews, update terms, and seller policies.",
    "article",
  ],
  [
    "/blog/write-a-trustworthy-product-page",
    "Writing a product page buyers can actually trust · HSello",
    "Specific descriptions reduce disputes. Learn what a trustworthy product page should include.",
    "article",
  ],
  [
    "/blog/why-account-and-credential-trading-is-not-allowed",
    "Why account and credential trading is not allowed · HSello",
    "The security, consent, fraud, and ownership problems created by account and credential trading.",
    "article",
  ],
  [
    "/blog/versioning-digital-downloads",
    "A calm versioning strategy for digital downloads · HSello",
    "How to ship useful updates while keeping existing customers informed and supported.",
    "article",
  ],
  [
    "/terms",
    "Terms and Conditions · HSello",
    "The rules for using HSello as a buyer, seller, or visitor.",
  ],
  [
    "/privacy",
    "Privacy Policy · HSello",
    "What HSello collects, why it is used, and the choices available to you.",
  ],
  [
    "/refund-policy",
    "Refund Policy · HSello",
    "How refund requests are evaluated for downloads and services.",
  ],
  [
    "/seller-policy",
    "Seller Policy · HSello",
    "Standards for approved sellers and every product they publish.",
  ],
  [
    "/buyer-protection",
    "Buyer Protection Policy · HSello",
    "The safeguards around payment, delivery, downloads, and disputes.",
  ],
  [
    "/prohibited-products",
    "Prohibited Products Policy · HSello",
    "Products and services that do not belong on HSello.",
  ],
  [
    "/copyright",
    "Copyright and IP Complaint Policy · HSello",
    "How rights holders can report allegedly infringing marketplace content.",
  ],
  [
    "/contact",
    "Contact · HSello",
    "The right route for support, business, safety, and legal questions.",
  ],
  [
    "/about",
    "About HSello",
    "Why HSello is built around original work, clear delivery, and human support.",
  ],
];

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeAttribute(value);
  const expression = new RegExp(
    `<meta\\s+${attribute}=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escaped}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function renderPage(path, title, description, type = "website") {
  const canonical = `${siteUrl}${path === "/" ? "" : path}`;
  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeAttribute(title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", description);
  html = replaceMeta(
    html,
    "name",
    "robots",
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  );
  html = replaceMeta(html, "property", "og:title", title);
  html = replaceMeta(html, "property", "og:description", description);
  html = replaceMeta(html, "property", "og:type", type);
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "name", "twitter:card", "summary");
  html = replaceMeta(html, "name", "twitter:title", title);
  html = replaceMeta(html, "name", "twitter:description", description);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, "");
  return html.replace(
    "</head>",
    `    <link rel="canonical" href="${escapeAttribute(canonical)}" />\n  </head>`,
  );
}

for (const [path, title, description, type] of pages) {
  const output =
    path === "/"
      ? "dist/index.html"
      : join("dist", `${path.slice(1)}.html`);
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, renderPage(path, title, description, type), "utf8");
}

console.log(`Prerendered ${pages.length} public routes for ${siteUrl}.`);

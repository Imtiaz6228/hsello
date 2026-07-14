import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const pages = [
  ["catalog", "Browse original digital products · HSello", "Explore reviewed digital products and services from verified sellers."],
  ["blog", "Marketplace field notes · HSello", "Practical guides for buying, selling, licensing, delivery, and trust in digital marketplaces."],
  ["terms", "Terms of service · HSello", "Terms governing use of the HSello digital marketplace."],
  ["privacy", "Privacy policy · HSello", "How HSello collects, uses, protects, and retains personal information."],
  ["refund-policy", "Refund policy · HSello", "When and how buyers can request refunds for digital products and services."],
  ["seller-policy", "Seller policy · HSello", "Requirements for verified sellers, original work, accurate listings, and protected delivery."],
  ["buyer-protection", "Buyer protection · HSello", "How payment confirmation, protected delivery, disputes, and support protect HSello buyers."],
  ["prohibited-products", "Prohibited products · HSello", "Products and services that cannot be listed on HSello."],
  ["copyright", "Copyright policy · HSello", "How HSello handles copyright notices and protects original work."],
  ["contact", "Contact HSello", "Contact the HSello marketplace support team."],
  ["about", "About HSello", "Learn how HSello supports trustworthy trade in original digital products and services."]
];

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const indexPath = path.resolve("dist/index.html");
const template = await readFile(indexPath, "utf8");
const siteUrl = process.env.VITE_SITE_URL?.replace(/\/+$/, "");

for (const [route, title, description] of pages) {
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeAttribute(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeAttribute(description)}" />`);
  if (siteUrl) html = html.replace("</head>", `<link rel="canonical" href="${escapeAttribute(`${siteUrl}/${route}`)}" /><meta property="og:url" content="${escapeAttribute(`${siteUrl}/${route}`)}" /></head>`);
  await writeFile(path.resolve(`dist/${route}.html`), html);
}

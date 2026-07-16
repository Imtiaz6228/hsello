export type EnterpriseCategoryDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  parentSlug?: string;
  imageUrl?: string;
  bannerUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
};

const slugify = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function root(slug: string, name: string, description: string, icon: string, order: number, featured = false): EnterpriseCategoryDefinition {
  return { slug, name, description, icon, sortOrder: order, seoTitle: `${name} digital marketplace`, seoDescription: description, metaKeywords: [name, "digital marketplace", "verified sellers"], isFeatured: featured, isTrending: featured };
}

function branch(parentSlug: string, names: string[], order: number, icon: string): EnterpriseCategoryDefinition[] {
  return names.map((name, index) => ({
    slug: `${parentSlug}-${slugify(name)}`,
    parentSlug,
    name,
    description: `Browse verified ${name} listings with clear specifications, delivery terms, region details, and seller support.`,
    icon,
    sortOrder: order + index,
    seoTitle: `${name} marketplace listings`,
    seoDescription: `Compare ${name} products and services from verified marketplace sellers.`,
    metaKeywords: [name, "digital products", "marketplace"]
  }));
}

function matrix(parentSlugs: string[], names: string[], order: number, icon: string): EnterpriseCategoryDefinition[] {
  return parentSlugs.flatMap((parentSlug, parentIndex) => branch(parentSlug, names, order + parentIndex * 100, icon));
}

const gaming = root("gaming", "Gaming", "Game accounts, currency, items, skins, coaching, boosting, top ups, gift cards, and game keys organized by title, server, region, and platform.", "🎮", 1000, true);
const gamingTypes = ["Game Accounts", "Game Currency", "Game Items", "Game Skins", "Game Boosting", "Power Leveling", "Coaching", "Rank Push", "Top Up", "Gift Cards", "Game Keys"];
const gamingTypeNodes = branch(gaming.slug, gamingTypes, 1100, "🎮");
const gameNames = ["PUBG", "Free Fire", "Valorant", "League of Legends", "Dota 2", "Counter Strike 2", "Fortnite", "Apex Legends", "GTA V", "Roblox", "Minecraft", "Call of Duty", "Mobile Legends", "Clash of Clans", "Clash Royale", "Genshin Impact", "Honkai Star Rail", "EA FC", "Diablo", "World of Warcraft", "Final Fantasy XIV", "Lost Ark", "Path of Exile", "Steam", "Epic Games", "Riot Games", "Battle.net", "PlayStation", "Xbox", "Nintendo"];
const gameNodes = matrix(gamingTypeNodes.map((item) => item.slug), gameNames, 2000, "◆");
const accountValorantSlug = "gaming-game-accounts-valorant";
const accountPubgSlug = "gaming-game-accounts-pubg";
const gameDetailNodes = [
  ...branch(accountValorantSlug, ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"], 6000, "V"),
  ...branch(accountPubgSlug, ["Starter Accounts", "Premium Accounts", "Conqueror Accounts", "UC Top Up", "Royale Pass", "Skins"], 6100, "P"),
  ...branch("gaming-game-accounts-league-of-legends", ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"], 6200, "L"),
  ...branch("gaming-game-accounts-mobile-legends", ["Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend", "Mythic", "Mythical Glory"], 6300, "M")
];

const social = root("social-media-marketplace", "Social Media", "Accounts, business assets, audience services, advertising, content growth, and automation organized by social platform.", "◎", 7000, true);
const socialPlatforms = ["Facebook", "Instagram", "TikTok", "YouTube", "Snapchat", "Telegram", "Discord", "Reddit", "LinkedIn", "Pinterest", "Threads", "X Twitter"];
const socialPlatformNodes = branch(social.slug, socialPlatforms, 7100, "@ ");
const socialNodes = matrix(socialPlatformNodes.map((item) => item.slug), ["Accounts", "Followers", "Likes", "Views", "Comments", "Subscribers", "Monetized Accounts", "Verified Accounts", "Business Accounts", "Growth Services", "Advertising Services", "Automation", "Bots"], 8000, "●");

const email = root("email-accounts-marketplace", "Email Accounts", "Email products organized by provider, age, verification, business use, volume, and country.", "✉", 10000, true);
const emailProviders = branch(email.slug, ["Gmail", "Outlook", "Yahoo", "Proton", "Hotmail", "AOL", "Zoho"], 10100, "✉");
const emailNodes = matrix(emailProviders.map((item) => item.slug), ["Fresh", "Aged", "Phone Verified", "Business", "Bulk", "Country Based"], 10500, "✉");

const ai = root("ai-marketplace", "AI", "AI accounts, API resources, credits, subscriptions, prompt packs, templates, and automation for leading platforms.", "✦", 12000, true);
const aiPlatforms = branch(ai.slug, ["ChatGPT", "Claude", "Gemini", "Midjourney", "Runway", "Kling", "ElevenLabs", "Perplexity", "Leonardo", "Flux", "Cursor", "GitHub Copilot"], 12100, "AI");
const aiNodes = matrix(aiPlatforms.map((item) => item.slug), ["Accounts", "API", "Credits", "Subscriptions", "Prompt Packs", "Templates", "Automation"], 12500, "✦");

const software = root("software-marketplace", "Software", "Licensed software, infrastructure, hosting, security, productivity, and remote-access products.", "▣", 15000, true);
const softwarePlatforms = branch(software.slug, ["Windows", "Microsoft Office", "Adobe", "Autodesk", "JetBrains", "Antivirus", "VPN", "Proxy", "RDP", "Hosting", "Domains", "cPanel", "VPS"], 15100, "▣");
const softwareNodes = matrix(softwarePlatforms.map((item) => item.slug), ["License Keys", "Subscriptions", "Setup Service", "Business", "Personal", "Bulk"], 15500, "▣");

const goods = root("digital-goods-marketplace", "Digital Goods", "Downloadable creative assets, code, templates, applications, media, and production resources.", "◇", 18000, true);
const goodsNodes = branch(goods.slug, ["Ebooks", "Templates", "Source Code", "Mobile Apps", "Web Apps", "WordPress", "Shopify", "Graphics", "Fonts", "Video Templates", "LUTs", "Presets", "Music", "SFX", "Plugins", "3D Models", "Printables"], 18100, "◇");
const goodsDetailNodes = matrix(goodsNodes.map((item) => item.slug), ["Single Product", "Bundle", "Commercial License", "Extended License", "Custom Made"], 18500, "◇");

const services = root("professional-services", "Services", "Professional digital services delivered by verified specialists with clear scope, duration, and revision terms.", "◈", 22000, true);
const serviceNodes = branch(services.slug, ["SEO", "Graphic Design", "Video Editing", "Web Development", "App Development", "AI Development", "Marketing", "Copywriting", "Translation", "Data Entry", "Virtual Assistant", "Automation", "Cybersecurity"], 22100, "◈");
const serviceDetailNodes = matrix(serviceNodes.map((item) => item.slug), ["Starter", "Standard", "Premium", "Custom", "Monthly Retainer"], 22500, "◈");

export const enterpriseCatalog: EnterpriseCategoryDefinition[] = [
  gaming, ...gamingTypeNodes, ...gameNodes, ...gameDetailNodes,
  social, ...socialPlatformNodes, ...socialNodes,
  email, ...emailProviders, ...emailNodes,
  ai, ...aiPlatforms, ...aiNodes,
  software, ...softwarePlatforms, ...softwareNodes,
  goods, ...goodsNodes, ...goodsDetailNodes,
  services, ...serviceNodes, ...serviceDetailNodes
];

export const catalogAttributePresets: Record<string, Array<{ key: string; label: string; options: string[]; optional?: boolean }>> = {
  gaming: [
    { key: "server", label: "Server", options: ["Global", "Asia", "Europe", "North America", "South America", "Middle East", "Oceania"], optional: true },
    { key: "region", label: "Region", options: ["Global", "EU", "NA", "SEA", "MENA", "LATAM", "OCE"] },
    { key: "platform", label: "Platform", options: ["PC", "Steam", "Epic Games", "PlayStation", "Xbox", "Nintendo", "Android", "iOS"] },
    { key: "deliveryMethod", label: "Delivery method", options: ["Instant delivery", "Automatic delivery", "Manual delivery", "In-game trade", "Seller service"] }
  ],
  "social-media-marketplace": [
    { key: "region", label: "Account region", options: ["Global", "United States", "United Kingdom", "Europe", "Asia", "MENA", "Other"] },
    { key: "deliveryMethod", label: "Delivery method", options: ["Instant delivery", "Manual transfer", "Seller service"] },
    { key: "condition", label: "Condition", options: ["Fresh", "Aged", "Active", "Business ready", "Verified"] }
  ],
  "email-accounts-marketplace": [
    { key: "country", label: "Country", options: ["Global", "United States", "United Kingdom", "Canada", "Germany", "France", "Pakistan", "India", "Other"] },
    { key: "condition", label: "Condition", options: ["Fresh", "Aged", "Phone verified", "Business", "Bulk"] },
    { key: "stockType", label: "Stock type", options: ["Single", "Pack", "Bulk list"] }
  ],
  "ai-marketplace": [
    { key: "productKind", label: "Product type", options: ["Account", "API", "Credits", "Subscription", "Prompt pack", "Template", "Automation"] },
    { key: "duration", label: "Duration", options: ["One time", "1 month", "3 months", "6 months", "12 months", "Lifetime"] },
    { key: "deliveryMethod", label: "Delivery method", options: ["Instant delivery", "Digital download", "Manual delivery", "Seller setup"] }
  ],
  "software-marketplace": [
    { key: "platform", label: "Platform", options: ["Windows", "macOS", "Linux", "Web", "Android", "iOS", "Multi-platform"] },
    { key: "duration", label: "License duration", options: ["1 month", "3 months", "6 months", "1 year", "Lifetime"] },
    { key: "condition", label: "License type", options: ["Retail", "OEM", "Volume", "Subscription", "Open source"] }
  ]
};

export function catalogRootFor(slug: string, categories = enterpriseCatalog) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  let current = bySlug.get(slug);
  while (current?.parentSlug) current = bySlug.get(current.parentSlug);
  return current?.slug;
}

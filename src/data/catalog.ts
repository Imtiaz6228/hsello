export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentSlug?: string | null;
  parentId?: string | null;
  icon: string;
  sortOrder?: number;
  productCount?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  category: string;
  categorySlug: string;
  title: string;
  description: string;
  longDescription: string;
  seller: string;
  sellerSlug: string;
  priceCents: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  afterSalesServiceHours?: number;
  rating: number;
  reviews: number;
  sales: string;
  delivery: string;
  badge: string;
  type: "DOWNLOAD" | "SERVICE";
  icon: string;
  imageUrl?: string | null;
  stockCount?: number;
};

export const catalogCategories: CatalogCategory[] = [
  { id: "cat-instagram", slug: "instagram", name: "Instagram", description: "Creator-safe Instagram templates, profile resources, content planners, and reporting tools. Accounts, credentials, bots, and fake engagement are not allowed.", icon: "◉", sortOrder: 10 },
  { id: "cat-instagram-reels", slug: "instagram-reels-templates", parentSlug: "instagram", name: "Reels templates", description: "Short-form video structures, hooks, captions, and edit checklists for original Reels.", icon: "◉", sortOrder: 11 },
  { id: "cat-instagram-captions", slug: "instagram-caption-packs", parentSlug: "instagram", name: "Caption packs", description: "Niche caption prompts, launch calendars, and brand voice worksheets.", icon: "◉", sortOrder: 12 },
  { id: "cat-instagram-profile", slug: "instagram-profile-audits", parentSlug: "instagram", name: "Profile audits", description: "Seller-delivered reviews and action plans for legitimate creator profiles.", icon: "◉", sortOrder: 13 },
  { id: "cat-threads", slug: "threads-content-planners", parentSlug: "instagram", name: "Threads planners", description: "Conversation prompts, editorial calendars, and launch templates for Threads.", icon: "@", sortOrder: 14 },

  { id: "cat-facebook", slug: "facebook", name: "Facebook", description: "Facebook page, group, creative, and ad-planning assets for legitimate brands and communities.", icon: "f", sortOrder: 20 },
  { id: "cat-facebook-page", slug: "facebook-page-kits", parentSlug: "facebook", name: "Page kits", description: "Page setup checklists, posting systems, and community management templates.", icon: "f", sortOrder: 21 },
  { id: "cat-facebook-ads", slug: "facebook-ad-creative", parentSlug: "facebook", name: "Ad creative", description: "Ad copy, storyboard, UTM, and compliant creative testing resources.", icon: "f", sortOrder: 22 },
  { id: "cat-facebook-groups", slug: "facebook-group-resources", parentSlug: "facebook", name: "Group resources", description: "Moderation rules, welcome sequences, and engagement calendars for owned communities.", icon: "f", sortOrder: 23 },

  { id: "cat-twitter", slug: "twitter", name: "Twitter / X", description: "Content systems, launch threads, analytics trackers, and brand voice resources for X.", icon: "𝕏", sortOrder: 30 },
  { id: "cat-twitter-threads", slug: "x-thread-playbooks", parentSlug: "twitter", name: "Thread playbooks", description: "Reusable narrative outlines and launch thread frameworks.", icon: "𝕏", sortOrder: 31 },
  { id: "cat-twitter-analytics", slug: "x-analytics-trackers", parentSlug: "twitter", name: "Analytics trackers", description: "Spreadsheet dashboards and review systems for organic publishing.", icon: "𝕏", sortOrder: 32 },

  { id: "cat-discord", slug: "discord", name: "Discord", description: "Server design assets, moderation workflows, onboarding kits, and community templates.", icon: "☯", sortOrder: 40 },
  { id: "cat-discord-server", slug: "discord-server-kits", parentSlug: "discord", name: "Server kits", description: "Channel maps, rules, role plans, and onboarding copy.", icon: "☯", sortOrder: 41 },
  { id: "cat-discord-mod", slug: "discord-moderation-workflows", parentSlug: "discord", name: "Moderation workflows", description: "Ticket, escalation, and community safety workflows.", icon: "☯", sortOrder: 42 },

  { id: "cat-telegram", slug: "telegram", name: "Telegram", description: "Channel publishing resources, bot-safe workflows, announcement templates, and moderation materials.", icon: "✈", sortOrder: 50 },
  { id: "cat-telegram-channel", slug: "telegram-channel-kits", parentSlug: "telegram", name: "Channel kits", description: "Launch calendars, broadcast templates, and audience update systems.", icon: "✈", sortOrder: 51 },
  { id: "cat-telegram-support", slug: "telegram-support-workflows", parentSlug: "telegram", name: "Support workflows", description: "FAQ scripts and support triage systems for Telegram communities.", icon: "✈", sortOrder: 52 },

  { id: "cat-tiktok", slug: "tiktok", name: "TikTok", description: "TikTok planning systems, edit packs, caption frameworks, and analytics resources.", icon: "♪", sortOrder: 60 },
  { id: "cat-tiktok-hooks", slug: "tiktok-hook-libraries", parentSlug: "tiktok", name: "Hook libraries", description: "Opening lines, shot plans, and storyboard prompts for original videos.", icon: "♪", sortOrder: 61 },
  { id: "cat-tiktok-edit", slug: "tiktok-editing-assets", parentSlug: "tiktok", name: "Editing assets", description: "Transitions, overlays, shot lists, and reusable editing checklists.", icon: "♪", sortOrder: 62 },

  { id: "cat-google", slug: "google-series", name: "Google series", description: "Workspace templates, Sheets dashboards, Docs systems, and operational playbooks.", icon: "G", sortOrder: 70 },
  { id: "cat-google-sheets", slug: "google-sheets-dashboards", parentSlug: "google-series", name: "Sheets dashboards", description: "Editable dashboards for campaigns, content, finance, and ops.", icon: "G", sortOrder: 71 },
  { id: "cat-google-workspace", slug: "google-workspace-systems", parentSlug: "google-series", name: "Workspace systems", description: "Docs, Drive, Calendar, and admin workflows for teams.", icon: "G", sortOrder: 72 },

  { id: "cat-ai", slug: "ai-workflows", name: "AI workflows", description: "Prompt systems, review checklists, and practical automations designed for responsible AI usage.", icon: "◎", sortOrder: 80 },
  { id: "cat-ai-prompts", slug: "ai-prompt-systems", parentSlug: "ai-workflows", name: "Prompt systems", description: "Reusable prompt frameworks with human review gates.", icon: "◎", sortOrder: 81 },
  { id: "cat-ai-ops", slug: "ai-operations-playbooks", parentSlug: "ai-workflows", name: "Operations playbooks", description: "Research, writing, support, and operations workflows.", icon: "◎", sortOrder: 82 },

  { id: "cat-email", slug: "email-account", name: "Email & newsletters", description: "Email templates, newsletter systems, deliverability education, and campaign calendars. Email accounts and harvested lists are prohibited.", icon: "✉", sortOrder: 90 },
  { id: "cat-email-campaign", slug: "email-campaign-templates", parentSlug: "email-account", name: "Campaign templates", description: "Welcome, launch, retention, and win-back email systems.", icon: "✉", sortOrder: 91 },
  { id: "cat-email-newsletter", slug: "newsletter-systems", parentSlug: "email-account", name: "Newsletter systems", description: "Editorial calendars, sponsor kits, and measurement trackers.", icon: "✉", sortOrder: 92 }
];

export const categoryDescriptions: Record<string, { name: string; description: string }> = Object.fromEntries(
  catalogCategories.map((category) => [category.slug, { name: category.name, description: category.description }])
);

export const catalogProducts: CatalogProduct[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "instagram-reels-launch-kit",
    category: "Reels templates",
    categorySlug: "instagram-reels-templates",
    title: "Instagram Reels launch kit for creator brands",
    description: "Editable shot lists, hooks, captions, cover layouts, and a 30-day publishing calendar.",
    longDescription: "A practical Reels launch system for legitimate creators and brands. Includes reusable video outlines, caption prompts, visual checklists, and analytics review worksheets. No accounts, credentials, followers, or engagement are sold.",
    seller: "Northstar Studio",
    sellerSlug: "northstar-studio",
    priceCents: 1800,
    priceCnyCents: 12800,
    priceRubCents: 165000,
    afterSalesServiceHours: 24,
    rating: 4.9,
    reviews: 184,
    sales: "2.4k",
    delivery: "Instant download",
    badge: "Popular",
    type: "DOWNLOAD",
    icon: "◉",
    stockCount: 178
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "facebook-ad-creative-library",
    category: "Ad creative",
    categorySlug: "facebook-ad-creative",
    title: "Facebook ad creative testing library",
    description: "Copy angles, storyboards, UTM sheets, naming rules, and review checklists.",
    longDescription: "Plan and test compliant ad creative without starting from blank pages. The pack includes editable copy frameworks, storyboard cards, naming conventions, budget experiment notes, and reporting templates.",
    seller: "Growth Desk",
    sellerSlug: "growth-desk",
    priceCents: 2400,
    priceCnyCents: 17200,
    priceRubCents: 220000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 96,
    sales: "1.3k",
    delivery: "Instant download",
    badge: "Bestseller",
    type: "DOWNLOAD",
    icon: "f",
    stockCount: 92
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "ai-workflow-playbook-small-teams",
    category: "Operations playbooks",
    categorySlug: "ai-operations-playbooks",
    title: "AI workflow playbook for small teams",
    description: "Reusable prompt systems and human-review workflows for research, writing, and support.",
    longDescription: "A vendor-neutral playbook for using AI responsibly at work. Every workflow includes review gates, privacy notes, quality checks, and editable templates. This is educational content, not access to a third-party account.",
    seller: "Neural Desk",
    sellerSlug: "neural-desk",
    priceCents: 3200,
    priceCnyCents: 22900,
    priceRubCents: 295000,
    afterSalesServiceHours: 48,
    rating: 4.9,
    reviews: 211,
    sales: "3.8k",
    delivery: "Instant download",
    badge: "Trending",
    type: "DOWNLOAD",
    icon: "◎",
    stockCount: 64
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "discord-server-community-kit",
    category: "Server kits",
    categorySlug: "discord-server-kits",
    title: "Discord server launch and moderation kit",
    description: "Channel map, role structure, safety rules, welcome copy, and ticket workflows.",
    longDescription: "Launch a clean community server with reusable onboarding assets, moderation policies, escalation templates, and role planning worksheets. Built for creators, educators, and legitimate communities.",
    seller: "Community Forge",
    sellerSlug: "community-forge",
    priceCents: 2700,
    priceCnyCents: 19300,
    priceRubCents: 248000,
    afterSalesServiceHours: 36,
    rating: 4.7,
    reviews: 72,
    sales: "860",
    delivery: "Instant download",
    badge: "New",
    type: "DOWNLOAD",
    icon: "☯",
    stockCount: 39
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    slug: "tiktok-hook-library",
    category: "Hook libraries",
    categorySlug: "tiktok-hook-libraries",
    title: "TikTok hook and storyboard library",
    description: "300 original hooks, scene prompts, caption frameworks, and content calendar blocks.",
    longDescription: "A short-form content library for creating original videos. Includes hooks organized by intent, storyboard prompts, captions, reusable edit notes, and weekly review dashboards.",
    seller: "Clip Supply",
    sellerSlug: "clip-supply",
    priceCents: 2800,
    priceCnyCents: 20000,
    priceRubCents: 258000,
    afterSalesServiceHours: 24,
    rating: 5.0,
    reviews: 143,
    sales: "1.7k",
    delivery: "Instant download",
    badge: "Top rated",
    type: "DOWNLOAD",
    icon: "♪",
    stockCount: 53
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    slug: "instagram-profile-review-session",
    category: "Profile audits",
    categorySlug: "instagram-profile-audits",
    title: "60-minute Instagram profile review and action plan",
    description: "One-to-one review with written feedback, positioning notes, and a prioritized improvement plan.",
    longDescription: "Share your goals and current public profile before the session. Delivery happens in the protected order workspace, where you can message the seller and retain the final notes.",
    seller: "Studio Practice",
    sellerSlug: "studio-practice",
    priceCents: 6500,
    priceCnyCents: 46500,
    priceRubCents: 598000,
    afterSalesServiceHours: 72,
    rating: 4.9,
    reviews: 88,
    sales: "540",
    delivery: "2–3 business days",
    badge: "Service",
    type: "SERVICE",
    icon: "↗",
    stockCount: 8
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    slug: "telegram-channel-launch-calendar",
    category: "Channel kits",
    categorySlug: "telegram-channel-kits",
    title: "Telegram channel launch calendar",
    description: "Broadcast templates, announcement cadence, FAQ blocks, and community update scripts.",
    longDescription: "A channel launch toolkit focused on legitimate owned communities. Use it to schedule announcements, organize recurring updates, and keep support messages consistent.",
    seller: "Signal Studio",
    sellerSlug: "signal-studio",
    priceCents: 1600,
    priceCnyCents: 11400,
    priceRubCents: 147000,
    afterSalesServiceHours: 24,
    rating: 4.6,
    reviews: 61,
    sales: "710",
    delivery: "Instant download",
    badge: "Pinned",
    type: "DOWNLOAD",
    icon: "✈",
    stockCount: 210
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    slug: "google-sheets-content-dashboard",
    category: "Sheets dashboards",
    categorySlug: "google-sheets-dashboards",
    title: "Google Sheets content performance dashboard",
    description: "Editable campaign tracker with dashboards for cost, content output, and weekly review.",
    longDescription: "A flexible Google Sheets workbook with data-entry tabs, charts, weekly review prompts, and campaign health summaries. Works for social, newsletter, and paid creative workflows.",
    seller: "Ops Grid",
    sellerSlug: "ops-grid",
    priceCents: 2100,
    priceCnyCents: 15000,
    priceRubCents: 193000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 127,
    sales: "1.1k",
    delivery: "Instant download",
    badge: "Bundle",
    type: "DOWNLOAD",
    icon: "G",
    stockCount: 45
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    slug: "newsletter-campaign-system",
    category: "Campaign templates",
    categorySlug: "email-campaign-templates",
    title: "Lifecycle email campaign library",
    description: "Conversion-focused welcome, launch, retention, and win-back email templates.",
    longDescription: "A practical library for legitimate opt-in email marketing. Includes editable copy frameworks, layout references, segmentation notes, and deliverability checklists. Customer lists and email accounts are never included.",
    seller: "Inbox Atelier",
    sellerSlug: "inbox-atelier",
    priceCents: 2400,
    priceCnyCents: 17200,
    priceRubCents: 220000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 96,
    sales: "1.3k",
    delivery: "Instant download",
    badge: "Bestseller",
    type: "DOWNLOAD",
    icon: "✉",
    stockCount: 120
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "x-launch-thread-playbook",
    category: "Thread playbooks",
    categorySlug: "x-thread-playbooks",
    title: "X launch thread playbook",
    description: "Thread outlines, launch sequences, idea prompts, and a post-publication review sheet.",
    longDescription: "Build stronger launch threads from reusable structures. Includes narrative arcs, call-to-action variants, ethical disclosure reminders, and analytics review templates.",
    seller: "Narrative Lab",
    sellerSlug: "narrative-lab",
    priceCents: 1900,
    priceCnyCents: 13600,
    priceRubCents: 175000,
    afterSalesServiceHours: 24,
    rating: 4.7,
    reviews: 58,
    sales: "490",
    delivery: "Instant download",
    badge: "Sponsored",
    type: "DOWNLOAD",
    icon: "𝕏",
    stockCount: 37
  }
];

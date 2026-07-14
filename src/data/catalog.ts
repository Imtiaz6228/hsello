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
  downloadLimit?: number;
  buyersGetUpdates?: boolean;
  verifiedReviews?: Array<{
    id: string;
    rating: number;
    body: string;
    createdAt: string;
    buyerName: string;
    sellerResponse?: string | null;
  }>;
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

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
  rating: number;
  reviews: number;
  sales: string;
  delivery: string;
  badge: string;
  type: "DOWNLOAD" | "SERVICE";
  icon: string;
  imageUrl?: string | null;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: "11111111-1111-4111-8111-111111111111", slug: "social-launch-kit", category: "Social media kits",
    categorySlug: "social-media-kits", title: "Complete social launch kit for independent brands",
    description: "120 editable posts, launch checklists, caption prompts, and a commercial-use license.",
    longDescription: "Build a polished launch without starting from an empty canvas. The pack includes editable layouts, reusable story sequences, writing prompts, and an accessible planning workbook. No accounts, credentials, followers, or engagement are sold.",
    seller: "Northstar Studio", sellerSlug: "northstar-studio", priceCents: 1800, rating: 4.9, reviews: 184,
    sales: "2.4k", delivery: "Instant download", badge: "Popular", type: "DOWNLOAD", icon: "✦"
  },
  {
    id: "22222222-2222-4222-8222-222222222222", slug: "email-campaign-library", category: "Email design",
    categorySlug: "email-design", title: "Lifecycle email campaign library",
    description: "Conversion-focused welcome, launch, retention, and win-back email templates.",
    longDescription: "A practical library for legitimate opt-in email marketing. Includes editable copy frameworks, layout references, segmentation notes, and deliverability checklists. Customer lists and email accounts are never included.",
    seller: "Inbox Atelier", sellerSlug: "inbox-atelier", priceCents: 2400, rating: 4.8, reviews: 96,
    sales: "1.3k", delivery: "Instant download", badge: "Bestseller", type: "DOWNLOAD", icon: "@"
  },
  {
    id: "33333333-3333-4333-8333-333333333333", slug: "ai-workflow-playbook", category: "AI workflows",
    categorySlug: "ai-workflows", title: "AI workflow playbook for small teams",
    description: "Reusable prompt systems and human-review workflows for research, writing, and operations.",
    longDescription: "A vendor-neutral playbook for using AI responsibly at work. Every workflow includes review gates, privacy notes, quality checks, and editable templates. This is educational content—not access to a third-party account.",
    seller: "Neural Desk", sellerSlug: "neural-desk", priceCents: 3200, rating: 4.9, reviews: 211,
    sales: "3.8k", delivery: "Instant download", badge: "Trending", type: "DOWNLOAD", icon: "◎"
  },
  {
    id: "44444444-4444-4444-8444-444444444444", slug: "documentary-sound-pack", category: "Audio & video assets",
    categorySlug: "audio-video-assets", title: "Documentary sound and motion pack",
    description: "Royalty-cleared ambient tracks, transitions, lower thirds, and title animations.",
    longDescription: "A production-ready collection for documentary and editorial work. Files are organized by mood and format with a clear commercial license and a searchable cue sheet.",
    seller: "Frame & Field", sellerSlug: "frame-and-field", priceCents: 3900, rating: 4.7, reviews: 72,
    sales: "860", delivery: "Instant download", badge: "New", type: "DOWNLOAD", icon: "▶"
  },
  {
    id: "55555555-5555-4555-8555-555555555555", slug: "indie-game-ui-pack", category: "Game assets",
    categorySlug: "game-assets", title: "Indie game UI and icon system",
    description: "A modular interface kit with 480 icons, menus, HUD elements, and source files.",
    longDescription: "A coherent UI foundation for commercial indie games. Includes vector sources, bitmap exports, a design-token sheet, and implementation notes for common engines.",
    seller: "Pixel Supply", sellerSlug: "pixel-supply", priceCents: 2800, rating: 5.0, reviews: 143,
    sales: "1.7k", delivery: "Instant download", badge: "Top rated", type: "DOWNLOAD", icon: "◆"
  },
  {
    id: "66666666-6666-4666-8666-666666666666", slug: "portfolio-review-session", category: "Expert services",
    categorySlug: "expert-services", title: "60-minute portfolio review and action plan",
    description: "A focused one-to-one review with written feedback and a prioritized improvement plan.",
    longDescription: "Share your goals and current portfolio before the session. Delivery happens in the protected order workspace, where you can message the seller and retain the final notes.",
    seller: "Studio Practice", sellerSlug: "studio-practice", priceCents: 6500, rating: 4.9, reviews: 88,
    sales: "540", delivery: "2–3 business days", badge: "Service", type: "SERVICE", icon: "↗"
  }
];

export const categoryDescriptions: Record<string, { name: string; description: string }> = {
  "social-media-kits": { name: "Social media kits", description: "Original templates, brand systems, content planners, and educational resources for legitimate social publishing." },
  "email-design": { name: "Email design", description: "Opt-in campaign templates, layouts, copy frameworks, and deliverability education—never email accounts or harvested lists." },
  "ai-workflows": { name: "AI workflows", description: "Vendor-neutral prompts, automations, and review systems that help teams use AI responsibly." },
  "audio-video-assets": { name: "Audio & video assets", description: "Licensed music, motion graphics, editing assets, and production templates." },
  "game-assets": { name: "Game assets", description: "Original interface kits, sprites, audio, source files, and educational development resources." },
  "expert-services": { name: "Expert services", description: "Protected, outcome-focused creative and technical services delivered through an order workspace." }
};

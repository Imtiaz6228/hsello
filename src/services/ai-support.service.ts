import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

const KB_ARTICLES = [
  {
    title: "How does escrow protection work?",
    slug: "escrow-protection",
    category: "escrow",
    content: `HSello records every confirmed payment and delivery. A ${env.COMMISSION_SALE_PERCENT}% platform commission is recorded and the seller's net earnings remain frozen for ${env.FROZEN_HOLD_HOURS} hours. Buyers can use the listing-specific after-sales window to raise an issue. Uncontested earnings become available after the hold.`,
  },
  {
    title: "How do I receive my digital delivery?",
    slug: "digital-delivery",
    category: "delivery",
    content: "After confirmed payment, protected download grants appear on the order page and in the dashboard. The product listing defines each grant's expiry and download limit. If a valid grant fails, open an order-linked support ticket.",
  },
  {
    title: "How do I deposit funds?",
    slug: "deposit-funds",
    category: "deposit",
    content: "To add wallet funds, open Wallet, choose one of the configured crypto networks, and create a payment request. Send the exact amount to the displayed address, then submit the transaction ID and screenshot. Staff reviews the proof before crediting the balance.",
  },
  {
    title: "How do withdrawals work?",
    slug: "withdrawal-process",
    category: "withdrawal",
    content: `Sellers can withdraw available—not frozen—earnings. A ${env.COMMISSION_WITHDRAW_PERCENT}% withdrawal fee is shown before submission. Staff verifies the destination and records approval or rejection; rejected requests return the reserved amount.`,
  },
  {
    title: "How do I become a seller?",
    slug: "become-seller",
    category: "seller",
    content: "To become a seller, submit a seller application from your dashboard. You'll need to provide your legal name, address, store name, and verification documents (ID card or passport). Admin will review your application and approve or reject it. Once approved, you can create products and start selling.",
  },
  {
    title: "How do disputes work?",
    slug: "dispute-process",
    category: "dispute",
    content: "If you have an issue with an order, you can open a dispute within the after-sales service window (usually 12+ hours after payment). Both buyer and seller can message in the order chat. If one party doesn't respond within 24 hours, the dispute is automatically closed in favor of the responding party. Admin can also intervene and resolve disputes.",
  },
];

export async function seedKbArticles() {
  for (const article of KB_ARTICLES) {
    await prisma.kbArticle.upsert({
      where: { slug: article.slug },
      create: {
        ...article,
        status: "PUBLISHED",
        excerpt: article.content.slice(0, 160),
        tags: [article.category],
      },
      update: {},
    });
  }
}

async function searchKb(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const articles = await prisma.kbArticle.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 6,
    orderBy: { viewCount: "desc" },
  });

  return articles;
}

const ORDER_REGEX = /\b(HS-[A-Z0-9]+|TK-[A-Z0-9]+)\b/gi;
const TX_REGEX = /\b(0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64})\b/g;

export async function generateAiReply(message: string, userId?: string) {
  // Check for order/tx/withdraw lookup
  const orderMatch = message.match(ORDER_REGEX);
  const txMatch = message.match(TX_REGEX);

  const context: any = {};

  if (orderMatch && userId) {
    const ref = orderMatch[0].toUpperCase();
    const order = await prisma.order.findFirst({
      where: { OR: [{ orderNumber: ref }, { invoiceNumber: ref }] },
      include: { payment: true, items: true },
    });
    if (order) {
      context.order = {
        orderNumber: order.orderNumber,
        status: order.status,
        total: `$${(order.totalCents / 100).toFixed(2)}`,
        paymentStatus: order.payment?.status,
      };
    }

    const topup = await prisma.topupRequest.findFirst({ where: { reference: ref } });
    if (topup) {
      context.topup = {
        reference: topup.reference,
        status: topup.status,
        amount: `$${(topup.amountCents / 100).toFixed(2)}`,
      };
    }
  }

  if (txMatch && userId) {
    const txHash = txMatch[0];
    const topup = await prisma.topupRequest.findFirst({ where: { txHash } });
    if (topup) {
      context.topup = {
        reference: topup.reference,
        status: topup.status,
        amount: `$${(topup.amountCents / 100).toFixed(2)}`,
      };
    }
  }

  // Search KB
  const kbResults = await searchKb(message);

  // Generate reply
  let reply = "";
  if (context.order) {
    reply += `I found your order ${context.order.orderNumber}. Status: ${context.order.status}, Total: ${context.order.total}, Payment: ${context.order.paymentStatus}.\n\n`;
  }
  if (context.topup) {
    reply += `Your deposit ${context.topup.reference} for ${context.topup.amount} is currently ${context.topup.status}.\n\n`;
  }
  if (kbResults.length > 0) {
    reply += `Here's what I found that might help:\n\n`;
    for (const article of kbResults.slice(0, 3)) {
      reply += `📄 ${article.title}\n${article.excerpt ?? article.content.slice(0, 200)}\n\n`;
    }
  }
  if (!reply) {
    reply = `I'm here to help! I can assist with escrow protection, digital delivery, deposits, withdrawals, seller applications, and disputes. You can also paste an order number (e.g., HS-XXXX) or transaction hash for a quick lookup. What can I help you with?`;
  }

  // Quick actions
  const quickActions = ["Where are my downloads?", "How are deposits reviewed?", "How do withdrawals work?"];

  return { reply, quickActions, kbResults, context };
}

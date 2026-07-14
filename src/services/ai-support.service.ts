import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const KB_ARTICLES = [
  {
    title: "How does escrow protection work?",
    slug: "escrow-protection",
    category: "escrow",
    content: "NEXUS uses escrow protection for every purchase. When a buyer pays, the funds are split: 10% commission goes to the admin wallet immediately, and 90% is frozen for 72 hours. During this period, the buyer can open a dispute if there's an issue. After 72 hours, the frozen funds are automatically released to the seller's balance. Download links are signed and valid for 7 days.",
  },
  {
    title: "How do I receive my digital delivery?",
    slug: "digital-delivery",
    category: "delivery",
    content: "After purchase, download links are generated and signed for 7 days of access. You can download your files from the order page or from your dashboard's Downloads tab. Each download link has a maximum number of downloads (usually 5) and expires after 7 days.",
  },
  {
    title: "How do I deposit funds?",
    slug: "deposit-funds",
    category: "deposit",
    content: "To deposit funds, go to your Wallet, click Add Funds, choose a payment method (CRYPTO TRC20/ERC20/BEP20/BTC/ETH/SOL, BANK, PAYPAL, or STRIPE), enter the amount, and send the exact amount to the provided address. Then submit your TXID and screenshot proof. Your deposit will be auto-verified via blockchain explorers or approved by admin.",
  },
  {
    title: "How do withdrawals work?",
    slug: "withdrawal-process",
    category: "withdrawal",
    content: "Sellers can withdraw their available balance. When you request a withdrawal, 3% commission is deducted and sent to the admin wallet. For example, if you withdraw $90, the commission is $2.70 and your net payout is $87.30. Withdrawals are processed after admin approval.",
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

export async function searchKb(query: string) {
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

const ORDER_REGEX = /\b(HS-[A-Z0-9]+|TK-[A-Z0-9]+|NEXUS-[A-Z0-9]+)\b/gi;
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
  const quickActions = ["Regenerate download links", "Re-verify deposit", "Confirm withdrawal address"];

  return { reply, quickActions, kbResults, context };
}

export async function executeQuickAction(action: string, userId: string) {
  switch (action.toLowerCase()) {
    case "regenerate":
    case "regenerate download links": {
      const orders = await prisma.order.findMany({
        where: { buyerId: userId, paidAt: { not: null }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        include: { items: { include: { downloadGrants: true } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      return { message: `Found ${orders.length} recent orders. Download links are available in your dashboard Downloads tab. They are valid for 7 days.` };
    }
    case "re-verify":
    case "re-verify deposit": {
      const topups = await prisma.topupRequest.findMany({
        where: { userId, status: "PENDING" },
        take: 5,
      });
      return { message: `You have ${topups.length} pending deposit(s). They will be auto-verified or approved by admin shortly.` };
    }
    case "confirm":
    case "confirm withdrawal address": {
      const withdrawals = await (prisma as any).withdrawalRequest.findMany({
        where: { userId, status: "PENDING" },
        take: 5,
      });
      return { message: `You have ${withdrawals.length} pending withdrawal(s). Admin will review and process them.` };
    }
    default:
      return { message: "Action not recognized." };
  }
}

export async function transcribeVoice(audioPath: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    return "[Voice transcription unavailable - OPENAI_API_KEY not configured]";
  }
  try {
    // Mock Whisper transcription
    return "This is a mock transcription. Configure OPENAI_API_KEY for real Whisper transcription.";
  } catch {
    return "[Voice transcription failed]";
  }
}

export async function ocrScreenshot(imagePath: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    return "[OCR unavailable - OPENAI_API_KEY not configured]";
  }
  try {
    // Mock GPT-4 Vision OCR
    return "This is a mock OCR result. Configure OPENAI_API_KEY for real GPT-4 Vision OCR.";
  } catch {
    return "[OCR failed]";
  }
}
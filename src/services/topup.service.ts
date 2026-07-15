import { Prisma, TopupMethod, TopupStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

const TOPUP_EXPIRY_HOURS = 24;

const topupAddressBook: Partial<Record<TopupMethod, { label: string; network: string; asset: string; address?: string }>> = {
  CRYPTO_TRC20: { label: "USDT · TRC20", network: "Tron (TRC20)", asset: "USDT", address: env.TOPUP_TRC20_ADDRESS },
  CRYPTO_BEP20: { label: "USDT · BEP20", network: "BNB Smart Chain (BEP20)", asset: "USDT", address: env.TOPUP_BEP20_ADDRESS },
  CRYPTO_ERC20: { label: "USDT · ERC20", network: "Ethereum (ERC20)", asset: "USDT", address: env.TOPUP_ERC20_ADDRESS },
  BTC: { label: "Bitcoin", network: "Bitcoin", asset: "BTC", address: env.TOPUP_BTC_ADDRESS },
  ETH: { label: "Ethereum", network: "Ethereum", asset: "ETH", address: env.TOPUP_ETH_ADDRESS },
  SOL: { label: "Solana", network: "Solana", asset: "SOL", address: env.TOPUP_SOL_ADDRESS }
};

function generateReference() {
  return `NEXUS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function getDepositAddress(method: TopupMethod): string {
  // Network-specific destinations are intentionally explicit: never reuse a
  // generic crypto address label, because buyers must send on the exact chain.
  const address = topupAddressBook[method]?.address;
  if (!address) throw new ApiError(503, "This top-up network is not configured.", "TOPUP_METHOD_UNAVAILABLE");
  return address;
}

export function getTopupMethods() {
  return Object.entries(topupAddressBook)
    .filter((entry): entry is [string, { label: string; network: string; asset: string; address: string }] => Boolean(entry[1]?.address))
    .map(([method, details]) => ({ method: method as TopupMethod, ...details }));
}

export async function createTopupRequest(userId: string, amountCents: number, method: TopupMethod) {
  if (amountCents < 100 || amountCents > 10_000_000) {
    throw new ApiError(400, "Amount must be between $1.00 and $100,000.00.", "TOPUP_AMOUNT_INVALID");
  }

  const reference = generateReference();
  const depositAddress = getDepositAddress(method);
  const expiresAt = new Date(Date.now() + TOPUP_EXPIRY_HOURS * 60 * 60 * 1000);

  const topup = await prisma.topupRequest.create({
    data: {
      userId,
      amountCents,
      method,
      status: TopupStatus.PENDING,
      depositAddress,
      reference,
      expiresAt,
    },
  });

  return {
    topup,
    instructions: getTopupInstructions(topup),
  };
}

function getTopupInstructions(topup: any): string {
  const amount = `$${(topup.amountCents / 100).toFixed(2)}`;
  const methodLabel = topup.method.replace(/_/g, " ");
  return `Send exactly ${amount} via ${methodLabel} to the displayed address. Use reference: ${topup.reference}. After sending, submit your TXID and screenshot proof. Never send on another network. The deposit will be approved by admin after review.`;
}

export async function submitTopupProof(
  userId: string,
  topupId: string,
  txHash: string,
  screenshotPath?: string,
  screenshotUrl?: string
) {
  const topup = await prisma.topupRequest.findFirst({ where: { id: topupId, userId } });
  if (!topup) throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
  if (topup.status !== TopupStatus.PENDING) {
    throw new ApiError(400, "This topup request is already processed.", "TOPUP_ALREADY_PROCESSED");
  }

  const normalizedTxHash = txHash.trim().toLowerCase();
  let updated;
  try {
    updated = await prisma.topupRequest.update({
      where: { id: topupId },
      data: {
        txHash: normalizedTxHash,
        screenshotPath,
        screenshotUrl,
        status: TopupStatus.PENDING,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "This transaction ID has already been submitted.", "TOPUP_TX_REUSED");
    }
    throw error;
  }

  // Credit stays pending until a trusted provider verifies recipient, token,
  // amount and confirmations, or an administrator completes manual review.
  return { topup: updated, autoVerified: false };
}

export async function approveTopup(topupId: string, adminId: string, adminNotes?: string) {
  return prisma.$transaction(async (tx) => {
    const topup = await tx.topupRequest.findUnique({ where: { id: topupId } });
    if (!topup) throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
    if (topup.status !== TopupStatus.PENDING && topup.status !== TopupStatus.VERIFIED) {
      throw new ApiError(409, "This top-up is no longer eligible for approval.", "TOPUP_NOT_APPROVABLE");
    }

    const claimed = await tx.topupRequest.updateMany({
      where: { id: topupId, status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] } },
      data: {
        status: TopupStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
        adminNotes: adminNotes ?? "Approved by admin.",
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError(409, "This top-up was already processed by another request.", "TOPUP_ALREADY_PROCESSED");
    }

    const user = await tx.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
      select: { balanceCents: true },
    });
    await tx.walletTransaction.create({
      data: {
        userId: topup.userId,
        type: "TOPUP",
        amountCents: topup.amountCents,
        description: `Topup via ${topup.method.replace(/_/g, " ")} - ${topup.reference}`,
        reference: topup.reference,
        relatedId: topup.id,
        idempotencyKey: `topup:${topup.id}`,
        balanceAfter: user.balanceCents,
      },
    });

    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectTopup(topupId: string, adminNotes?: string) {
  const topup = await prisma.topupRequest.findUnique({ where: { id: topupId } });
  if (!topup) throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
  const result = await prisma.topupRequest.updateMany({
    where: { id: topupId, status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] } },
    data: { status: TopupStatus.REJECTED, adminNotes: adminNotes ?? "Rejected by admin." },
  });
  if (result.count !== 1) {
    throw new ApiError(409, "This top-up is no longer eligible for rejection.", "TOPUP_NOT_REJECTABLE");
  }
  return prisma.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
}

export async function getTopupRequests(userId?: string) {
  const where = userId ? { userId } : undefined;
  return prisma.topupRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, balanceCents: true } } },
    take: 200,
  });
}

export async function verifyPendingDeposits() {
  // Deliberately fail closed until an exact chain-verification provider is configured.
  return { checked: 0, verified: 0, disabled: true };
}

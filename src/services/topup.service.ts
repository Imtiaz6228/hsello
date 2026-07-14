import { Prisma, TopupMethod, TopupStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import { recordAuditEvent, type AuditContext } from "./audit.service.js";

const TOPUP_EXPIRY_HOURS = 24;

type TopupMethodConfig = {
  method: TopupMethod;
  label: string;
  network: string;
  asset: string;
  address?: string;
};

function configuredMethods(): TopupMethodConfig[] {
  return [
    { method: TopupMethod.CRYPTO_TRC20, label: "USDT · TRC20", network: "Tron (TRC20)", asset: "USDT", address: env.TOPUP_TRC20_ADDRESS },
    { method: TopupMethod.CRYPTO_BEP20, label: "USDT · BEP20", network: "BNB Smart Chain (BEP20)", asset: "USDT", address: env.TOPUP_BEP20_ADDRESS },
    { method: TopupMethod.CRYPTO_ERC20, label: "USDT · ERC20", network: "Ethereum (ERC20)", asset: "USDT", address: env.TOPUP_ERC20_ADDRESS },
    { method: TopupMethod.BTC, label: "Bitcoin", network: "Bitcoin", asset: "BTC", address: env.TOPUP_BTC_ADDRESS },
    { method: TopupMethod.ETH, label: "Ethereum", network: "Ethereum", asset: "ETH", address: env.TOPUP_ETH_ADDRESS },
    { method: TopupMethod.SOL, label: "Solana", network: "Solana", asset: "SOL", address: env.TOPUP_SOL_ADDRESS }
  ];
}

function generateReference() {
  return `HSELLO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function getTopupMethods() {
  return configuredMethods()
    .filter((method): method is TopupMethodConfig & { address: string } => Boolean(method.address))
    .map(({ method, label, network, asset }) => ({ method, label, network, asset }));
}

export async function createTopupRequest(userId: string, amountCents: number, method: TopupMethod) {
  if (amountCents < 100 || amountCents > 10_000_000) {
    throw new ApiError(400, "Amount must be between $1.00 and $100,000.00.", "TOPUP_AMOUNT_INVALID");
  }
  const methodConfig = configuredMethods().find((entry) => entry.method === method && entry.address);
  if (!methodConfig?.address) {
    throw new ApiError(503, "This top-up network is not configured.", "TOPUP_METHOD_UNAVAILABLE");
  }

  const reference = generateReference();
  const topup = await prisma.topupRequest.create({
    data: {
      userId,
      amountCents,
      method,
      status: TopupStatus.PENDING,
      depositAddress: methodConfig.address,
      reference,
      expiresAt: new Date(Date.now() + TOPUP_EXPIRY_HOURS * 60 * 60 * 1000)
    }
  });

  return {
    topup,
    instructions: `Send exactly $${(amountCents / 100).toFixed(2)} via ${methodConfig.label} to the displayed address. Submit the transaction hash afterward. A staff member will verify recipient, asset, amount, and confirmations before approval.`
  };
}

export async function submitTopupProof(
  userId: string,
  topupId: string,
  txHash: string,
  screenshotPath?: string,
  screenshotUrl?: string
) {
  const normalizedHash = txHash.trim().toLowerCase();
  try {
    const updated = await prisma.topupRequest.updateMany({
      where: { id: topupId, userId, status: TopupStatus.PENDING, expiresAt: { gt: new Date() }, txHash: null },
      data: { txHash: normalizedHash, screenshotPath, screenshotUrl, networkVerified: false }
    });
    if (updated.count !== 1) {
      const existing = await prisma.topupRequest.findFirst({ where: { id: topupId, userId } });
      if (!existing) throw new ApiError(404, "Top-up request not found.", "TOPUP_NOT_FOUND");
      throw new ApiError(409, "This top-up is expired, already processed, or already has proof.", "TOPUP_PROOF_ALREADY_SUBMITTED");
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "This transaction hash has already been submitted.", "TOPUP_TX_REUSED");
    }
    throw error;
  }

  const topup = await prisma.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  return { topup, autoVerified: false };
}

export async function approveTopup(topupId: string, adminNotes: string, context: AuditContext) {
  return prisma.$transaction(async (tx) => {
    const topup = await tx.topupRequest.findUnique({ where: { id: topupId } });
    if (!topup) throw new ApiError(404, "Top-up request not found.", "TOPUP_NOT_FOUND");
    if (!topup.txHash) throw new ApiError(409, "Payment proof is required before approval.", "TOPUP_PROOF_REQUIRED");

    const claimed = await tx.topupRequest.updateMany({
      where: { id: topupId, status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] } },
      data: {
        status: TopupStatus.APPROVED,
        approvedById: context.actorId,
        approvedAt: new Date(),
        adminNotes,
        networkVerified: true
      }
    });
    if (claimed.count !== 1) throw new ApiError(409, "Top-up request is already resolved.", "TOPUP_ALREADY_RESOLVED");

    const user = await tx.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
      select: { balanceCents: true }
    });
    await tx.walletTransaction.create({
      data: {
        userId: topup.userId,
        type: "TOPUP",
        amountCents: topup.amountCents,
        description: `Top-up via ${topup.method.replaceAll("_", " ")} · ${topup.reference}`,
        reference: topup.reference,
        relatedId: topup.id,
        idempotencyKey: `topup:${topup.id}`,
        balanceAfter: user.balanceCents
      }
    });
    await recordAuditEvent({
      action: "topup.approved",
      entityType: "TopupRequest",
      entityId: topup.id,
      reason: adminNotes,
      before: { status: topup.status, amountCents: topup.amountCents, txHash: topup.txHash },
      after: { status: TopupStatus.APPROVED, balanceAfter: user.balanceCents },
      context
    }, tx);
    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectTopup(topupId: string, adminNotes: string, context: AuditContext) {
  return prisma.$transaction(async (tx) => {
    const topup = await tx.topupRequest.findUnique({ where: { id: topupId } });
    if (!topup) throw new ApiError(404, "Top-up request not found.", "TOPUP_NOT_FOUND");
    const claimed = await tx.topupRequest.updateMany({
      where: { id: topupId, status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] } },
      data: { status: TopupStatus.REJECTED, adminNotes }
    });
    if (claimed.count !== 1) throw new ApiError(409, "Top-up request is already resolved.", "TOPUP_ALREADY_RESOLVED");
    await recordAuditEvent({
      action: "topup.rejected",
      entityType: "TopupRequest",
      entityId: topup.id,
      reason: adminNotes,
      before: { status: topup.status },
      after: { status: TopupStatus.REJECTED },
      context
    }, tx);
    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getTopupRequests(userId?: string, take = 50, cursor?: string) {
  return prisma.topupRequest.findMany({
    where: userId ? { userId } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, balanceCents: true } } },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });
}

import { TopupMethod, TopupStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import { cacheGet, cacheSet } from "../lib/redis.js";

const TOPUP_EXPIRY_HOURS = 24;

function generateReference() {
  return `NEXUS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function getDepositAddress(method: TopupMethod): string {
  // Network-specific destinations are intentionally explicit: never reuse a
  // generic crypto address label, because buyers must send on the exact chain.
  const addresses: Partial<Record<TopupMethod, string>> = {
    CRYPTO_TRC20: "TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W",
    CRYPTO_BEP20: "0x5fe0bc617b00812396560e00a47b68a4d19933df",
    CRYPTO_ERC20: "0x5fe0bc617b00812396560e00a47b68a4d19933df",
    BTC: "1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA",
    SOL: "5K8sYDqmmMDeVMDcJjzmwdX2MGMwqCeNNnpDd82tXdf",
    ETH: "0x5fe0bc617b00812396560e00a47b68a4d19933df"
  };
  return addresses[method] ?? env.ADMIN_WALLET_ADDRESS ?? "NEXUS-ADMIN-WALLET";
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

  const updated = await prisma.topupRequest.update({
    where: { id: topupId },
    data: {
      txHash,
      screenshotPath,
      screenshotUrl,
      status: TopupStatus.PENDING,
    },
  });

  // Try auto-verification
  const verified = await autoVerifyTopup(updated);
  return { topup: verified, autoVerified: verified.status === TopupStatus.VERIFIED };
}

async function autoVerifyTopup(topup: any): Promise<any> {
  try {
    const cacheKey = `topup-verify:${topup.id}`;
    const cached = await cacheGet<boolean>(cacheKey);
    if (cached) {
      return topup;
    }

    let verified = false;

    if (topup.method === TopupMethod.CRYPTO_TRC20 && topup.txHash) {
      verified = await verifyTronTransaction(topup.txHash, topup.depositAddress, topup.amountCents);
    } else if ((topup.method === TopupMethod.CRYPTO_ERC20 || topup.method === TopupMethod.ETH) && topup.txHash) {
      verified = await verifyEtherscanTransaction(topup.txHash, topup.depositAddress, topup.amountCents);
    } else if (topup.method === TopupMethod.CRYPTO_BEP20 && topup.txHash) {
      verified = await verifyBscTransaction(topup.txHash, topup.depositAddress, topup.amountCents);
    }

    if (verified) {
      const updated = await prisma.topupRequest.update({
        where: { id: topup.id },
        data: { status: TopupStatus.VERIFIED, networkVerified: true },
      });
      await cacheSet(cacheKey, true, 3600);
      return updated;
    }

    await cacheSet(cacheKey, false, 60);
    return topup;
  } catch (error) {
    console.error("[topup] auto-verification failed:", error);
    return topup;
  }
}

async function verifyTronTransaction(txHash: string, address: string, expectedAmountCents: number): Promise<boolean> {
  if (!env.TRONGRID_API_KEY) return false;
  try {
    const response = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, {
      headers: { "TRON-PRO-API-KEY": env.TRONGRID_API_KEY },
    });
    if (!response.ok) return false;
    const data = await response.json() as any;
    return Boolean(data?.data?.length);
  } catch {
    return false;
  }
}

async function verifyEtherscanTransaction(txHash: string, address: string, expectedAmountCents: number): Promise<boolean> {
  if (!env.ETHERSCAN_API_KEY) return false;
  try {
    const response = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${env.ETHERSCAN_API_KEY}`
    );
    if (!response.ok) return false;
    const data = await response.json() as any;
    return Boolean(data?.result?.hash);
  } catch {
    return false;
  }
}

async function verifyBscTransaction(txHash: string, address: string, expectedAmountCents: number): Promise<boolean> {
  if (!env.BSCSCAN_API_KEY) return false;
  try {
    const response = await fetch(
      `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${env.BSCSCAN_API_KEY}`
    );
    if (!response.ok) return false;
    const data = await response.json() as any;
    return Boolean(data?.result?.hash);
  } catch {
    return false;
  }
}

export async function approveTopup(topupId: string, adminId: string, adminNotes?: string) {
  const topup = await prisma.topupRequest.findUnique({ where: { id: topupId } });
  if (!topup) throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
  if (topup.status === TopupStatus.APPROVED) throw new ApiError(400, "Topup already approved.", "TOPUP_ALREADY_APPROVED");
  if (topup.status === TopupStatus.REJECTED) throw new ApiError(400, "Topup already rejected.", "TOPUP_ALREADY_REJECTED");

  const result = await prisma.$transaction([
    prisma.topupRequest.update({
      where: { id: topupId },
      data: {
        status: TopupStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
        adminNotes: adminNotes ?? "Approved by admin.",
      },
    }),
    prisma.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: topup.userId,
        type: "TOPUP",
        amountCents: topup.amountCents,
        description: `Topup via ${topup.method.replace(/_/g, " ")} - ${topup.reference}`,
        reference: topup.reference,
        relatedId: topup.id,
      },
    }),
  ]);

  return result[0];
}

export async function rejectTopup(topupId: string, adminNotes?: string) {
  const topup = await prisma.topupRequest.findUnique({ where: { id: topupId } });
  if (!topup) throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
  if (topup.status === TopupStatus.APPROVED) throw new ApiError(400, "Cannot reject an approved topup.", "TOPUP_ALREADY_APPROVED");

  return prisma.topupRequest.update({
    where: { id: topupId },
    data: { status: TopupStatus.REJECTED, adminNotes: adminNotes ?? "Rejected by admin." },
  });
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
  const pending = await prisma.topupRequest.findMany({
    where: {
      status: TopupStatus.PENDING,
      txHash: { not: null },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    take: 50,
  });

  let verifiedCount = 0;
  for (const topup of pending) {
    const result = await autoVerifyTopup(topup);
    if (result.status === TopupStatus.VERIFIED) verifiedCount++;
  }

  return { checked: pending.length, verified: verifiedCount };
}

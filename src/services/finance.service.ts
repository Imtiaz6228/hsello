import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

const HOLD_DAYS = 3;
const withdrawalStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);

function payoutReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function sellerFundsAvailableAt(from = new Date()) {
  return new Date(from.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);
}

export async function releaseAvailableSellerEarnings(userId?: string) {
  const where: any = { status: "FROZEN", availableAt: { lte: new Date() } };
  if (userId) where.sellerId = userId;
  return prisma.$transaction(async (tx) => {
    const earnings = await (tx as any).sellerEarning.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: { id: true, sellerId: true, netCents: true }
    });
    let releasedCount = 0;
    let releasedCents = 0;

    for (const earning of earnings) {
      const claimed = await (tx as any).sellerEarning.updateMany({
        where: { id: earning.id, status: "FROZEN" },
        data: { status: "AVAILABLE", releasedAt: new Date() }
      });
      if (claimed.count !== 1) continue;

      const user = await tx.user.update({
        where: { id: earning.sellerId },
        data: { balanceCents: { increment: earning.netCents } },
        select: { balanceCents: true }
      });
      await tx.walletTransaction.create({
        data: {
          userId: earning.sellerId,
          type: "FROZEN_RELEASE",
          amountCents: earning.netCents,
          description: "Seller earning released from the marketplace hold.",
          relatedId: earning.id,
          idempotencyKey: `earning-release:${earning.id}`,
          balanceAfter: user.balanceCents
        }
      });
      releasedCount += 1;
      releasedCents += earning.netCents;
    }

    return { releasedCount, releasedCents };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createSellerEarningsForOrderItems(tx: any, items: Array<{ id: string; sellerId: string; totalCents: number }>, paidAt: Date) {
  const availableAt = sellerFundsAvailableAt(paidAt);
  for (const item of items) {
    await tx.sellerEarning.upsert({
      where: { orderItemId: item.id },
      create: {
        sellerId: item.sellerId,
        orderItemId: item.id,
        grossCents: item.totalCents,
        platformFeeCents: 0,
        netCents: item.totalCents,
        status: "FROZEN",
        availableAt
      },
      update: {}
    });
  }
}

export async function reverseSellerEarningsForOrder(orderId: string) {
  const earnings = await (prisma as any).sellerEarning.findMany({
    where: { orderItem: { orderId }, status: { in: ["FROZEN", "AVAILABLE"] } },
    select: { id: true, sellerId: true, netCents: true, status: true }
  });
  if (!earnings.length) return;
  await prisma.$transaction(async (tx) => {
    for (const earning of earnings) {
      if (earning.status === "AVAILABLE") {
        await tx.user.update({ where: { id: earning.sellerId }, data: { balanceCents: { decrement: earning.netCents } } });
      }
      await (tx as any).sellerEarning.update({ where: { id: earning.id }, data: { status: "REFUNDED" } });
    }
  });
}

export async function getWalletSummary(userId: string) {
  await releaseAvailableSellerEarnings(userId);
  const [user, frozen, pendingWithdrawals, withdrawals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { balanceCents: true } }),
    (prisma as any).sellerEarning.aggregate({ where: { sellerId: userId, status: "FROZEN" }, _sum: { netCents: true } }),
    (prisma as any).withdrawalRequest.aggregate({ where: { userId, status: "PENDING" }, _sum: { amountCents: true } }),
    (prisma as any).withdrawalRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  return {
    balanceCents: user?.balanceCents ?? 0,
    availableBalanceCents: user?.balanceCents ?? 0,
    frozenSellerBalanceCents: frozen._sum.netCents ?? 0,
    pendingWithdrawalCents: pendingWithdrawals._sum.amountCents ?? 0,
    withdrawals
  };
}

export async function getSellerFinanceSummary(sellerId: string) {
  await releaseAvailableSellerEarnings(sellerId);
  const [wallet, frozen, availableEarnings, totalEarnings, withdrawals, todayEarnings, todayOrders] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { balanceCents: true } }),
    (prisma as any).sellerEarning.aggregate({ where: { sellerId, status: "FROZEN" }, _sum: { netCents: true } }),
    (prisma as any).sellerEarning.aggregate({ where: { sellerId, status: "AVAILABLE" }, _sum: { netCents: true } }),
    (prisma as any).sellerEarning.aggregate({ where: { sellerId, status: { in: ["FROZEN", "AVAILABLE", "WITHDRAWN"] } }, _sum: { netCents: true }, _count: true }),
    (prisma as any).withdrawalRequest.aggregate({ where: { userId: sellerId, status: { in: ["PENDING", "APPROVED"] } }, _sum: { amountCents: true } }),
    (prisma as any).sellerEarning.aggregate({ where: { sellerId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }, _sum: { netCents: true } }),
    (prisma as any).sellerEarning.count({ where: { sellerId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } })
  ]);
  return {
    availableBalanceCents: wallet?.balanceCents ?? 0,
    frozenBalanceCents: frozen._sum.netCents ?? 0,
    releasedSellerEarningsCents: availableEarnings._sum.netCents ?? 0,
    totalSellerEarningsCents: totalEarnings._sum.netCents ?? 0,
    totalSellerEarningCount: totalEarnings._count ?? 0,
    withdrawnCents: withdrawals._sum.amountCents ?? 0,
    todayIncomeCents: todayEarnings._sum.netCents ?? 0,
    todayOrderCount: todayOrders
  };
}

export async function createWithdrawalRequest(userId: string, input: { amountCents: number; blockchain: string; walletAddress: string }) {
  await releaseAvailableSellerEarnings(userId);
  if (input.amountCents < 500) throw new ApiError(400, "Minimum withdrawal is $5.00.", "WITHDRAWAL_MINIMUM");

  return prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: { id: userId, balanceCents: { gte: input.amountCents } },
      data: { balanceCents: { decrement: input.amountCents } }
    });
    if (debited.count !== 1) {
      throw new ApiError(402, "Insufficient available balance for this withdrawal.", "INSUFFICIENT_FUNDS");
    }
    const request = await (tx as any).withdrawalRequest.create({
      data: {
        userId,
        amountCents: input.amountCents,
        blockchain: input.blockchain,
        walletAddress: input.walletAddress,
        status: "PENDING",
        providerReference: payoutReference("WD")
      }
    });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } });
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "WITHDRAWAL",
        amountCents: -input.amountCents,
        description: `Withdrawal requested on ${input.blockchain}.`,
        reference: request.providerReference,
        relatedId: request.id,
        idempotencyKey: `withdrawal-request:${request.id}`,
        balanceAfter: user.balanceCents
      }
    });
    return request;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewWithdrawalRequest(id: string, action: "approve" | "reject", adminNotes?: string) {
  if (!withdrawalStatuses.has(action === "approve" ? "APPROVED" : "REJECTED")) throw new ApiError(400, "Invalid withdrawal status.", "WITHDRAWAL_STATUS_INVALID");

  return prisma.$transaction(async (tx) => {
    const request = await (tx as any).withdrawalRequest.findUnique({ where: { id } });
    if (!request) throw new ApiError(404, "Withdrawal request not found.", "WITHDRAWAL_NOT_FOUND");
    const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const claimed = await (tx as any).withdrawalRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: nextStatus,
        adminNotes: adminNotes ?? (action === "approve"
          ? "Approved for payout. Settlement still requires a provider or blockchain reference."
          : "Rejected by admin."),
        processedAt: action === "reject" ? new Date() : null
      }
    });
    if (claimed.count !== 1) {
      throw new ApiError(409, "This withdrawal was already processed by another request.", "WITHDRAWAL_ALREADY_PROCESSED");
    }

    if (action === "reject") {
      const user = await tx.user.update({
        where: { id: request.userId },
        data: { balanceCents: { increment: request.amountCents } },
        select: { balanceCents: true }
      });
      await tx.walletTransaction.create({
        data: {
          userId: request.userId,
          type: "ADJUSTMENT",
          amountCents: request.amountCents,
          description: "Rejected withdrawal returned to available balance.",
          reference: request.providerReference,
          relatedId: request.id,
          idempotencyKey: `withdrawal-rejection:${request.id}`,
          balanceAfter: user.balanceCents
        }
      });
    }

    return (tx as any).withdrawalRequest.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

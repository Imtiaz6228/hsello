import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import { recordAuditEvent, type AuditContext } from "./audit.service.js";

function payoutReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function sellerFundsAvailableAt(from = new Date()) {
  return new Date(from.getTime() + env.FROZEN_HOLD_HOURS * 60 * 60 * 1000);
}

export async function releaseAvailableSellerEarnings(userId?: string) {
  return prisma.$transaction(async (tx) => {
    const earnings = await tx.sellerEarning.findMany({
      where: {
        status: "FROZEN",
        availableAt: { lte: new Date() },
        ...(userId ? { sellerId: userId } : {})
      },
      select: { id: true, sellerId: true, netCents: true }
    });

    let releasedCount = 0;
    let releasedCents = 0;
    for (const earning of earnings) {
      const claimed = await tx.sellerEarning.updateMany({
        where: { id: earning.id, status: "FROZEN", availableAt: { lte: new Date() } },
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
          description: "Seller earning released after the buyer-protection hold.",
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

export async function createSellerEarningsForOrderItems(
  tx: Prisma.TransactionClient,
  items: Array<{ id: string; sellerId: string; totalCents: number }>,
  paidAt: Date
) {
  const availableAt = sellerFundsAvailableAt(paidAt);
  for (const item of items) {
    const platformFeeCents = Math.round(item.totalCents * env.COMMISSION_SALE_PERCENT / 100);
    await tx.sellerEarning.upsert({
      where: { orderItemId: item.id },
      create: {
        sellerId: item.sellerId,
        orderItemId: item.id,
        grossCents: item.totalCents,
        platformFeeCents,
        netCents: item.totalCents - platformFeeCents,
        status: "FROZEN",
        availableAt
      },
      update: {}
    });
  }
}

export async function reverseSellerEarningsForOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const earnings = await tx.sellerEarning.findMany({
      where: { orderItem: { orderId }, status: { in: ["FROZEN", "AVAILABLE"] } },
      select: { id: true, sellerId: true, netCents: true, status: true }
    });

    for (const earning of earnings) {
      const claimed = await tx.sellerEarning.updateMany({
        where: { id: earning.id, status: earning.status },
        data: { status: "REFUNDED" }
      });
      if (claimed.count !== 1 || earning.status !== "AVAILABLE") continue;

      const seller = await tx.user.findUnique({ where: { id: earning.sellerId }, select: { balanceCents: true } });
      const recoverable = Math.min(seller?.balanceCents ?? 0, earning.netCents);
      if (recoverable > 0) {
        const user = await tx.user.update({
          where: { id: earning.sellerId },
          data: { balanceCents: { decrement: recoverable } },
          select: { balanceCents: true }
        });
        await tx.walletTransaction.create({
          data: {
            userId: earning.sellerId,
            type: "REFUND",
            amountCents: -recoverable,
            description: `Seller earning reversed for refunded order ${orderId}.`,
            orderId,
            relatedId: earning.id,
            idempotencyKey: `earning-refund:${earning.id}`,
            balanceAfter: user.balanceCents
          }
        });
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getWalletSummary(userId: string) {
  await releaseAvailableSellerEarnings(userId);
  const [user, frozen, pendingWithdrawals, withdrawals, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { balanceCents: true } }),
    prisma.sellerEarning.aggregate({ where: { sellerId: userId, status: "FROZEN" }, _sum: { netCents: true } }),
    prisma.withdrawalRequest.aggregate({ where: { userId, status: "PENDING" }, _sum: { amountCents: true } }),
    prisma.withdrawalRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return {
    balanceCents: user?.balanceCents ?? 0,
    availableBalanceCents: user?.balanceCents ?? 0,
    frozenSellerBalanceCents: frozen._sum.netCents ?? 0,
    pendingWithdrawalCents: pendingWithdrawals._sum.amountCents ?? 0,
    withdrawals,
    transactions
  };
}

export async function getSellerFinanceSummary(sellerId: string) {
  await releaseAvailableSellerEarnings(sellerId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [wallet, frozen, availableEarnings, totalEarnings, withdrawals, todayEarnings, todayOrders] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { balanceCents: true } }),
    prisma.sellerEarning.aggregate({ where: { sellerId, status: "FROZEN" }, _sum: { netCents: true } }),
    prisma.sellerEarning.aggregate({ where: { sellerId, status: "AVAILABLE" }, _sum: { netCents: true } }),
    prisma.sellerEarning.aggregate({ where: { sellerId, status: { in: ["FROZEN", "AVAILABLE", "WITHDRAWN"] } }, _sum: { netCents: true }, _count: true }),
    prisma.withdrawalRequest.aggregate({ where: { userId: sellerId, status: { in: ["PENDING", "APPROVED"] } }, _sum: { amountCents: true } }),
    prisma.sellerEarning.aggregate({ where: { sellerId, createdAt: { gte: startOfDay } }, _sum: { netCents: true } }),
    prisma.sellerEarning.count({ where: { sellerId, createdAt: { gte: startOfDay } } })
  ]);
  return {
    availableBalanceCents: wallet?.balanceCents ?? 0,
    frozenBalanceCents: frozen._sum.netCents ?? 0,
    releasedSellerEarningsCents: availableEarnings._sum.netCents ?? 0,
    totalSellerEarningsCents: totalEarnings._sum.netCents ?? 0,
    totalSellerEarningCount: totalEarnings._count ?? 0,
    withdrawnCents: withdrawals._sum.amountCents ?? 0,
    todayIncomeCents: todayEarnings._sum.netCents ?? 0,
    todayOrderCount: todayOrders,
    saleCommissionPercent: env.COMMISSION_SALE_PERCENT,
    withdrawalCommissionPercent: env.COMMISSION_WITHDRAW_PERCENT
  };
}

export async function createWithdrawalRequest(userId: string, input: { amountCents: number; blockchain: string; walletAddress: string }) {
  await releaseAvailableSellerEarnings(userId);
  if (input.amountCents < 500) throw new ApiError(400, "Minimum withdrawal is $5.00.", "WITHDRAWAL_MINIMUM");
  const feeCents = Math.round(input.amountCents * env.COMMISSION_WITHDRAW_PERCENT / 100);
  const totalDebitCents = input.amountCents + feeCents;

  return prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: { id: userId, balanceCents: { gte: totalDebitCents } },
      data: { balanceCents: { decrement: totalDebitCents } }
    });
    if (debited.count !== 1) throw new ApiError(402, "Insufficient available balance for this withdrawal and fee.", "INSUFFICIENT_FUNDS");

    const request = await tx.withdrawalRequest.create({
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
    await tx.walletTransaction.createMany({
      data: [
        {
          userId,
          type: "WITHDRAWAL",
          amountCents: -input.amountCents,
          description: `Withdrawal requested on ${input.blockchain}.`,
          reference: request.providerReference,
          relatedId: request.id,
          idempotencyKey: `withdrawal:${request.id}`,
          balanceAfter: user.balanceCents
        },
        {
          userId,
          type: "COMMISSION_WITHDRAW",
          amountCents: -feeCents,
          description: `Withdrawal fee (${env.COMMISSION_WITHDRAW_PERCENT}%).`,
          reference: request.providerReference,
          relatedId: request.id,
          idempotencyKey: `withdrawal-fee:${request.id}`,
          balanceAfter: user.balanceCents
        }
      ]
    });
    return { ...request, feeCents, totalDebitCents };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewWithdrawalRequest(
  id: string,
  action: "approve" | "reject",
  adminNotes: string,
  context: AuditContext
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({ where: { id } });
    if (!request) throw new ApiError(404, "Withdrawal request not found.", "WITHDRAWAL_NOT_FOUND");

    const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const claimed = await tx.withdrawalRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: nextStatus, adminNotes, processedAt: new Date() }
    });
    if (claimed.count !== 1) throw new ApiError(409, "Withdrawal request is already resolved.", "WITHDRAWAL_ALREADY_RESOLVED");

    if (action === "reject") {
      const feeCents = Math.round(request.amountCents * env.COMMISSION_WITHDRAW_PERCENT / 100);
      const refunded = request.amountCents + feeCents;
      const user = await tx.user.update({
        where: { id: request.userId },
        data: { balanceCents: { increment: refunded } },
        select: { balanceCents: true }
      });
      await tx.walletTransaction.create({
        data: {
          userId: request.userId,
          type: "REFUND",
          amountCents: refunded,
          description: "Rejected withdrawal returned to wallet, including its fee.",
          reference: request.providerReference,
          relatedId: request.id,
          idempotencyKey: `withdrawal-rejected:${request.id}`,
          balanceAfter: user.balanceCents
        }
      });
    }

    await recordAuditEvent({
      action: `withdrawal.${nextStatus.toLowerCase()}`,
      entityType: "WithdrawalRequest",
      entityId: id,
      reason: adminNotes,
      before: { status: request.status },
      after: { status: nextStatus },
      context
    }, tx);
    return tx.withdrawalRequest.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

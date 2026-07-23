import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
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
  const earnings = await (prisma as any).sellerEarning.findMany({
    where,
    select: { id: true, sellerId: true, netCents: true },
  });
  if (!earnings.length) return { releasedCount: 0, releasedCents: 0 };

  const bySeller = new Map<string, number>();
  for (const earning of earnings)
    bySeller.set(
      earning.sellerId,
      (bySeller.get(earning.sellerId) ?? 0) + earning.netCents,
    );

  await prisma.$transaction(async (tx) => {
    await (tx as any).sellerEarning.updateMany({
      where: {
        id: { in: earnings.map((earning: any) => earning.id) },
        status: "FROZEN",
      },
      data: { status: "AVAILABLE", releasedAt: new Date() },
    });
    for (const [sellerId, cents] of bySeller.entries()) {
      await tx.user.update({
        where: { id: sellerId },
        data: { balanceCents: { increment: cents } },
      });
    }
  });

  return {
    releasedCount: earnings.length,
    releasedCents: earnings.reduce(
      (sum: number, earning: any) => sum + earning.netCents,
      0,
    ),
  };
}

export async function createSellerEarningsForOrderItems(
  tx: any,
  orderId: string,
  paidTotalCents: number,
  items: Array<{ id: string; sellerId: string; totalCents: number }>,
  paidAt: Date,
) {
  const availableAt = sellerFundsAvailableAt(paidAt);
  const itemSubtotalCents = items.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );
  let allocatedCents = 0;
  for (const [index, item] of items.entries()) {
    const grossCents =
      index === items.length - 1
        ? Math.max(0, paidTotalCents - allocatedCents)
        : Math.max(
            0,
            Math.min(
              paidTotalCents - allocatedCents,
              Math.round(
                (paidTotalCents * item.totalCents) /
                  Math.max(1, itemSubtotalCents),
              ),
            ),
          );
    allocatedCents += grossCents;
    const platformFeeCents = Math.round(
      (grossCents * env.COMMISSION_SALE_PERCENT) / 100,
    );
    const netCents = grossCents - platformFeeCents;
    await tx.sellerEarning.upsert({
      where: { orderItemId: item.id },
      create: {
        sellerId: item.sellerId,
        orderItemId: item.id,
        grossCents,
        platformFeeCents,
        netCents,
        status: "FROZEN",
        availableAt,
      },
      update: {},
    });
    await tx.adminTransaction.upsert({
      where: {
        type_reference: { type: "COMMISSION_SALE", reference: item.id },
      },
      create: {
        type: "COMMISSION_SALE",
        amountCents: platformFeeCents,
        description: `${env.COMMISSION_SALE_PERCENT}% marketplace fee`,
        reference: item.id,
        orderId,
      },
      update: {},
    });
  }
}

export async function reverseSellerEarningsForOrder(orderId: string) {
  const earnings = await (prisma as any).sellerEarning.findMany({
    where: { orderItem: { orderId }, status: { in: ["FROZEN", "AVAILABLE"] } },
    select: { id: true, sellerId: true, netCents: true, status: true },
  });
  if (!earnings.length) return;
  await prisma.$transaction(async (tx) => {
    for (const earning of earnings) {
      if (earning.status === "AVAILABLE") {
        await tx.user.update({
          where: { id: earning.sellerId },
          data: { balanceCents: { decrement: earning.netCents } },
        });
      }
      await (tx as any).sellerEarning.update({
        where: { id: earning.id },
        data: { status: "REFUNDED" },
      });
    }
  });
}

export async function getWalletSummary(userId: string) {
  await releaseAvailableSellerEarnings(userId);
  const [user, frozen, pendingWithdrawals, withdrawals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balanceCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId: userId, status: "FROZEN" },
      _sum: { netCents: true },
    }),
    (prisma as any).withdrawalRequest.aggregate({
      where: { userId, status: "PENDING" },
      _sum: { amountCents: true },
    }),
    (prisma as any).withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    balanceCents: user?.balanceCents ?? 0,
    availableBalanceCents: user?.balanceCents ?? 0,
    frozenSellerBalanceCents: frozen._sum.netCents ?? 0,
    pendingWithdrawalCents: pendingWithdrawals._sum.amountCents ?? 0,
    withdrawals,
  };
}

export async function getSellerFinanceSummary(sellerId: string) {
  await releaseAvailableSellerEarnings(sellerId);
  const [
    wallet,
    frozen,
    availableEarnings,
    totalEarnings,
    withdrawals,
    todayEarnings,
    todayOrders,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { balanceCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: "FROZEN" },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: "AVAILABLE" },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: { in: ["FROZEN", "AVAILABLE", "WITHDRAWN"] } },
      _sum: { netCents: true },
      _count: true,
    }),
    (prisma as any).withdrawalRequest.aggregate({
      where: { userId: sellerId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amountCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: {
        sellerId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.count({
      where: {
        sellerId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
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
  };
}

export async function createWithdrawalRequest(
  userId: string,
  input: { amountCents: number; blockchain: string; walletAddress: string },
) {
  await releaseAvailableSellerEarnings(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balanceCents: true },
  });
  if (!user) throw new ApiError(404, "User not found.", "USER_NOT_FOUND");
  if (input.amountCents < 500)
    throw new ApiError(
      400,
      "Minimum withdrawal is $5.00.",
      "WITHDRAWAL_MINIMUM",
    );
  if (user.balanceCents < input.amountCents)
    throw new ApiError(
      402,
      "Insufficient available balance for this withdrawal.",
      "INSUFFICIENT_FUNDS",
    );

  const request = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { decrement: input.amountCents } },
    });
    return (tx as any).withdrawalRequest.create({
      data: {
        userId,
        amountCents: input.amountCents,
        blockchain: input.blockchain,
        walletAddress: input.walletAddress,
        status: "PENDING",
        providerReference: payoutReference("WD"),
      },
    });
  });
  return request;
}

export async function reviewWithdrawalRequest(
  id: string,
  action: "approve" | "reject",
  adminNotes?: string,
) {
  const request = await (prisma as any).withdrawalRequest.findUnique({
    where: { id },
  });
  if (!request)
    throw new ApiError(
      404,
      "Withdrawal request not found.",
      "WITHDRAWAL_NOT_FOUND",
    );
  if (request.status !== "PENDING")
    throw new ApiError(
      400,
      "Withdrawal request is not pending.",
      "WITHDRAWAL_NOT_PENDING",
    );
  if (!withdrawalStatuses.has(action === "approve" ? "APPROVED" : "REJECTED"))
    throw new ApiError(
      400,
      "Invalid withdrawal status.",
      "WITHDRAWAL_STATUS_INVALID",
    );

  if (action === "reject") {
    const [updated] = await prisma.$transaction([
      (prisma as any).withdrawalRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes ?? "Rejected by admin.",
          processedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { balanceCents: { increment: request.amountCents } },
      }),
    ]);
    return updated;
  }

  return (prisma as any).withdrawalRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      adminNotes: adminNotes ?? "Approved by admin.",
      processedAt: new Date(),
    },
  });
}

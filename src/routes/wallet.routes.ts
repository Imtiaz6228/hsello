import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";

export const walletRouter = Router();

walletRouter.use(requireAuth, requireVerifiedUser);

walletRouter.get("/balance", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.id },
    select: { balanceCents: true }
  });
  res.json({ balanceCents: user?.balanceCents ?? 0 });
}));

walletRouter.get("/deposits", asyncHandler(async (req, res) => {
  const deposits = await prisma.walletDeposit.findMany({
    where: { userId: req.auth!.id },
    orderBy: { createdAt: "desc" }
  });
  res.json({ deposits });
}));

const depositSchema = z.object({
  amountCents: z.number().int().min(100).max(500000),
  method: z.enum(["CARD", "CRYPTO", "PAYPAL"])
});

walletRouter.post("/deposit", asyncHandler(async (req, res) => {
  const input = depositSchema.parse(req.body);

  const deposit = await prisma.walletDeposit.create({
    data: {
      userId: req.auth!.id,
      amountCents: input.amountCents,
      method: input.method,
      status: "PENDING",
      providerReference: `DEP-${Date.now().toString(36).toUpperCase()}`
    }
  });

  res.status(201).json({
    message: `$${(input.amountCents / 100).toFixed(2)} deposit request submitted with ${input.method === "CRYPTO" ? "crypto" : input.method === "PAYPAL" ? "PayPal" : "card"}. Admin will review and approve.`,
    deposit
  });
}));

walletRouter.patch("/deposits/:id/approve", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const deposit = await prisma.walletDeposit.findUnique({ where: { id } });

  if (!deposit) throw new ApiError(404, "Deposit not found.", "DEPOSIT_NOT_FOUND");
  if (deposit.status !== "PENDING") throw new ApiError(400, "Deposit is not in PENDING status.", "DEPOSIT_NOT_PENDING");

  const result = await prisma.$transaction([
    prisma.walletDeposit.update({
      where: { id },
      data: {
        status: "COMPLETED",
        adminNotes: "Approved by staff."
      }
    }),
    prisma.user.update({
      where: { id: deposit.userId },
      data: { balanceCents: { increment: deposit.amountCents } }
    })
  ]);

  res.json({ message: "Deposit approved and balance updated.", deposit: result[0] });
}));

walletRouter.patch("/deposits/:id/reject", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ adminNotes: z.string().trim().max(500).optional() }).parse(req.body);
  const deposit = await prisma.walletDeposit.findUnique({ where: { id } });

  if (!deposit) throw new ApiError(404, "Deposit not found.", "DEPOSIT_NOT_FOUND");
  if (deposit.status !== "PENDING") throw new ApiError(400, "Deposit is not in PENDING status.", "DEPOSIT_NOT_PENDING");

  const updated = await prisma.walletDeposit.update({
    where: { id },
    data: { status: "REJECTED", adminNotes: input.adminNotes }
  });

  res.json({ message: "Deposit rejected.", deposit: updated });
}));

// Purchase with wallet balance
walletRouter.post("/purchase", asyncHandler(async (req, res) => {
  const input = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20).default(1),
    method: z.enum(["BANK_TRANSFER", "CRYPTO", "MANUAL"]).default("MANUAL")
  }).parse(req.body);

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || product.status !== "APPROVED") throw new ApiError(404, "Product is not available.", "PRODUCT_UNAVAILABLE");

  const totalCents = product.priceCents * input.quantity;
  const user = await prisma.user.findUnique({ where: { id: req.auth!.id } });

  if (!user) throw new ApiError(401, "Session invalid.", "SESSION_INVALID");

  if (user.balanceCents < totalCents) {
    throw new ApiError(402, `Insufficient wallet balance. You need $${(totalCents / 100).toFixed(2)} but have $${(user.balanceCents / 100).toFixed(2)}.`, "INSUFFICIENT_FUNDS");
  }

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.auth!.id },
      data: { balanceCents: { decrement: totalCents } }
    }),
    prisma.order.create({
      data: {
        orderNumber,
        invoiceNumber,
        buyerId: req.auth!.id,
        status: "COMPLETED",
        currency: "USD",
        subtotalCents: totalCents,
        totalCents,
        buyerEmail: user.email,
        buyerName: `${user.firstName} ${user.lastName}`,
        paidAt: new Date(),
        completedAt: new Date(),
        items: {
          create: {
            productId: product.id,
            sellerId: product.sellerId,
            productName: product.name,
            quantity: input.quantity,
            unitPriceCents: product.priceCents,
            totalCents
          }
        }
      }
    })
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: req.auth!.id },
    select: { balanceCents: true }
  });

  res.status(201).json({
    message: "Purchase completed with wallet balance.",
    orderNumber,
    balanceCents: updatedUser?.balanceCents ?? 0
  });
}));
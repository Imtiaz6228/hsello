import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { createWalletCheckout } from "../services/payment.service.js";

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

walletRouter.patch("/deposits/:id/approve", requireRole(Role.ADMIN, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
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

walletRouter.patch("/deposits/:id/reject", requireRole(Role.ADMIN, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
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
const walletItemsSchema = z.array(z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1)
})).min(1).max(30);

walletRouter.post("/purchase-cart", asyncHandler(async (req, res) => {
  const input = z.object({ items: walletItemsSchema }).parse(req.body);
  const result = await createWalletCheckout(req.auth!.id, input.items);
  res.status(201).json({
    message: "Purchase completed with wallet balance. Downloads are ready in your dashboard.",
    ...result
  });
}));

walletRouter.post("/purchase", asyncHandler(async (req, res) => {
  const input = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20).default(1)
  }).parse(req.body);

  const result = await createWalletCheckout(req.auth!.id, [{ productId: input.productId, quantity: input.quantity }]);
  res.status(201).json({
    message: "Purchase completed with wallet balance. Downloads are ready in your dashboard.",
    ...result
  });
}));

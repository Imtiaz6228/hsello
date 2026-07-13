import { Router } from "express";
import { Role, TopupMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { createWalletCheckout } from "../services/payment.service.js";
import { createWithdrawalRequest, getWalletSummary, releaseAvailableSellerEarnings } from "../services/finance.service.js";
import { imageUpload, publicUploadUrl } from "../middleware/upload.js";
import { createTopupRequest, getTopupRequests, submitTopupProof } from "../services/topup.service.js";

export const walletRouter = Router();

walletRouter.use(requireAuth, requireVerifiedUser);

walletRouter.get("/balance", asyncHandler(async (req, res) => {
  const summary = await getWalletSummary(req.auth!.id);
  res.json(summary);
}));

walletRouter.get("/deposits", asyncHandler(async (req, res) => {
  const deposits = await getTopupRequests(req.auth!.id);
  res.json({ deposits });
}));


walletRouter.get("/withdrawals", asyncHandler(async (req, res) => {
  await releaseAvailableSellerEarnings(req.auth!.id);
  const withdrawals = await (prisma as any).withdrawalRequest.findMany({
    where: { userId: req.auth!.id },
    orderBy: { createdAt: "desc" }
  });
  res.json({ withdrawals });
}));

walletRouter.post("/withdrawals", asyncHandler(async (req, res) => {
  const input = z.object({
    amountCents: z.number().int().min(500).max(100_000_000),
    blockchain: z.string().trim().min(2).max(80),
    walletAddress: z.string().trim().min(12).max(240)
  }).parse(req.body);
  const withdrawal = await createWithdrawalRequest(req.auth!.id, input);
  const summary = await getWalletSummary(req.auth!.id);
  res.status(201).json({
    message: "Withdrawal request submitted. It will stay pending until admin approves and marks it successful.",
    withdrawal,
    ...summary
  });
}));

const cryptoTopupSchema = z.object({
  amountCents: z.number().int().min(100).max(10_000_000),
  method: z.enum([
    TopupMethod.CRYPTO_TRC20, TopupMethod.CRYPTO_BEP20, TopupMethod.CRYPTO_ERC20,
    TopupMethod.BTC, TopupMethod.ETH, TopupMethod.SOL
  ])
});

walletRouter.post("/topups", asyncHandler(async (req, res) => {
  const input = cryptoTopupSchema.parse(req.body);
  const result = await createTopupRequest(req.auth!.id, input.amountCents, input.method);
  res.status(201).json({
    message: "Payment request created. Send the exact amount only on the selected network, then submit the TXID and screenshot.",
    ...result
  });
}));

walletRouter.post("/topups/:id/proof", imageUpload.single("screenshot"), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z.object({ txHash: z.string().trim().min(6).max(300) }).parse(req.body);
  if (!req.file) throw new ApiError(400, "Upload a payment screenshot as proof.", "TOPUP_SCREENSHOT_REQUIRED");
  const result = await submitTopupProof(
    req.auth!.id,
    id,
    input.txHash,
    req.file.path,
    publicUploadUrl(req.file.filename)
  );
  res.status(201).json({
    message: result.autoVerified ? "Transaction found. It is ready for final approval." : "Payment proof submitted. An administrator will review it before your balance is credited.",
    ...result
  });
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

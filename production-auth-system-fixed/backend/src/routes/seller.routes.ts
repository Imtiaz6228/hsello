import { Router } from "express";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { sellerApplicationSchema } from "../schemas/seller.schemas.js";
import {
  getSellerApplicationForUser,
  submitSellerApplication
} from "../services/seller.service.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireVerifiedUser);

sellerRouter.get("/application", asyncHandler(async (req, res) => {
  const application = await getSellerApplicationForUser(req.auth!.id);

  res.json({ application });
}));

sellerRouter.post("/application", asyncHandler(async (req, res) => {
  const input = sellerApplicationSchema.parse(req.body);
  const application = await submitSellerApplication(req.auth!.id, input);

  res.status(201).json({
    message: "Seller application submitted successfully.",
    application
  });
}));

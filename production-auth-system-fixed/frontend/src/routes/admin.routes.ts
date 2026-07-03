import { Router } from "express";
import { Role, SellerApplicationStatus } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole, requireVerifiedUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { sellerReviewSchema } from "../schemas/seller.schemas.js";
import {
  listSellerApplications,
  reviewSellerApplication
} from "../services/seller.service.js";
import { listUsersForAdministration, updateUserRole } from "../services/user.service.js";

export const adminRouter = Router();

const requireStaff = requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);

adminRouter.use(requireAuth, requireVerifiedUser);

adminRouter.get("/seller-applications", requireStaff, asyncHandler(async (req, res) => {
  const querySchema = z.object({
    status: z.nativeEnum(SellerApplicationStatus).optional()
  });
  const query = querySchema.parse(req.query);
  const applications = await listSellerApplications(query.status);

  res.json({ applications });
}));

adminRouter.patch("/seller-applications/:id", requireStaff, asyncHandler(async (req, res) => {
  const input = sellerReviewSchema.parse(req.body);
  const applicationId = z.string().uuid().parse(req.params.id);
  const application = await reviewSellerApplication(
    applicationId,
    req.auth!.id,
    input.status,
    input.adminNotes
  );

  res.json({
    message: "Seller application reviewed successfully.",
    application
  });
}));

adminRouter.get(
  "/users",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await listUsersForAdministration();
    res.json({
      users: users.map((user) => ({
        ...user,
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: undefined
      }))
    });
  })
);

adminRouter.patch(
  "/users/:id/role",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
    const userId = z.string().uuid().parse(req.params.id);
    const user = await updateUserRole(req.auth!.id, userId, input.role);
    res.json({ message: "User role updated successfully.", user });
  })
);

import { z } from "zod";
import { SellerApplicationStatus } from "@prisma/client";
import { emailSchema, phoneSchema, requiredConsent, usernameSchema } from "./shared.js";

const productCategoriesSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}, z.array(z.string().trim().min(2).max(80)).min(1).max(12));

export const sellerApplicationSchema = z.object({
  userName: usernameSchema,
  fullLegalName: z.string().trim().min(2).max(160),
  phoneNumber: phoneSchema,
  email: emailSchema,
  country: z.string().trim().min(2).max(80),
  stateProvince: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  fullAddress: z.string().trim().min(5).max(240),
  postalCode: z.string().trim().min(2).max(24),
  storeName: z.string().trim().min(2).max(120),
  documentName: z.string().trim().min(2).max(160),
  documentType: z.enum(["ID_CARD", "PASSPORT"]),
  documentNumber: z.string().trim().min(4).max(64),
  storeDescription: z.string().trim().min(20).max(2000),
  productCategories: productCategoriesSchema,
  termsAccepted: requiredConsent("You must accept the seller terms.")
});

export const sellerReviewSchema = z.object({
  status: z.nativeEnum(SellerApplicationStatus),
  adminNotes: z.string().trim().max(1000).optional()
}).refine((value) => value.status !== SellerApplicationStatus.PENDING, {
  path: ["status"],
  message: "Choose Approved or Rejected for a review decision."
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

import { SellerApplicationStatus } from "@prisma/client";
import { sendSellerApplicationNotification } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
export async function submitSellerApplication(userId, input) {
    const existing = await prisma.sellerApplication.findUnique({
        where: { userId }
    });
    if (existing) {
        throw new ApiError(409, "A seller application already exists for this account.", "APPLICATION_EXISTS");
    }
    const application = await prisma.sellerApplication.create({
        data: {
            userId,
            ...input
        }
    });
    await sendSellerApplicationNotification(application.storeName, application.email);
    return application;
}
export function getSellerApplicationForUser(userId) {
    return prisma.sellerApplication.findUnique({
        where: { userId }
    });
}
export function listSellerApplications(status) {
    return prisma.sellerApplication.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true
                }
            },
            reviewer: {
                select: {
                    id: true,
                    email: true,
                    username: true
                }
            }
        }
    });
}
export async function reviewSellerApplication(id, reviewerId, status, adminNotes) {
    const application = await prisma.sellerApplication.findUnique({
        where: { id }
    });
    if (!application) {
        throw new ApiError(404, "Seller application not found.", "APPLICATION_NOT_FOUND");
    }
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const updated = await tx.sellerApplication.update({
            where: { id },
            data: {
                status,
                adminNotes,
                reviewedAt: now,
                reviewedById: reviewerId
            }
        });
        if (status === SellerApplicationStatus.APPROVED) {
            await tx.user.update({
                where: { id: application.userId },
                data: { role: "SELLER" }
            });
        }
        if (status === SellerApplicationStatus.REJECTED) {
            await tx.user.updateMany({
                where: {
                    id: application.userId,
                    role: "SELLER"
                },
                data: { role: "CUSTOMER" }
            });
        }
        return updated;
    });
}

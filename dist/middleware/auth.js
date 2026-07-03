import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "./error-handler.js";
export const requireAuth = async (req, _res, next) => {
    try {
        const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
        if (!token) {
            throw new ApiError(401, "Authentication required.", "AUTH_REQUIRED");
        }
        const payload = jwt.verify(token, env.JWT_SECRET);
        if (!payload.sub) {
            throw new ApiError(401, "Invalid session.", "SESSION_INVALID");
        }
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                emailVerifiedAt: true
            }
        });
        if (!user) {
            throw new ApiError(401, "Invalid session.", "SESSION_INVALID");
        }
        req.auth = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            emailVerified: Boolean(user.emailVerifiedAt)
        };
        next();
    }
    catch (error) {
        if (error instanceof ApiError) {
            next(error);
            return;
        }
        next(new ApiError(401, "Invalid or expired session.", "SESSION_INVALID"));
    }
};
export const requireVerifiedUser = (req, _res, next) => {
    if (!req.auth?.emailVerified) {
        next(new ApiError(403, "Please verify your email address first.", "EMAIL_UNVERIFIED"));
        return;
    }
    next();
};
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            next(new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN"));
            return;
        }
        next();
    };
}

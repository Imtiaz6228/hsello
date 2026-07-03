import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "../lib/cookies.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { publicUploadUrl } from "../middleware/upload.js";
import { ApiError } from "../middleware/error-handler.js";
export function publicUser(user) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        country: user.country,
        city: user.city,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
        createdAt: user.createdAt
    };
}
function addHours(hours) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}
function addDays(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function signAccessToken(user) {
    return jwt.sign({
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt)
    }, env.JWT_SECRET, {
        subject: user.id,
        expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`
    });
}
async function createEmailVerificationToken(userId) {
    await prisma.emailVerificationToken.deleteMany({
        where: {
            userId,
            consumedAt: null
        }
    });
    const token = randomToken(48);
    await prisma.emailVerificationToken.create({
        data: {
            userId,
            tokenHash: sha256(token),
            expiresAt: addHours(24)
        }
    });
    return token;
}
async function createPasswordResetToken(userId) {
    await prisma.passwordResetToken.deleteMany({
        where: {
            userId,
            consumedAt: null
        }
    });
    const token = randomToken(48);
    await prisma.passwordResetToken.create({
        data: {
            userId,
            tokenHash: sha256(token),
            expiresAt: addHours(1)
        }
    });
    return token;
}
export async function createSession(user, req, rememberMe) {
    const refreshToken = randomToken(64);
    const expiresAt = rememberMe
        ? addDays(env.REFRESH_TOKEN_DAYS)
        : addHours(env.SHORT_REFRESH_TOKEN_HOURS);
    await prisma.refreshSession.create({
        data: {
            userId: user.id,
            tokenHash: sha256(refreshToken),
            rememberMe,
            userAgent: req.get("user-agent"),
            ipAddress: req.ip,
            expiresAt
        }
    });
    return {
        accessToken: signAccessToken(user),
        refreshToken,
        rememberMe
    };
}
export async function registerUser(input, file) {
    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { email: input.email },
                { username: input.username }
            ]
        },
        select: {
            email: true,
            username: true
        }
    });
    if (existing) {
        throw new ApiError(409, "Email or username is already in use.", "ACCOUNT_EXISTS", {
            email: existing.email === input.email,
            username: existing.username === input.username
        });
    }
    const user = await prisma.user.create({
        data: {
            firstName: input.firstName,
            lastName: input.lastName,
            username: input.username,
            email: input.email,
            phone: input.phone,
            country: input.country,
            city: input.city,
            profileImageUrl: file ? publicUploadUrl(file.filename) : undefined,
            passwordHash: await hashPassword(input.password)
        }
    });
    const verificationToken = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.firstName, verificationToken);
    return publicUser(user);
}
export async function loginUser(input, req) {
    const invalidError = new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw invalidError;
    }
    const passwordMatches = await verifyPassword(user.passwordHash, input.password);
    if (!passwordMatches) {
        throw invalidError;
    }
    const session = await createSession(user, req, input.rememberMe);
    return {
        user: publicUser(user),
        session
    };
}
export async function refreshUserSession(refreshToken, req) {
    if (!refreshToken) {
        throw new ApiError(401, "Refresh session required.", "REFRESH_REQUIRED");
    }
    const session = await prisma.refreshSession.findUnique({
        where: { tokenHash: sha256(refreshToken) },
        include: { user: true }
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new ApiError(401, "Refresh session is invalid or expired.", "REFRESH_INVALID");
    }
    await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
    });
    const nextSession = await createSession(session.user, req, session.rememberMe);
    return {
        user: publicUser(session.user),
        session: nextSession
    };
}
export async function logoutUser(refreshToken) {
    if (!refreshToken) {
        return;
    }
    await prisma.refreshSession.updateMany({
        where: {
            tokenHash: sha256(refreshToken),
            revokedAt: null
        },
        data: { revokedAt: new Date() }
    });
}
export async function verifyEmailToken(token) {
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true }
    });
    if (!tokenRecord || tokenRecord.consumedAt || tokenRecord.expiresAt <= new Date()) {
        throw new ApiError(400, "Verification link is invalid or expired.", "TOKEN_INVALID");
    }
    await prisma.$transaction([
        prisma.emailVerificationToken.update({
            where: { id: tokenRecord.id },
            data: { consumedAt: new Date() }
        }),
        prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? new Date() }
        })
    ]);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: tokenRecord.userId } });
    return publicUser(user);
}
export async function resendVerification(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
        return;
    }
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.firstName, token);
}
export async function requestPasswordReset(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return;
    }
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, user.firstName, token);
}
export async function resetPassword(token, password) {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true }
    });
    if (!tokenRecord || tokenRecord.consumedAt || tokenRecord.expiresAt <= new Date()) {
        throw new ApiError(400, "Reset link is invalid or expired.", "TOKEN_INVALID");
    }
    await prisma.$transaction([
        prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { passwordHash: await hashPassword(password) }
        }),
        prisma.passwordResetToken.updateMany({
            where: {
                userId: tokenRecord.userId,
                consumedAt: null
            },
            data: { consumedAt: new Date() }
        }),
        prisma.refreshSession.updateMany({
            where: {
                userId: tokenRecord.userId,
                revokedAt: null
            },
            data: { revokedAt: new Date() }
        })
    ]);
}
export async function changePassword(userId, currentPassword, password) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const passwordMatches = await verifyPassword(user.passwordHash, currentPassword);
    if (!passwordMatches) {
        throw new ApiError(400, "Current password is incorrect.", "PASSWORD_INCORRECT");
    }
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { passwordHash: await hashPassword(password) }
        }),
        prisma.refreshSession.updateMany({
            where: {
                userId,
                revokedAt: null
            },
            data: { revokedAt: new Date() }
        })
    ]);
}
export async function getCurrentUser(userId) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return publicUser(user);
}
export async function getAvailability(email, username) {
    const [emailUser, usernameUser] = await Promise.all([
        email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
        username ? prisma.user.findUnique({ where: { username } }) : Promise.resolve(null)
    ]);
    return {
        emailAvailable: email ? !emailUser : undefined,
        usernameAvailable: username ? !usernameUser : undefined
    };
}
export function getRefreshTokenFromRequest(req) {
    return req.cookies?.[REFRESH_TOKEN_COOKIE];
}
export function clearSessionCookies(res) {
    clearAuthCookies(res);
}
export function isUniqueConstraintError(error) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

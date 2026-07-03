import { verifyAccessToken, extractToken } from '../lib/jwt.mjs';
import { prisma } from '../lib/prisma.mjs';

/**
 * Middleware: Require authentication
 * Attaches req.user with the authenticated user data
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        city: true,
        profileImageUrl: true,
        role: true,
        emailVerifiedAt: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Require specific roles
 * Usage: requireRoles('ADMIN', 'SELLER')
 */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. This action requires one of the following roles: ' + roles.join(', '),
      });
    }

    next();
  };
}

/**
 * Middleware: Require email verification
 */
export function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!req.user.emailVerifiedAt) {
    return res.status(403).json({
      error: 'Email verification required. Please verify your email to access this feature.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
}

/**
 * Middleware: Optional authentication
 * Attaches req.user if authenticated, but doesn't block the request
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        city: true,
        profileImageUrl: true,
        role: true,
        emailVerifiedAt: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user && !user.isBanned) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}
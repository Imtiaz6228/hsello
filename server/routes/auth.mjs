import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.mjs';
import { generateTokenPair, verifyRefreshToken, setAuthCookies, clearAuthCookies, extractToken } from '../lib/jwt.mjs';
import { hashToken, generateToken, sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.mjs';
import { validateRegistration, validateLogin, validateForgotPassword, validateResetPassword } from '../lib/validation.mjs';
import { requireAuth } from '../middleware/auth.mjs';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateRegistration(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Check for existing user
    const existingEmail = await prisma.user.findUnique({ where: { email: sanitized.email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_EXISTS' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: sanitized.username } });
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken.', code: 'USERNAME_EXISTS' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(sanitized.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: sanitized.email,
        username: sanitized.username,
        firstName: sanitized.firstName,
        lastName: sanitized.lastName,
        phone: sanitized.phone,
        country: sanitized.country,
        city: sanitized.city,
        passwordHash,
        role: 'CUSTOMER',
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
      },
    });

    // Generate email verification token
    const verificationToken = generateToken();
    const tokenHash = hashToken(verificationToken);

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens);

    // Store refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: 'Registration successful. Please verify your email address.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        city: user.city,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user
 */
router.post('/login', async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateLogin(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email: sanitized.email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(sanitized.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    // Check if banned
    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended.', code: 'ACCOUNT_BANNED' });
    }

    // Generate tokens
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens);

    // Store refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        city: user.city,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    // Revoke refresh tokens
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash, userId: req.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    clearAuthCookies(res);

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.', code: 'NO_REFRESH_TOKEN' });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token.', code: 'INVALID_REFRESH_TOKEN' });
    }

    // Check if token was revoked
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.revokedAt) {
      // Revoke all tokens for this user (potential token reuse)
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token has been revoked.', code: 'TOKEN_REVOKED' });
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.isBanned) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found or banned.', code: 'USER_INVALID' });
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date(), replacedBy: 'rotated' },
    });

    // Generate new tokens
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens);

    // Store new refresh token
    const newTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: user.id,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: 'Token refreshed.',
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        city: user.city,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.', code: 'TOKEN_REQUIRED' });
    }

    const tokenHash = hashToken(token);

    // Find valid token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid verification token.', code: 'INVALID_TOKEN' });
    }

    if (verificationToken.usedAt) {
      return res.status(400).json({ error: 'This token has already been used.', code: 'TOKEN_USED' });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This verification link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });
    }

    // Mark token as used
    await prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    // Verify user's email
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: verificationToken.userId,
        actorEmail: verificationToken.user.email,
        actorRole: verificationToken.user.role,
        action: 'EMAIL_VERIFIED',
        entityType: 'USER',
        entityId: verificationToken.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    if (req.user.emailVerifiedAt) {
      return res.status(400).json({ error: 'Email is already verified.', code: 'ALREADY_VERIFIED' });
    }

    // Invalidate old tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: req.user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate new token
    const verificationToken = generateToken();
    const tokenHash = hashToken(verificationToken);

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: req.user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    await sendVerificationEmail(user, verificationToken);

    res.json({ message: 'Verification email sent.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateForgotPassword(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Always respond with the same message regardless of whether the email exists
    const user = await prisma.user.findUnique({ where: { email: sanitized.email } });

    if (user) {
      // Invalidate old reset tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Generate new token
      const resetToken = generateToken();
      const tokenHash = hashToken(resetToken);

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      await sendPasswordResetEmail(user, resetToken);

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        },
      });
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateResetPassword(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    const tokenHash = hashToken(sanitized.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token.', code: 'INVALID_TOKEN' });
    }

    if (resetToken.usedAt) {
      return res.status(400).json({ error: 'This reset link has already been used.', code: 'TOKEN_USED' });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired.', code: 'TOKEN_EXPIRED' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(sanitized.password, 12);

    // Update user
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: resetToken.userId,
        actorEmail: resetToken.user.email,
        actorRole: resetToken.user.role,
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: resetToken.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    clearAuthCookies(res);

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
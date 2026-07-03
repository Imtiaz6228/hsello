import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { validateProfileUpdate, validatePasswordChange } from '../lib/validation.mjs';

const router = Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'profiles'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `profile-${req.user.id}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  },
});

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * PATCH /api/user/profile
 * Update current user's profile
 */
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateProfileUpdate(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Check username uniqueness if changing
    if (sanitized.username && sanitized.username !== req.user.username) {
      const existingUsername = await prisma.user.findUnique({ where: { username: sanitized.username } });
      if (existingUsername) {
        return res.status(409).json({ error: 'This username is already taken.', code: 'USERNAME_EXISTS' });
      }
    }

    const updateData = {};
    if (sanitized.firstName) updateData.firstName = sanitized.firstName;
    if (sanitized.lastName) updateData.lastName = sanitized.lastName;
    if (sanitized.username) updateData.username = sanitized.username;
    if (sanitized.phone !== undefined) updateData.phone = sanitized.phone;
    if (sanitized.country !== undefined) updateData.country = sanitized.country;
    if (sanitized.city !== undefined) updateData.city = sanitized.city;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        phone: true, country: true, city: true, profileImageUrl: true,
        role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'PROFILE_UPDATED',
        entityType: 'USER',
        entityId: req.user.id,
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Profile updated.', user: updatedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user/profile-picture
 * Upload profile picture
 */
router.post('/profile-picture', requireAuth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImageUrl },
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        phone: true, country: true, city: true, profileImageUrl: true,
        role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
      },
    });

    res.json({ message: 'Profile picture updated.', user: updatedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/password
 * Change password
 */
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { valid, errors } = validatePasswordChange(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Verify current password
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isCurrentPasswordValid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect.', code: 'INVALID_CURRENT_PASSWORD' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(req.body.newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: req.user.id,
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/dashboard
 * Get user dashboard data
 */
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get seller application if exists
    const sellerApplication = await prisma.sellerApplication.findUnique({
      where: { userId },
    });

    res.json({
      user: req.user,
      sellerApplication: sellerApplication || null,
    });
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };
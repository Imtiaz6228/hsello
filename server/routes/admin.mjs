import { Router } from 'express';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth, requireRoles } from '../middleware/auth.mjs';

const router = Router();

/**
 * GET /api/admin/seller-applications
 * Get all seller applications (admin only)
 */
router.get('/seller-applications', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const applications = await prisma.sellerApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/seller-applications/:id
 * Approve or reject a seller application (admin only)
 */
router.patch('/seller-applications/:id', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
    }

    const application = await prisma.sellerApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'This application has already been reviewed.' });
    }

    // Update application
    const updatedApplication = await prisma.sellerApplication.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewNote: reviewNote || null,
      },
    });

    // If approved, update user role to SELLER
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: 'SELLER' },
      });
    }

    // Mark notification as read
    await prisma.adminNotification.updateMany({
      where: { sellerApplicationId: id, readAt: null },
      data: { readAt: new Date() },
    });

    // Create notification for next update (status change)
    await prisma.adminNotification.create({
      data: {
        type: 'SELLER_APPLICATION_REVIEWED',
        title: `Seller Application ${status}`,
        message: `Application for "${application.storeName}" has been ${status.toLowerCase()} by ${req.user.firstName} ${req.user.lastName}.`,
        sellerApplicationId: id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: `SELLER_APPLICATION_${status}`,
        entityType: 'SELLER_APPLICATION',
        entityId: id,
        metadata: JSON.stringify({ reviewNote, previousStatus: application.status }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({
      message: `Application ${status.toLowerCase()} successfully.`,
      application: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/notifications
 * Get admin notifications
 */
router.get('/notifications', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const notifications = await prisma.adminNotification.findMany({
      where: { readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark notification as read
 */
router.patch('/notifications/:id/read', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.adminNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isBanned: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (admin only) - ban/unban, change role
 */
router.patch('/users/:id', requireAuth, requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBanned, role } = req.body;

    const updateData = {};
    if (typeof isBanned === 'boolean') updateData.isBanned = isBanned;
    if (role && ['CUSTOMER', 'SELLER', 'ADMIN'].includes(role)) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        role: true, isBanned: true, emailVerifiedAt: true, createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'ADMIN_USER_UPDATED',
        entityType: 'USER',
        entityId: id,
        metadata: JSON.stringify(updateData),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ message: 'User updated.', user });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
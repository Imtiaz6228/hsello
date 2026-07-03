import { Router } from 'express';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth, requireRoles } from '../middleware/auth.mjs';
import { validateSellerApplication } from '../lib/validation.mjs';
import { sendAdminSellerNotification } from '../lib/email.mjs';

const router = Router();

/**
 * POST /api/seller/apply
 * Submit a seller application
 */
router.post('/apply', requireAuth, async (req, res, next) => {
  try {
    const { valid, errors, sanitized } = validateSellerApplication(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', issues: errors });
    }

    // Check if user already has an application
    const existingApplication = await prisma.sellerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (existingApplication) {
      return res.status(409).json({
        error: 'You already have a seller application.',
        code: 'APPLICATION_EXISTS',
        application: existingApplication,
      });
    }

    // Create application
    const application = await prisma.sellerApplication.create({
      data: {
        userId: req.user.id,
        userName: req.user.username,
        fullLegalName: sanitized.fullLegalName,
        storeName: sanitized.storeName,
        phone: sanitized.phone,
        email: sanitized.email,
        country: sanitized.country,
        stateProvince: sanitized.stateProvince,
        city: sanitized.city,
        fullAddress: sanitized.fullAddress,
        postalCode: sanitized.postalCode,
        storeDescription: sanitized.storeDescription,
        productCategories: sanitized.productCategories,
        termsAcceptedAt: new Date(),
        status: 'PENDING',
      },
    });

    // Create admin notification
    await prisma.adminNotification.create({
      data: {
        type: 'SELLER_APPLICATION',
        title: 'New Seller Application',
        message: `${req.user.firstName} ${req.user.lastName} (${req.user.email}) applied to become a seller with store "${sanitized.storeName}".`,
        sellerApplicationId: application.id,
      },
    });

    // Notify admin via email
    try {
      await sendAdminSellerNotification(application);
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'SELLER_APPLICATION_SUBMITTED',
        entityType: 'SELLER_APPLICATION',
        entityId: application.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json({
      message: 'Your seller application has been submitted and is pending review.',
      application,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/seller/application
 * Get current user's seller application status
 */
router.get('/application', requireAuth, async (req, res, next) => {
  try {
    const application = await prisma.sellerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (!application) {
      return res.status(404).json({ error: 'No seller application found.', code: 'NO_APPLICATION' });
    }

    res.json({ application });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/seller/dashboard
 * Get seller dashboard data (seller only)
 */
router.get('/dashboard', requireAuth, requireRoles('SELLER'), async (req, res, next) => {
  try {
    // Verify seller role is approved
    const application = await prisma.sellerApplication.findUnique({
      where: { userId: req.user.id },
    });

    res.json({
      user: req.user,
      application: application || null,
    });
  } catch (error) {
    next(error);
  }
});

export { router as sellerRouter };
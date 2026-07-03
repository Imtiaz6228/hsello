import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth, requireRoles } from '../middleware/auth.mjs';

const router = Router();

// Helper: require admin roles (SUPER_ADMIN, ADMIN, or MODERATOR)
const requireAdmin = requireRoles('SUPER_ADMIN', 'ADMIN', 'MODERATOR');
const requireSuperAdminOrAdmin = requireRoles('SUPER_ADMIN', 'ADMIN');
const requireSuperAdmin = requireRoles('SUPER_ADMIN');

// Helper: get user IP and user-agent for audit logging
function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

// Helper: create audit log entry
async function createAuditLog(req, action, entityType, entityId, extra = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        actorEmail: req.user?.email || 'system',
        actorRole: req.user?.role || 'SYSTEM',
        action,
        entityType,
        entityId: entityId || null,
        oldValue: extra.oldValue || null,
        newValue: extra.newValue || null,
        metadata: extra.metadata ? JSON.stringify(extra.metadata) : null,
        ipAddress: getRequestMeta(req).ipAddress,
        userAgent: getRequestMeta(req).userAgent,
      },
    });
  } catch {
    // Non-critical, don't fail the request
  }
}

// ═══════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════

router.get('/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalVendors,
      totalAdmins,
      totalModerators,
      bannedUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue,
      pendingSellerApplications,
      pendingProducts,
      totalProducts,
      totalCategories,
      totalCoupons,
      totalReviews,
      todayOrders,
      todayRevenue,
      monthOrders,
      monthRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.user.count({ where: { role: 'MODERATOR' } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { status: 'REFUNDED' } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: 'CONFIRMED' } }),
      prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.category.count(),
      prisma.coupon.count({ where: { isActive: true } }),
      prisma.review.count(),
      // Today
      (async () => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return prisma.order.count({ where: { createdAt: { gte: startOfDay } } });
      })(),
      (async () => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const result = await prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: startOfDay }, paymentStatus: 'CONFIRMED' },
        });
        return result._sum.totalAmount || 0;
      })(),
      // This month
      (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return prisma.order.count({ where: { createdAt: { gte: startOfMonth } } });
      })(),
      (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const result = await prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: startOfMonth }, paymentStatus: 'CONFIRMED' },
        });
        return result._sum.totalAmount || 0;
      })(),
    ]);

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { product: { select: { id: true, title: true } } } },
      },
    });

    // Recent users
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isBanned: true, createdAt: true,
      },
    });

    // Order stats by status for chart
    const ordersByStatus = [
      { status: 'PENDING', count: pendingOrders },
      { status: 'COMPLETED', count: completedOrders },
      { status: 'CANCELLED', count: cancelledOrders },
      { status: 'REFUNDED', count: refundedOrders },
    ];

    // Mock monthly revenue data for charts (last 12 months)
    const monthlyRevenueData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
      const result = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          paymentStatus: 'CONFIRMED',
        },
      });
      monthlyRevenueData.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year,
        revenue: result._sum.totalAmount || 0,
      });
    }

    res.json({
      stats: {
        totalUsers,
        totalCustomers,
        totalVendors,
        totalAdmins,
        totalModerators,
        bannedUsers,
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        refundedOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        todayRevenue,
        monthRevenue,
        pendingSellerApplications,
        pendingProducts,
        totalProducts,
        totalCategories,
        totalCoupons,
        totalReviews,
        todayOrders,
        monthOrders,
      },
      recentOrders,
      recentUsers,
      ordersByStatus,
      monthlyRevenueData,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role && ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, firstName: true, lastName: true,
          phone: true, country: true, city: true, role: true, isBanned: true,
          isSuspended: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        phone: true, country: true, city: true, profileImageUrl: true,
        role: true, isBanned: true, isSuspended: true, suspensionReason: true,
        emailVerifiedAt: true, createdAt: true, updatedAt: true,
        sellerApplication: true,
        store: true,
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role, isBanned, isSuspended, suspensionReason, firstName, lastName, phone } = req.body;
    const userId = req.params.id;

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) return res.status(404).json({ error: 'User not found.' });

    // Only super admin / admin can change roles
    const updateData = {};
    if (role && ['CUSTOMER', 'SELLER', 'ADMIN', 'MODERATOR'].includes(role)) {
      if (req.user.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only Super Admin can assign Super Admin role.' });
      }
      updateData.role = role;
    }
    if (typeof isBanned === 'boolean') updateData.isBanned = isBanned;
    if (typeof isSuspended === 'boolean') updateData.isSuspended = isSuspended;
    if (suspensionReason !== undefined) updateData.suspensionReason = suspensionReason;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        role: true, isBanned: true, isSuspended: true, emailVerifiedAt: true,
      },
    });

    await createAuditLog(req, 'ADMIN_USER_UPDATED', 'USER', userId, {
      oldValue: JSON.stringify({ role: existingUser.role, isBanned: existingUser.isBanned }),
      newValue: JSON.stringify(updateData),
    });

    res.json({ message: 'User updated.', user: updatedUser });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/reset-password', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await createAuditLog(req, 'ADMIN_PASSWORD_RESET', 'USER', userId);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// SELLER / STORE MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/seller-applications', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [applications, total] = await Promise.all([
      prisma.sellerApplication.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, username: true, firstName: true, lastName: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.sellerApplication.count({ where }),
    ]);

    res.json({ applications, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

router.get('/seller-applications/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const application = await prisma.sellerApplication.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true, createdAt: true },
        },
      },
    });

    if (!application) return res.status(404).json({ error: 'Application not found.' });

    res.json({ application });
  } catch (error) {
    next(error);
  }
});

router.patch('/seller-applications/:id', requireAuth, requireAdmin, async (req, res, next) => {
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

    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'This application has already been reviewed.' });
    }

    const updatedApplication = await prisma.sellerApplication.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewNote: reviewNote || null,
      },
    });

    // Update user role and create store if approved
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: 'SELLER' },
      });

      // Create store
      await prisma.store.upsert({
        where: { userId: application.userId },
        create: {
          userId: application.userId,
          storeName: application.storeName,
          slug: application.storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: application.storeDescription,
          status: 'ACTIVE',
        },
        update: {
          storeName: application.storeName,
          description: application.storeDescription,
          status: 'ACTIVE',
        },
      });

      // Send notification
      await prisma.notification.create({
        data: {
          userId: application.userId,
          type: 'SELLER_APPROVED',
          title: 'Seller Application Approved',
          message: `Congratulations! Your seller application for "${application.storeName}" has been approved. You can now start selling.`,
        },
      });
    }

    await createAuditLog(req, `SELLER_APPLICATION_${status}`, 'SELLER_APPLICATION', id, {
      metadata: { reviewNote, previousStatus: application.status },
      oldValue: application.status,
      newValue: status,
    });

    res.json({ message: `Application ${status.toLowerCase()} successfully.`, application: updatedApplication });
  } catch (error) {
    next(error);
  }
});

// Stores
router.get('/stores', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const stores = await prisma.store.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stores });
  } catch (error) {
    next(error);
  }
});

router.patch('/stores/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, storeName, description } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (storeName) updateData.storeName = storeName;
    if (description !== undefined) updateData.description = description;

    const store = await prisma.store.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await createAuditLog(req, 'ADMIN_STORE_UPDATED', 'STORE', req.params.id, {
      metadata: updateData,
    });

    res.json({ message: 'Store updated.', store });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// PRODUCT MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/products', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { titleRu: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          store: { select: { id: true, storeName: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        store: { select: { id: true, storeName: true } },
        category: { select: { id: true, name: true } },
        reviews: true,
      },
    });

    if (!product) return res.status(404).json({ error: 'Product not found.' });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const { status, isActive, isFeatured, moderationNote, title, price } = req.body;
    const updateData = {};

    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'FEATURED'].includes(status)) {
      updateData.status = status;
      updateData.moderatedAt = new Date();
      updateData.moderatedById = req.user.id;
      updateData.isActive = status === 'APPROVED' || status === 'FEATURED';
      updateData.isFeatured = status === 'FEATURED';
    }
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured;
    if (moderationNote !== undefined) updateData.moderationNote = moderationNote;
    if (title !== undefined) updateData.title = title;
    if (price !== undefined) updateData.price = parseFloat(price);

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        store: { select: { id: true, storeName: true } },
        category: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(req, `PRODUCT_${status || 'UPDATED'}`, 'PRODUCT', productId, {
      metadata: updateData,
      oldValue: JSON.stringify({ status: existing.status, isActive: existing.isActive }),
      newValue: JSON.stringify({ status: product.status, isActive: product.isActive }),
    });

    res.json({ message: 'Product updated.', product });
  } catch (error) {
    next(error);
  }
});

router.delete('/products/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    await prisma.product.delete({ where: { id: req.params.id } });
    await createAuditLog(req, 'PRODUCT_DELETED', 'PRODUCT', req.params.id);

    res.json({ message: 'Product deleted.' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// ORDER MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/orders', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: { include: { product: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        invoice: true,
      },
    });

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    const { status, trackingNumber, notes } = req.body;
    const updateData = {};
    if (status && ['PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      updateData.status = status;
    }
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (notes !== undefined) updateData.notes = notes;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { product: { select: { id: true, title: true } } } },
      },
    });

    await createAuditLog(req, `ORDER_${status || 'UPDATED'}`, 'ORDER', orderId, {
      metadata: updateData,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status: order.status }),
    });

    res.json({ message: 'Order updated.', order });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// CATEGORY MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/categories', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const { name, nameRu, nameZh, slug, icon, description, parentId, sortOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required.' });
    }

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'A category with this slug already exists.' });

    const category = await prisma.category.create({
      data: {
        name, nameRu: nameRu || '', nameZh: nameZh || '',
        slug, icon: icon || 'FolderTree', description: description || '',
        parentId: parentId || null, sortOrder: sortOrder || 0,
      },
    });

    await createAuditLog(req, 'CATEGORY_CREATED', 'CATEGORY', category.id);
    res.status(201).json({ message: 'Category created.', category });
  } catch (error) {
    next(error);
  }
});

router.patch('/categories/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const catId = req.params.id;
    const existing = await prisma.category.findUnique({ where: { id: catId } });
    if (!existing) return res.status(404).json({ error: 'Category not found.' });

    const { name, nameRu, nameZh, slug, icon, imageUrl, description, descriptionRu, descriptionZh, isActive, sortOrder, parentId } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameRu !== undefined) updateData.nameRu = nameRu;
    if (nameZh !== undefined) updateData.nameZh = nameZh;
    if (slug !== undefined) {
      const slugExists = await prisma.category.findFirst({ where: { slug, id: { not: catId } } });
      if (slugExists) return res.status(409).json({ error: 'This slug is already taken.' });
      updateData.slug = slug;
    }
    if (icon !== undefined) updateData.icon = icon;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (description !== undefined) updateData.description = description;
    if (descriptionRu !== undefined) updateData.descriptionRu = descriptionRu;
    if (descriptionZh !== undefined) updateData.descriptionZh = descriptionZh;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    if (parentId !== undefined) updateData.parentId = parentId;

    const category = await prisma.category.update({
      where: { id: catId },
      data: updateData,
    });

    await createAuditLog(req, 'CATEGORY_UPDATED', 'CATEGORY', catId, { metadata: updateData });
    res.json({ message: 'Category updated.', category });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const catId = req.params.id;
    const category = await prisma.category.findUnique({ where: { id: catId } });
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    // Check for products
    const productCount = await prisma.product.count({ where: { categoryId: catId } });
    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing products. Reassign them first.' });
    }

    // Reassign children to parent
    await prisma.category.updateMany({ where: { parentId: catId }, data: { parentId: category.parentId } });
    await prisma.category.delete({ where: { id: catId } });

    await createAuditLog(req, 'CATEGORY_DELETED', 'CATEGORY', catId);
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// REVIEW MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/reviews', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        product: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

router.patch('/reviews/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { status },
    });

    await createAuditLog(req, `REVIEW_${status}`, 'REVIEW', req.params.id);
    res.json({ message: 'Review updated.', review });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// COUPON MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/coupons', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons });
  } catch (error) {
    next(error);
  }
});

router.post('/coupons', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const { code, description, discountPercent, discountFixed, minOrderAmount, maxUses, expiresAt } = req.body;

    if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(409).json({ error: 'Coupon code already exists.' });

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountPercent: parseFloat(discountPercent) || 0,
        discountFixed: parseFloat(discountFixed) || 0,
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        maxUses: parseInt(maxUses) || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await createAuditLog(req, 'COUPON_CREATED', 'COUPON', coupon.id);
    res.status(201).json({ message: 'Coupon created.', coupon });
  } catch (error) {
    next(error);
  }
});

router.patch('/coupons/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const { isActive, description, discountPercent, discountFixed, maxUses } = req.body;
    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;
    if (discountPercent !== undefined) updateData.discountPercent = parseFloat(discountPercent);
    if (discountFixed !== undefined) updateData.discountFixed = parseFloat(discountFixed);
    if (maxUses !== undefined) updateData.maxUses = parseInt(maxUses);

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await createAuditLog(req, 'COUPON_UPDATED', 'COUPON', req.params.id);
    res.json({ message: 'Coupon updated.', coupon });
  } catch (error) {
    next(error);
  }
});

router.delete('/coupons/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    await createAuditLog(req, 'COUPON_DELETED', 'COUPON', req.params.id);
    res.json({ message: 'Coupon deleted.' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// SUPPORT TICKETS
// ═══════════════════════════════════════════════

router.get('/tickets', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get('/tickets/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.patch('/tickets/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const updateData = {};
    if (status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) updateData.status = status;
    if (priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog(req, 'TICKET_UPDATED', 'TICKET', req.params.id, { metadata: updateData });
    res.json({ message: 'Ticket updated.', ticket });
  } catch (error) {
    next(error);
  }
});

router.post('/tickets/:id/messages', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        senderId: req.user.id,
        message,
      },
    });

    res.status(201).json({ message: 'Reply sent.', ticketMessage });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════

router.get('/withdrawals', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ withdrawals });
  } catch (error) {
    next(error);
  }
});

router.patch('/withdrawals/:id', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const { status, details } = req.body;
    if (!['APPROVED', 'REJECTED', 'PROCESSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: req.params.id },
      data: { status, details },
    });

    await createAuditLog(req, `WITHDRAWAL_${status}`, 'WITHDRAWAL', req.params.id);
    res.json({ message: 'Withdrawal updated.', withdrawal });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════

router.get('/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    res.json({ settings: settingsMap });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings provided.' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }

    await createAuditLog(req, 'SETTINGS_UPDATED', 'SETTINGS', null, { metadata: updates });
    res.json({ message: 'Settings updated.' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════

router.get('/audit-logs', requireAuth, requireSuperAdminOrAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════

router.get('/notifications', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
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

router.patch('/notifications/:id/read', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/read-all', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
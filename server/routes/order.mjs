import { Router } from 'express';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';

const router = Router();

/**
 * POST /api/orders
 * Create a new order (authenticated users)
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items, paymentMethod } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    // Calculate totals
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      // Find product
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { store: true },
      });

      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.productId} is not available.` });
      }

      const price = product.salePrice || product.price;
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const subtotal = price * quantity;
      totalAmount += subtotal;

      orderItems.push({
        productId: product.id,
        storeId: product.storeId,
        quantity,
        price,
        subtotal,
      });
    }

    const platformFee = Math.round(totalAmount * 0.05 * 100) / 100; // 5% platform fee
    const grandTotal = totalAmount + platformFee;

    // Create the order
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        totalAmount: grandTotal,
        platformFee,
        status: 'PENDING',
        paymentMethod: paymentMethod || 'BALANCE',
        paymentStatus: 'PENDING',
        items: {
          create: orderItems.map(oi => ({
            productId: oi.productId,
            quantity: oi.quantity,
            price: oi.price,
            subtotal: oi.subtotal,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, title: true } } } },
      },
    });

    // If paying by balance, auto-confirm
    if (paymentMethod === 'BALANCE') {
      // In production, you'd verify user balance first
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'CONFIRMED',
          status: 'COMPLETED',
        },
      });
    }

    // Increment product sold counts
    for (const oi of orderItems) {
      await prisma.product.update({
        where: { id: oi.productId },
        data: {
          soldCount: { increment: oi.quantity },
        },
      });
    }

    res.status(201).json({ message: 'Order created successfully.', order });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders
 * Get current user's orders
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: { select: { id: true, title: true, price: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Get a specific order by ID
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
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

export { router as orderRouter };
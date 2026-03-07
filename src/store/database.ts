import type { 
  User, Category, Product, StockItem, Order, OrderItem, 
  Ticket, TicketMessage, Review, ApiKey, SiteConfig, CartSession, 
  CryptoTransaction, EmailNotification, SellerModerationStatus, ProductModerationStatus, AuditLog, InsuranceLevel
} from '@/types';
import { convertRubToUsd, convertUsdToRub, DEFAULT_PLATFORM_CONFIG } from '@/lib/platform';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// In-memory database store
class Database {
  users: Map<string, User> = new Map();
  categories: Map<string, Category> = new Map();
  products: Map<string, Product> = new Map();
  stockItems: Map<string, StockItem> = new Map();
  orders: Map<string, Order> = new Map();
  orderItems: Map<string, OrderItem> = new Map();
  tickets: Map<string, Ticket> = new Map();
  ticketMessages: Map<string, TicketMessage> = new Map();
  reviews: Map<string, Review> = new Map();
  apiKeys: Map<string, ApiKey> = new Map();
  cryptoTransactions: Map<string, CryptoTransaction> = new Map();
  emailNotifications: Map<string, EmailNotification> = new Map();
  auditLogs: Map<string, AuditLog> = new Map();
  siteConfig: SiteConfig | null = null;
  cartSessions: Map<string, CartSession> = new Map();

  constructor() {
    this.seedData();
  }

  private getInsuranceLevel(balanceRub: number): InsuranceLevel {
    if (balanceRub >= 10000) return 'LEVEL_1';
    if (balanceRub >= 5000) return 'LEVEL_2';
    if (balanceRub >= 1000) return 'LEVEL_3';
    return 'NONE';
  }

  private getInsurancePriority(level?: InsuranceLevel): number {
    if (level === 'LEVEL_1') return 4;
    if (level === 'LEVEL_2') return 3;
    if (level === 'LEVEL_3') return 2;
    return 1;
  }

  private clampRating(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  private getEffectiveSellerRatingValue(seller: User): number {
    const raw = seller.adminRatingOverride ?? seller.reputation;
    return this.clampRating(raw);
  }

  private getEffectiveProductRatingValue(product: Product): number {
    if (typeof product.adminRatingOverride === 'number') {
      return this.clampRating(product.adminRatingOverride);
    }

    const seller = this.users.get(product.sellerId);
    if (!seller) return 0;
    return this.getEffectiveSellerRatingValue(seller);
  }

  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.auditLogs.set(newLog.id, newLog);
    return newLog;
  }

  getAuditLogs(limit = 200): AuditLog[] {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // User operations
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const moderationStatus: SellerModerationStatus | undefined =
      user.role === 'SELLER'
        ? (user.sellerModerationStatus ?? 'PENDING')
        : undefined;

    const insuranceBalanceRub = user.insuranceBalanceRub ?? 0;
    const insuranceLevel = user.insuranceLevel ?? this.getInsuranceLevel(insuranceBalanceRub);

    const newUser: User = {
      ...user,
      sellerModerationStatus: moderationStatus,
      insuranceBalanceRub,
      insuranceLevel,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    this.createAuditLog({
      actorId: newUser.id,
      actorEmail: newUser.email,
      actorRole: 'SYSTEM',
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      details: `User registered with role ${newUser.role}`,
    });
    return newUser;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUserBySupplierId(supplierId: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.supplierId === supplierId);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const nextInsuranceBalance = updates.insuranceBalanceRub ?? user.insuranceBalanceRub ?? 0;
    const nextInsuranceLevel = updates.insuranceLevel ?? this.getInsuranceLevel(nextInsuranceBalance);

    const updated = {
      ...user,
      ...updates,
      insuranceBalanceRub: nextInsuranceBalance,
      insuranceLevel: nextInsuranceLevel,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    this.createAuditLog({
      actorId: id,
      actorEmail: updated.email,
      actorRole: updated.role,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: 'User profile updated',
    });
    return updated;
  }

  getPendingSellerUsers(): User[] {
    return Array.from(this.users.values()).filter(
      (u) => u.role === 'SELLER' && u.sellerModerationStatus === 'PENDING'
    );
  }

  moderateSellerAccount(
    sellerId: string,
    adminId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    reason?: string
  ): User | undefined {
    const seller = this.getUserById(sellerId);
    const admin = this.getUserById(adminId);

    if (!seller || seller.role !== 'SELLER') return undefined;
    if (!admin || admin.role !== 'ADMIN') return undefined;

    const updatedSeller = this.updateUser(sellerId, {
      sellerModerationStatus: status,
      sellerModeratedAt: new Date(),
      sellerModeratedById: adminId,
      sellerModerationReason: reason,
    });

    if (!updatedSeller) return undefined;

    if (status === 'APPROVED') {
      this.bootstrapSellerProfile(sellerId);
      this.createEmailNotification({
        userId: sellerId,
        toEmail: updatedSeller.email,
        subject: 'Seller account approved',
        body: `Hi, your seller account (${updatedSeller.email}) has been approved by admin. You can now access the seller dashboard.`,
      });
    } else if (status === 'REJECTED') {
      this.createEmailNotification({
        userId: sellerId,
        toEmail: updatedSeller.email,
        subject: 'Seller account rejected',
        body: `Hi, your seller account (${updatedSeller.email}) was rejected by admin.${reason ? ` Reason: ${reason}` : ''}`,
      });
    } else {
      this.createEmailNotification({
        userId: sellerId,
        toEmail: updatedSeller.email,
        subject: 'Seller account moved to pending review',
        body: `Hi, your seller account (${updatedSeller.email}) was moved to pending review by admin.${reason ? ` Note: ${reason}` : ''}`,
      });
    }

    this.createAuditLog({
      actorId: adminId,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'SELLER_MODERATED',
      entityType: 'USER',
      entityId: sellerId,
      details: `Seller moderation status set to ${status}`,
      metadata: {
        status,
      },
    });

    return updatedSeller;
  }

  createEmailNotification(
    notification: Omit<EmailNotification, 'id' | 'createdAt'>
  ): EmailNotification {
    const newNotification: EmailNotification = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.emailNotifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  getEmailNotificationsByUser(userId: string): EmailNotification[] {
    return Array.from(this.emailNotifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  bootstrapBuyerProfile(userId: string): void {
    const user = this.getUserById(userId);
    if (!user) return;

    // Give newly registered buyers a demo-like starting balance
    this.updateUser(userId, {
      balanceRub: 5000,
      balanceUsd: 55,
      reputation: 100,
      positiveVotes: 1,
      negativeVotes: 0,
    });

    // Add one starter confirmed order so dashboard mirrors demo experience
    const existingOrders = this.getOrdersByBuyer(userId);
    if (existingOrders.length > 0) return;

    const sampleProduct = this.getAllProducts()[0];
    if (!sampleProduct) return;

    const qty = 1;
    const totalPriceRub = sampleProduct.priceRub * qty;
    const totalPriceUsd = sampleProduct.priceUsd * qty;
    const platformFeeRub = Math.round(totalPriceRub * 0.1);
    const platformFeeUsd = totalPriceUsd * 0.1;

    const order = this.createOrder({
      buyerId: userId,
      buyerEmail: user.email,
      totalPriceRub,
      totalPriceUsd,
      platformFeeRub,
      platformFeeUsd,
      paymentStatus: 'CONFIRMED',
      paymentMethod: 'BALANCE',
    });

    this.createOrderItem({
      orderId: order.id,
      productId: sampleProduct.id,
      quantity: qty,
      priceRub: sampleProduct.priceRub,
      priceUsd: sampleProduct.priceUsd,
    });

    const stockToSell = this.getStockByProduct(sampleProduct.id).slice(0, qty).map(s => s.id);
    if (stockToSell.length > 0) {
      this.markStockAsSold(stockToSell, order.id);
    }
  }

  bootstrapSellerProfile(userId: string): void {
    const user = this.getUserById(userId);
    if (!user) return;

    // Demo-like seller profile stats and balance
    this.updateUser(userId, {
      balanceRub: 25000,
      balanceUsd: 275,
      reputation: 98.5,
      positiveVotes: 25,
      negativeVotes: 1,
    });

    const existingProducts = this.getProductsBySeller(userId);
    if (existingProducts.length > 0) return;

    const categories = this.getAllCategories().slice(0, 2);
    if (categories.length === 0) return;

    const createdProducts: Product[] = [];

    categories.forEach((category, idx) => {
      const priceUsd = idx === 0 ? 2.5 : 4.2;
      const priceRub = convertUsdToRub(priceUsd, this.siteConfig);
      const product = this.createProduct({
        sellerId: userId,
        categoryId: category.id,
        title: `${category.name} Starter Pack ${idx + 1}`,
        titleRu: `${category.nameRu} Стартовый пакет ${idx + 1}`,
        titleZh: `${category.nameZh} 入门包 ${idx + 1}`,
        description: `Starter ${category.name} product for new seller dashboard`,
        descriptionRu: `Стартовый товар ${category.nameRu} для панели продавца`,
        descriptionZh: `新卖家面板的${category.nameZh}入门商品`,
        priceRub,
        priceUsd,
        formatType: 'SINGLE_LINE',
        delimiter: ':',
        tags: ['Starter', 'Verified'],
        tagsRu: ['Стартовый', 'Проверенный'],
        tagsZh: ['入门', '已验证'],
        isActive: true,
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        moderatedById: Array.from(this.users.values()).find((u) => u.role === 'ADMIN')?.id,
        requiresVideo: false,
        warrantyDays: 24,
      });

      product.bulkPrices = [
        { id: uuidv4(), productId: product.id, minQty: 5, maxQty: 19, priceRub: Math.round(priceRub * 0.9), priceUsd: priceUsd * 0.9 },
        { id: uuidv4(), productId: product.id, minQty: 20, maxQty: 49, priceRub: Math.round(priceRub * 0.8), priceUsd: priceUsd * 0.8 },
        { id: uuidv4(), productId: product.id, minQty: 50, maxQty: 999999, priceRub: Math.round(priceRub * 0.7), priceUsd: priceUsd * 0.7 },
      ];
      this.products.set(product.id, product);

      for (let i = 0; i < 20; i++) {
        this.createStockItem({
          productId: product.id,
          dataContent: `starter_${category.slug}_${i + 1}_${Math.random().toString(36).slice(2, 8)}:pass${Math.random().toString(36).slice(2, 7)}`,
          isSold: false,
          isReserved: false,
        });
      }

      createdProducts.push(product);
    });

    // Add one starter order so seller sees real order data similar to demo accounts
    const productForOrder = createdProducts[0];
    if (!productForOrder) return;

    const demoBuyer = this.getUserByEmail('buyer@demo.com');
    const buyerId = demoBuyer?.id;
    const buyerEmail = demoBuyer?.email || 'buyer@demo.com';
    const totalPriceRub = productForOrder.priceRub;
    const totalPriceUsd = productForOrder.priceUsd;
    const platformFeeRub = Math.round(totalPriceRub * 0.1);
    const platformFeeUsd = totalPriceUsd * 0.1;

    const order = this.createOrder({
      buyerId,
      buyerEmail,
      totalPriceRub,
      totalPriceUsd,
      platformFeeRub,
      platformFeeUsd,
      paymentStatus: 'CONFIRMED',
      paymentMethod: 'BALANCE',
    });

    this.createOrderItem({
      orderId: order.id,
      productId: productForOrder.id,
      quantity: 1,
      priceRub: productForOrder.priceRub,
      priceUsd: productForOrder.priceUsd,
    });

    const stockToSell = this.getStockByProduct(productForOrder.id).slice(0, 1).map(s => s.id);
    if (stockToSell.length > 0) {
      this.markStockAsSold(stockToSell, order.id);
    }
  }

  // Category operations
  createCategory(category: Omit<Category, 'id'>): Category {
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
    };
    this.categories.set(newCategory.id, newCategory);
    return newCategory;
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.get(id);
  }

  getCategoryBySlug(slug: string): Category | undefined {
    return Array.from(this.categories.values()).find(c => c.slug === slug);
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updated: Category = {
      ...category,
      ...updates,
    };

    this.categories.set(id, updated);
    return updated;
  }

  getAllCategories(): Category[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  getRootCategories(): Category[] {
    return Array.from(this.categories.values())
      .filter(c => !c.parentId)
      .sort((a, b) => a.order - b.order);
  }

  getChildCategories(parentId: string): Category[] {
    return Array.from(this.categories.values())
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  getCategoryTree(): Category[] {
    const buildTree = (parentId?: string): Category[] => {
      const categories = parentId 
        ? this.getChildCategories(parentId)
        : this.getRootCategories();
      return categories.map(cat => ({
        ...cat,
        children: buildTree(cat.id),
        stockCount: this.getCategoryStockCount(cat.id),
      }));
    };
    return buildTree();
  }

  getCategoryStockCount(categoryId: string): number {
    const products = this.getProductsByCategory(categoryId);
    return products.reduce((sum, p) => sum + this.getProductStockCount(p.id), 0);
  }

  // Product operations
  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'bulkPrices'>): Product {
    const moderationStatus: ProductModerationStatus =
      product.moderationStatus ?? 'PENDING';

    const newProduct: Product = {
      ...product,
      bulkPrices: [],
      moderationStatus,
      isActive: moderationStatus === 'APPROVED' && product.isActive,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(newProduct.id, newProduct);
    return newProduct;
  }

  getProductById(id: string): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;
    return this.enrichProduct(product);
  }

  getProductsByCategory(categoryId: string): Product[] {
    return Array.from(this.products.values())
      .filter(
        (p) => p.categoryId === categoryId && p.isActive && p.moderationStatus === 'APPROVED'
      )
      .map(p => this.enrichProduct(p));
  }

  getProductsBySeller(sellerId: string): Product[] {
    return Array.from(this.products.values())
      .filter(p => p.sellerId === sellerId)
      .map(p => this.enrichProduct(p));
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values())
      .filter((p) => p.isActive && p.moderationStatus === 'APPROVED')
      .map(p => this.enrichProduct(p));
  }

  getAllProductsForAdmin(): Product[] {
    return Array.from(this.products.values()).map((p) => this.enrichProduct(p));
  }

  moderateProduct(
    productId: string,
    adminId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD',
    reason?: string
  ): Product | undefined {
    const product = this.products.get(productId);
    const admin = this.getUserById(adminId);
    if (!product) return undefined;
    if (!admin || admin.role !== 'ADMIN') return undefined;

    const updates: Partial<Product> = {
      moderationStatus: status,
      moderatedAt: new Date(),
      moderatedById: adminId,
      moderationReason: reason,
      isActive: status === 'APPROVED',
    };

    updates.discontinuedAt = undefined;
    updates.discontinuedById = undefined;
    updates.discontinuedReason = undefined;

    return this.updateProduct(productId, updates);
  }

  discontinueProduct(productId: string, adminId: string, reason?: string): Product | undefined {
    const product = this.products.get(productId);
    const admin = this.getUserById(adminId);
    if (!product) return undefined;
    if (!admin || admin.role !== 'ADMIN') return undefined;

    return this.updateProduct(productId, {
      moderationStatus: 'DISCONTINUED',
      discontinuedAt: new Date(),
      discontinuedById: adminId,
      discontinuedReason: reason,
      moderatedAt: new Date(),
      moderatedById: adminId,
      moderationReason: reason,
      isActive: false,
    });
  }

  getSellerEffectiveRating(sellerId: string): number {
    const seller = this.getUserById(sellerId);
    if (!seller || seller.role !== 'SELLER') return 0;
    return this.getEffectiveSellerRatingValue(seller);
  }

  getProductEffectiveRating(productId: string): number {
    const product = this.products.get(productId);
    if (!product) return 0;
    return this.getEffectiveProductRatingValue(product);
  }

  updateSellerAdminMetrics(
    sellerId: string,
    adminId: string,
    updates: {
      ratingOverride?: number | null;
      salesQtyBoost?: number;
      revenueRubBoost?: number;
      rankBoost?: number;
    }
  ): User | undefined {
    const seller = this.getUserById(sellerId);
    const admin = this.getUserById(adminId);
    if (!seller || seller.role !== 'SELLER') return undefined;
    if (!admin || admin.role !== 'ADMIN') return undefined;

    const nextRatingOverride =
      updates.ratingOverride === undefined
        ? (seller.adminRatingOverride ?? null)
        : updates.ratingOverride === null
          ? null
          : this.clampRating(updates.ratingOverride);

    const nextSalesQtyBoost =
      updates.salesQtyBoost === undefined
        ? (seller.adminSalesQtyBoost ?? 0)
        : Math.max(0, Math.round(updates.salesQtyBoost));

    const nextRevenueRubBoost =
      updates.revenueRubBoost === undefined
        ? (seller.adminRevenueRubBoost ?? 0)
        : Math.max(0, Math.round(updates.revenueRubBoost));

    const nextRankBoost =
      updates.rankBoost === undefined
        ? (seller.adminRankBoost ?? 0)
        : Math.max(-1000, Math.min(1000, updates.rankBoost));

    const updated = this.updateUser(sellerId, {
      adminRatingOverride: nextRatingOverride,
      adminSalesQtyBoost: nextSalesQtyBoost,
      adminRevenueRubBoost: nextRevenueRubBoost,
      adminRankBoost: nextRankBoost,
    });

    if (updated) {
      this.createAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_UPDATED_SELLER_METRICS',
        entityType: 'USER',
        entityId: sellerId,
        details: 'Admin updated seller rating/sales/rank metrics',
        metadata: {
          ratingOverride: nextRatingOverride,
          salesQtyBoost: nextSalesQtyBoost,
          revenueRubBoost: nextRevenueRubBoost,
          rankBoost: nextRankBoost,
        },
      });
    }

    return updated;
  }

  updateProductAdminMetrics(
    productId: string,
    adminId: string,
    updates: {
      ratingOverride?: number | null;
      salesQtyBoost?: number;
      revenueRubBoost?: number;
      rankBoost?: number;
    }
  ): Product | undefined {
    const product = this.products.get(productId);
    const admin = this.getUserById(adminId);
    if (!product) return undefined;
    if (!admin || admin.role !== 'ADMIN') return undefined;

    const nextRatingOverride =
      updates.ratingOverride === undefined
        ? (product.adminRatingOverride ?? null)
        : updates.ratingOverride === null
          ? null
          : this.clampRating(updates.ratingOverride);

    const nextSalesQtyBoost =
      updates.salesQtyBoost === undefined
        ? (product.adminSalesQtyBoost ?? 0)
        : Math.max(0, Math.round(updates.salesQtyBoost));

    const nextRevenueRubBoost =
      updates.revenueRubBoost === undefined
        ? (product.adminRevenueRubBoost ?? 0)
        : Math.max(0, Math.round(updates.revenueRubBoost));

    const nextRankBoost =
      updates.rankBoost === undefined
        ? (product.adminRankBoost ?? 0)
        : Math.max(-1000, Math.min(1000, updates.rankBoost));

    const updated = this.updateProduct(productId, {
      adminRatingOverride: nextRatingOverride,
      adminSalesQtyBoost: nextSalesQtyBoost,
      adminRevenueRubBoost: nextRevenueRubBoost,
      adminRankBoost: nextRankBoost,
    });

    if (updated) {
      this.createAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_UPDATED_PRODUCT_METRICS',
        entityType: 'PRODUCT',
        entityId: productId,
        details: 'Admin updated product rating/sales/rank metrics',
        metadata: {
          ratingOverride: nextRatingOverride,
          salesQtyBoost: nextSalesQtyBoost,
          revenueRubBoost: nextRevenueRubBoost,
          rankBoost: nextRankBoost,
        },
      });
    }

    return updated;
  }

  getProductSalesStats(productId: string): { soldQty: number; revenueRub: number; revenueUsd: number } {
    const product = this.products.get(productId);
    const confirmedOrderIds = new Set(
      Array.from(this.orders.values())
        .filter((o) => o.paymentStatus === 'CONFIRMED')
        .map((o) => o.id)
    );

    const items = Array.from(this.orderItems.values()).filter(
      (i) => i.productId === productId && confirmedOrderIds.has(i.orderId)
    );

    const soldQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const revenueRub = items.reduce((sum, i) => sum + i.priceRub * i.quantity, 0);
    const revenueUsd = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);

    const salesQtyBoost = Math.max(0, Math.round(product?.adminSalesQtyBoost ?? 0));
    const revenueRubBoost = Math.max(0, Math.round(product?.adminRevenueRubBoost ?? 0));
    const revenueUsdBoost = convertRubToUsd(revenueRubBoost, this.siteConfig);

    return {
      soldQty: soldQty + salesQtyBoost,
      revenueRub: revenueRub + revenueRubBoost,
      revenueUsd: revenueUsd + revenueUsdBoost,
    };
  }

  getSellerSalesStats(sellerId: string): { soldQty: number; revenueRub: number; revenueUsd: number } {
    const seller = this.getUserById(sellerId);
    if (!seller || seller.role !== 'SELLER') {
      return { soldQty: 0, revenueRub: 0, revenueUsd: 0 };
    }

    const sellerProducts = this.getProductsBySeller(sellerId);
    const baseStats = sellerProducts.reduce(
      (acc, product) => {
        const stats = this.getProductSalesStats(product.id);
        acc.soldQty += stats.soldQty;
        acc.revenueRub += stats.revenueRub;
        acc.revenueUsd += stats.revenueUsd;
        return acc;
      },
      { soldQty: 0, revenueRub: 0, revenueUsd: 0 }
    );

    const sellerSalesQtyBoost = Math.max(0, Math.round(seller.adminSalesQtyBoost ?? 0));
    const sellerRevenueRubBoost = Math.max(0, Math.round(seller.adminRevenueRubBoost ?? 0));
    const sellerRevenueUsdBoost = convertRubToUsd(sellerRevenueRubBoost, this.siteConfig);

    return {
      soldQty: baseStats.soldQty + sellerSalesQtyBoost,
      revenueRub: baseStats.revenueRub + sellerRevenueRubBoost,
      revenueUsd: baseStats.revenueUsd + sellerRevenueUsdBoost,
    };
  }

  getRankedProducts(
    limit = 8
  ): Array<Product & { soldQty: number; totalSalesRub: number; effectiveRating: number; rankingScore: number }> {
    return this.getAllProducts()
      .map((p) => {
        const stats = this.getProductSalesStats(p.id);
        const effectiveRating = this.getEffectiveProductRatingValue(p);
        const rankBoost = p.adminRankBoost ?? 0;
        const rankingScore = stats.soldQty * 0.6 + effectiveRating * 0.3 + (stats.revenueRub / 10000) * 0.1 + rankBoost;
        return {
          ...p,
          soldQty: stats.soldQty,
          totalSalesRub: stats.revenueRub,
          effectiveRating,
          rankingScore,
        };
      })
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, limit);
  }

  getRankedStores(
    limit = 6
  ): Array<User & { soldQty: number; totalSalesRub: number; effectiveRating: number; rankingScore: number }> {
    const sellers = Array.from(this.users.values()).filter(
      (u) => u.role === 'SELLER' && u.sellerModerationStatus === 'APPROVED'
    );

    return sellers
      .map((seller) => {
        const stats = this.getSellerSalesStats(seller.id);
        const effectiveRating = this.getEffectiveSellerRatingValue(seller);
        const rankBoost = seller.adminRankBoost ?? 0;
        const rankingScore = stats.soldQty * 0.6 + effectiveRating * 0.3 + (stats.revenueRub / 10000) * 0.1 + rankBoost;
        return {
          ...seller,
          soldQty: stats.soldQty,
          totalSalesRub: stats.revenueRub,
          effectiveRating,
          rankingScore,
        };
      })
      .sort((a, b) => {
        const aRankBoost = a.adminRankBoost ?? 0;
        const bRankBoost = b.adminRankBoost ?? 0;
        if (bRankBoost !== aRankBoost) {
          return bRankBoost - aRankBoost;
        }

        if (b.rankingScore !== a.rankingScore) {
          return b.rankingScore - a.rankingScore;
        }

        const aLevelPriority = this.getInsurancePriority(
          a.insuranceLevel ?? this.getInsuranceLevel(a.insuranceBalanceRub ?? 0)
        );
        const bLevelPriority = this.getInsurancePriority(
          b.insuranceLevel ?? this.getInsuranceLevel(b.insuranceBalanceRub ?? 0)
        );

        if (bLevelPriority !== aLevelPriority) {
          return bLevelPriority - aLevelPriority;
        }

        const aInsurance = a.insuranceBalanceRub ?? 0;
        const bInsurance = b.insuranceBalanceRub ?? 0;
        if (bInsurance !== aInsurance) {
          return bInsurance - aInsurance;
        }

        return (b.effectiveRating ?? 0) - (a.effectiveRating ?? 0);
      })
      .slice(0, limit);
  }

  depositSellerInsurance(
    sellerId: string,
    amountRub: number
  ): { success: boolean; error?: string; seller?: User; admin?: User } {
    const seller = this.getUserById(sellerId);
    if (!seller || seller.role !== 'SELLER') {
      return { success: false, error: 'Seller not found' };
    }

    if (seller.sellerModerationStatus !== 'APPROVED') {
      return { success: false, error: 'Seller must be approved before insurance deposit' };
    }

    const normalizedAmount = Math.round(amountRub);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    if (seller.balanceRub < normalizedAmount) {
      return { success: false, error: 'Insufficient seller balance' };
    }

    const admin = Array.from(this.users.values()).find((u) => u.role === 'ADMIN');
    if (!admin) {
      return { success: false, error: 'Admin account not found' };
    }

    const amountUsd = convertRubToUsd(normalizedAmount, this.siteConfig);
    const nextInsuranceBalance = (seller.insuranceBalanceRub ?? 0) + normalizedAmount;

    const updatedSeller = this.updateUser(seller.id, {
      balanceRub: Math.max(0, seller.balanceRub - normalizedAmount),
      balanceUsd: Math.max(0, seller.balanceUsd - amountUsd),
      insuranceBalanceRub: nextInsuranceBalance,
      insuranceLevel: this.getInsuranceLevel(nextInsuranceBalance),
    });

    const updatedAdmin = this.updateUser(admin.id, {
      balanceRub: admin.balanceRub + normalizedAmount,
      balanceUsd: admin.balanceUsd + amountUsd,
    });

    if (!updatedSeller || !updatedAdmin) {
      return { success: false, error: 'Failed to process insurance deposit' };
    }

    this.createAuditLog({
      actorId: seller.id,
      actorEmail: seller.email,
      actorRole: seller.role,
      action: 'SELLER_INSURANCE_DEPOSIT',
      entityType: 'USER',
      entityId: seller.id,
      details: `Seller insurance deposit: ${normalizedAmount} RUB`,
      metadata: {
        amountRub: normalizedAmount,
        insuranceBalanceRub: nextInsuranceBalance,
        insuranceLevel: updatedSeller.insuranceLevel || 'NONE',
      },
    });

    return { success: true, seller: updatedSeller, admin: updatedAdmin };
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated = { ...product, ...updates, updatedAt: new Date() };
    this.products.set(id, updated);
    return this.enrichProduct(updated);
  }

  deleteProduct(id: string): boolean {
    return this.products.delete(id);
  }

  enrichProduct(product: Product): Product {
    const rawSeller = this.users.get(product.sellerId);
    const seller = rawSeller
      ? {
          ...rawSeller,
          reputation: this.getEffectiveSellerRatingValue(rawSeller),
        }
      : undefined;
    const category = this.categories.get(product.categoryId);
    return {
      ...product,
      seller,
      category,
      stockCount: this.getProductStockCount(product.id),
    };
  }

  // Stock operations
  createStockItem(stock: Omit<StockItem, 'id' | 'createdAt'>): StockItem {
    const newStock: StockItem = {
      ...stock,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.stockItems.set(newStock.id, newStock);
    return newStock;
  }

  getStockByProduct(productId: string): StockItem[] {
    return Array.from(this.stockItems.values())
      .filter(s => s.productId === productId && !s.isSold && !s.isReserved);
  }

  removeStockByProduct(productId: string, quantity: number): number {
    if (quantity <= 0) return 0;

    const removable = this.getStockByProduct(productId).slice(0, quantity);
    removable.forEach((item) => this.stockItems.delete(item.id));
    return removable.length;
  }

  getProductStockCount(productId: string): number {
    return this.getStockByProduct(productId).length;
  }

  reserveStock(productId: string, quantity: number): StockItem[] {
    const available = this.getStockByProduct(productId).slice(0, quantity);
    const reserved: StockItem[] = [];
    for (const stock of available) {
      const updated = { 
        ...stock, 
        isReserved: true, 
        reservedAt: new Date() 
      };
      this.stockItems.set(stock.id, updated);
      reserved.push(updated);
    }
    return reserved;
  }

  releaseReservedStock(stockIds: string[]): void {
    for (const id of stockIds) {
      const stock = this.stockItems.get(id);
      if (stock && stock.isReserved && !stock.isSold) {
        this.stockItems.set(id, { 
          ...stock, 
          isReserved: false, 
          reservedAt: undefined 
        });
      }
    }
  }

  markStockAsSold(stockIds: string[], orderId: string): void {
    for (const id of stockIds) {
      const stock = this.stockItems.get(id);
      if (stock) {
        this.stockItems.set(id, { 
          ...stock, 
          isSold: true, 
          isReserved: false,
          orderId,
          soldAt: new Date() 
        });
      }
    }
  }

  checkDuplicate(dataContent: string): boolean {
    return Array.from(this.stockItems.values()).some(
      s => s.dataContent === dataContent
    );
  }

  // Order operations
  createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const newOrder: Order = {
      ...order,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(newOrder.id, newOrder);
    this.createAuditLog({
      actorId: order.buyerId,
      actorEmail: order.buyerEmail,
      actorRole: order.buyerId ? (this.getUserById(order.buyerId)?.role ?? 'SYSTEM') : 'SYSTEM',
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: newOrder.id,
      details: `Order created with payment status ${order.paymentStatus}`,
      metadata: {
        totalPriceRub: order.totalPriceRub,
        totalPriceUsd: order.totalPriceUsd,
      },
    });
    return newOrder;
  }

  getOrderById(id: string): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;
    return this.enrichOrder(order);
  }

  getOrdersByBuyer(buyerId: string): Order[] {
    return Array.from(this.orders.values())
      .filter(o => o.buyerId === buyerId)
      .map(o => this.enrichOrder(o));
  }

  getOrdersByBuyerEmail(email: string): Order[] {
    return Array.from(this.orders.values())
      .filter(o => o.buyerEmail === email)
      .map(o => this.enrichOrder(o));
  }

  getOrdersBySeller(sellerId: string): Order[] {
    const sellerProducts = this.getProductsBySeller(sellerId).map(p => p.id);
    return Array.from(this.orders.values())
      .filter(o => {
        const items = Array.from(this.orderItems.values()).filter(i => i.orderId === o.id);
        return items.some(i => sellerProducts.includes(i.productId));
      })
      .map(o => this.enrichOrder(o));
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values()).map(o => this.enrichOrder(o));
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updated);
    return this.enrichOrder(updated);
  }

  enrichOrder(order: Order): Order {
    const items = Array.from(this.orderItems.values())
      .filter(i => i.orderId === order.id)
      .map(i => ({
        ...i,
        product: this.getProductById(i.productId),
      }));
    const stockItems = Array.from(this.stockItems.values())
      .filter(s => s.orderId === order.id);
    return { ...order, items, stockItems };
  }

  // Order Item operations
  createOrderItem(item: Omit<OrderItem, 'id'>): OrderItem {
    const newItem: OrderItem = {
      ...item,
      id: uuidv4(),
    };
    this.orderItems.set(newItem.id, newItem);
    return newItem;
  }

  // Ticket operations
  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Ticket {
    const newTicket: Ticket = {
      ...ticket,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tickets.set(newTicket.id, newTicket);
    return newTicket;
  }

  getTicketById(id: string): Ticket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    return this.enrichTicket(ticket);
  }

  getTicketsByOrder(orderId: string): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.orderId === orderId)
      .map(t => this.enrichTicket(t));
  }

  getAllTickets(): Ticket[] {
    return Array.from(this.tickets.values()).map(t => this.enrichTicket(t));
  }

  updateTicket(id: string, updates: Partial<Ticket>): Ticket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    const updated = { ...ticket, ...updates, updatedAt: new Date() };
    this.tickets.set(id, updated);
    return this.enrichTicket(updated);
  }

  enrichTicket(ticket: Ticket): Ticket {
    const messages = Array.from(this.ticketMessages.values())
      .filter(m => m.ticketId === ticket.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const order = this.orders.get(ticket.orderId);
    return { ...ticket, messages, order };
  }

  // Ticket Message operations
  createTicketMessage(message: Omit<TicketMessage, 'id' | 'createdAt'>): TicketMessage {
    const newMessage: TicketMessage = {
      ...message,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.ticketMessages.set(newMessage.id, newMessage);
    return newMessage;
  }

  // Review operations
  createReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
    const newReview: Review = {
      ...review,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.reviews.set(newReview.id, newReview);
    this.updateSellerReputation(review.sellerId);
    return newReview;
  }

  updateSellerReputation(sellerId: string): void {
    const sellerReviews = Array.from(this.reviews.values())
      .filter(r => r.sellerId === sellerId);
    const positive = sellerReviews.filter(r => r.isPositive).length;
    const total = sellerReviews.length;
    const reputation = total > 0 ? (positive / total) * 100 : 100;
    
    const seller = this.users.get(sellerId);
    if (seller) {
      this.users.set(sellerId, {
        ...seller,
        reputation,
        positiveVotes: positive,
        negativeVotes: total - positive,
      });
    }
  }

  // API Key operations
  createApiKey(apiKey: Omit<ApiKey, 'id' | 'createdAt'>): ApiKey {
    const newApiKey: ApiKey = {
      ...apiKey,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.apiKeys.set(newApiKey.id, newApiKey);
    const seller = this.getUserById(apiKey.sellerId);
    this.createAuditLog({
      actorId: apiKey.sellerId,
      actorEmail: seller?.email,
      actorRole: seller?.role,
      action: 'API_KEY_CREATED',
      entityType: 'API_KEY',
      entityId: newApiKey.id,
      details: `API key created: ${newApiKey.name}`,
    });
    return newApiKey;
  }

  getApiKeysBySeller(sellerId: string): ApiKey[] {
    return Array.from(this.apiKeys.values())
      .filter(k => k.sellerId === sellerId);
  }

  // Crypto Transaction operations
  createCryptoTransaction(tx: Omit<CryptoTransaction, 'id' | 'createdAt'>): CryptoTransaction {
    const newTx: CryptoTransaction = {
      ...tx,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.cryptoTransactions.set(newTx.id, newTx);
    const actor = this.getUserById(tx.userId);
    this.createAuditLog({
      actorId: tx.userId,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: 'CRYPTO_TRANSACTION_CREATED',
      entityType: 'CRYPTO_TRANSACTION',
      entityId: newTx.id,
      details: `${tx.type} ${tx.cryptoType} transaction created`,
      metadata: {
        amountCrypto: tx.amountCrypto,
        amountRub: tx.amountRub,
        amountUsd: tx.amountUsd,
      },
    });
    return newTx;
  }

  getCryptoTransactionsByUser(userId: string): CryptoTransaction[] {
    return Array.from(this.cryptoTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAllCryptoTransactions(): CryptoTransaction[] {
    return Array.from(this.cryptoTransactions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateCryptoTransaction(id: string, updates: Partial<CryptoTransaction>): CryptoTransaction | undefined {
    const tx = this.cryptoTransactions.get(id);
    if (!tx) return undefined;
    const updated = { ...tx, ...updates };
    this.cryptoTransactions.set(id, updated);
    return updated;
  }

  // Site Config operations
  getSiteConfig(): SiteConfig {
    if (!this.siteConfig) {
      this.siteConfig = {
        id: uuidv4(),
        globalCommission: DEFAULT_PLATFORM_CONFIG.globalCommissionPercent,
        usdToRubRate: DEFAULT_PLATFORM_CONFIG.usdToRubRate,
        minWithdrawalRub: DEFAULT_PLATFORM_CONFIG.minWithdrawalRub,
        minWithdrawalUsd: 5,
        updatedAt: new Date(),
      };
    }
    return this.siteConfig;
  }

  updateSiteConfig(updates: Partial<SiteConfig>): SiteConfig {
    const current = this.getSiteConfig();
    this.siteConfig = { ...current, ...updates, updatedAt: new Date() };
    this.createAuditLog({
      actorRole: 'SYSTEM',
      action: 'SITE_CONFIG_UPDATED',
      entityType: 'SITE_CONFIG',
      entityId: this.siteConfig.id,
      details: 'Site configuration updated',
    });
    return this.siteConfig;
  }

  // Cart Session operations
  createCartSession(session: Omit<CartSession, 'id' | 'createdAt'>): CartSession {
    const newSession: CartSession = {
      ...session,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.cartSessions.set(newSession.sessionId, newSession);
    return newSession;
  }

  getCartSession(sessionId: string): CartSession | undefined {
    return this.cartSessions.get(sessionId);
  }

  updateCartSession(sessionId: string, updates: Partial<CartSession>): CartSession | undefined {
    const session = this.cartSessions.get(sessionId);
    if (!session) return undefined;
    const updated = { ...session, ...updates };
    this.cartSessions.set(sessionId, updated);
    return updated;
  }

  deleteCartSession(sessionId: string): boolean {
    return this.cartSessions.delete(sessionId);
  }

  // Seed initial data
  seedData(): void {
    // Create site config
    this.siteConfig = {
      id: uuidv4(),
      globalCommission: DEFAULT_PLATFORM_CONFIG.globalCommissionPercent,
      usdToRubRate: DEFAULT_PLATFORM_CONFIG.usdToRubRate,
      minWithdrawalRub: DEFAULT_PLATFORM_CONFIG.minWithdrawalRub,
      minWithdrawalUsd: 5,
      updatedAt: new Date(),
    };

    // Create Admin user
    this.createUser({
      clerkId: 'admin_1',
      email: 'admin@hsello.com',
      password: 'admin123',
      role: 'ADMIN',
      balanceRub: 16000,
      balanceUsd: convertRubToUsd(16000, this.siteConfig),
      reputation: 100,
      positiveVotes: 0,
      negativeVotes: 0,
      isBanned: false,
    });

    // Create Demo Buyer
    this.createUser({
      clerkId: 'buyer_1',
      email: 'buyer@demo.com',
      password: 'buyer123',
      role: 'BUYER',
      balanceRub: 5000,
      balanceUsd: 55,
      reputation: 100,
      positiveVotes: 15,
      negativeVotes: 0,
      isBanned: false,
    });

    // Create Demo Sellers
    const seller1 = this.createUser({
      clerkId: 'seller_1',
      email: 'seller1@demo.com',
      password: 'seller123',
      role: 'SELLER',
      storeName: 'Alpha Accounts Store',
      storeDescription: 'High quality aged and verified social accounts',
      balanceRub: 25000,
      balanceUsd: 275,
      supplierId: '#1001',
      sellerModerationStatus: 'APPROVED',
      sellerModeratedAt: new Date(),
      insuranceBalanceRub: 1000,
      insuranceLevel: 'LEVEL_3',
      reputation: 98.5,
      positiveVotes: 197,
      negativeVotes: 3,
      isBanned: false,
    });

    const seller2 = this.createUser({
      clerkId: 'seller_2',
      email: 'seller2@demo.com',
      password: 'seller123',
      role: 'SELLER',
      storeName: 'Nova Digital Vault',
      storeDescription: 'Fresh and bulk accounts for daily operations',
      balanceRub: 18000,
      balanceUsd: 195,
      supplierId: '#1002',
      sellerModerationStatus: 'APPROVED',
      sellerModeratedAt: new Date(),
      insuranceBalanceRub: 5000,
      insuranceLevel: 'LEVEL_2',
      reputation: 96.2,
      positiveVotes: 128,
      negativeVotes: 5,
      isBanned: false,
    });

    const seller3 = this.createUser({
      clerkId: 'seller_3',
      email: 'seller3@demo.com',
      password: 'seller123',
      role: 'SELLER',
      storeName: 'Prime Access Hub',
      storeDescription: 'Premium subscriptions and verified premium assets',
      balanceRub: 45000,
      balanceUsd: 490,
      supplierId: '#1003',
      sellerModerationStatus: 'APPROVED',
      sellerModeratedAt: new Date(),
      insuranceBalanceRub: 10000,
      insuranceLevel: 'LEVEL_1',
      reputation: 99.1,
      positiveVotes: 450,
      negativeVotes: 4,
      isBanned: false,
    });

    // Create Categories - 50+ categories
    const categories = [
      // Social Media - Level 1
      { name: 'Instagram', nameRu: 'Instagram', nameZh: 'Instagram', icon: 'Instagram', slug: 'instagram', desc: 'Instagram accounts', descRu: 'Аккаунты Instagram', descZh: 'Instagram账户' },
      { name: 'Facebook', nameRu: 'Facebook', nameZh: 'Facebook', icon: 'Facebook', slug: 'facebook', desc: 'Facebook accounts', descRu: 'Аккаунты Facebook', descZh: 'Facebook账户' },
      { name: 'Twitter / X', nameRu: 'Twitter / X', nameZh: 'Twitter / X', icon: 'Twitter', slug: 'twitter', desc: 'Twitter/X accounts', descRu: 'Аккаунты Twitter/X', descZh: 'Twitter/X账户' },
      { name: 'TikTok', nameRu: 'TikTok', nameZh: 'TikTok', icon: 'Music', slug: 'tiktok', desc: 'TikTok accounts', descRu: 'Аккаунты TikTok', descZh: 'TikTok账户' },
      { name: 'LinkedIn', nameRu: 'LinkedIn', nameZh: 'LinkedIn', icon: 'Linkedin', slug: 'linkedin', desc: 'LinkedIn accounts', descRu: 'Аккаунты LinkedIn', descZh: 'LinkedIn账户' },
      { name: 'YouTube', nameRu: 'YouTube', nameZh: 'YouTube', icon: 'Youtube', slug: 'youtube', desc: 'YouTube accounts', descRu: 'Аккаунты YouTube', descZh: 'YouTube账户' },
      { name: 'Pinterest', nameRu: 'Pinterest', nameZh: 'Pinterest', icon: 'Image', slug: 'pinterest', desc: 'Pinterest accounts', descRu: 'Аккаунты Pinterest', descZh: 'Pinterest账户' },
      { name: 'Snapchat', nameRu: 'Snapchat', nameZh: 'Snapchat', icon: 'Camera', slug: 'snapchat', desc: 'Snapchat accounts', descRu: 'Аккаунты Snapchat', descZh: 'Snapchat账户' },
      { name: 'Reddit', nameRu: 'Reddit', nameZh: 'Reddit', icon: 'MessageSquare', slug: 'reddit', desc: 'Reddit accounts', descRu: 'Аккаунты Reddit', descZh: 'Reddit账户' },
      { name: 'Telegram', nameRu: 'Telegram', nameZh: 'Telegram', icon: 'Send', slug: 'telegram', desc: 'Telegram accounts', descRu: 'Аккаунты Telegram', descZh: 'Telegram账户' },
      { name: 'Discord', nameRu: 'Discord', nameZh: 'Discord', icon: 'MessageCircle', slug: 'discord', desc: 'Discord accounts', descRu: 'Аккаунты Discord', descZh: 'Discord账户' },
      { name: 'VKontakte', nameRu: 'ВКонтакте', nameZh: 'VKontakte', icon: 'Globe', slug: 'vk', desc: 'VK accounts', descRu: 'Аккаунты ВКонтакте', descZh: 'VK账户' },
      
      // Email Services - Level 1
      { name: 'Gmail', nameRu: 'Gmail', nameZh: 'Gmail', icon: 'Mail', slug: 'gmail', desc: 'Gmail accounts', descRu: 'Аккаунты Gmail', descZh: 'Gmail账户' },
      { name: 'Outlook', nameRu: 'Outlook', nameZh: 'Outlook', icon: 'Mail', slug: 'outlook', desc: 'Outlook accounts', descRu: 'Аккаунты Outlook', descZh: 'Outlook账户' },
      { name: 'Yahoo Mail', nameRu: 'Yahoo Mail', nameZh: 'Yahoo Mail', icon: 'Mail', slug: 'yahoo', desc: 'Yahoo accounts', descRu: 'Аккаунты Yahoo', descZh: 'Yahoo账户' },
      { name: 'ProtonMail', nameRu: 'ProtonMail', nameZh: 'ProtonMail', icon: 'Shield', slug: 'protonmail', desc: 'ProtonMail accounts', descRu: 'Аккаунты ProtonMail', descZh: 'ProtonMail账户' },
      { name: 'Mail.ru', nameRu: 'Mail.ru', nameZh: 'Mail.ru', icon: 'Mail', slug: 'mailru', desc: 'Mail.ru accounts', descRu: 'Аккаунты Mail.ru', descZh: 'Mail.ru账户' },
      { name: 'Yandex', nameRu: 'Яндекс', nameZh: 'Yandex', icon: 'Mail', slug: 'yandex', desc: 'Yandex accounts', descRu: 'Аккаунты Яндекс', descZh: 'Yandex账户' },
      
      // Streaming / OTT - Level 1
      { name: 'Netflix', nameRu: 'Netflix', nameZh: 'Netflix', icon: 'Film', slug: 'netflix', desc: 'Netflix accounts', descRu: 'Аккаунты Netflix', descZh: 'Netflix账户' },
      { name: 'Spotify', nameRu: 'Spotify', nameZh: 'Spotify', icon: 'Music', slug: 'spotify', desc: 'Spotify accounts', descRu: 'Аккаунты Spotify', descZh: 'Spotify账户' },
      { name: 'YouTube Premium', nameRu: 'YouTube Premium', nameZh: 'YouTube Premium', icon: 'Youtube', slug: 'youtube-premium', desc: 'YouTube Premium', descRu: 'YouTube Premium', descZh: 'YouTube Premium' },
      { name: 'Disney+', nameRu: 'Disney+', nameZh: 'Disney+', icon: 'Film', slug: 'disney', desc: 'Disney+ accounts', descRu: 'Аккаунты Disney+', descZh: 'Disney+账户' },
      { name: 'HBO Max', nameRu: 'HBO Max', nameZh: 'HBO Max', icon: 'Film', slug: 'hbo', desc: 'HBO Max accounts', descRu: 'Аккаунты HBO Max', descZh: 'HBO Max账户' },
      { name: 'Amazon Prime', nameRu: 'Amazon Prime', nameZh: 'Amazon Prime', icon: 'Package', slug: 'amazon-prime', desc: 'Amazon Prime', descRu: 'Amazon Prime', descZh: 'Amazon Prime' },
      { name: 'Hulu', nameRu: 'Hulu', nameZh: 'Hulu', icon: 'Tv', slug: 'hulu', desc: 'Hulu accounts', descRu: 'Аккаунты Hulu', descZh: 'Hulu账户' },
      { name: 'Apple TV+', nameRu: 'Apple TV+', nameZh: 'Apple TV+', icon: 'Tv', slug: 'apple-tv', desc: 'Apple TV+', descRu: 'Apple TV+', descZh: 'Apple TV+' },
      { name: 'Crunchyroll', nameRu: 'Crunchyroll', nameZh: 'Crunchyroll', icon: 'Film', slug: 'crunchyroll', desc: 'Crunchyroll accounts', descRu: 'Аккаунты Crunchyroll', descZh: 'Crunchyroll账户' },
      
      // VPN & Proxy - Level 1
      { name: 'NordVPN', nameRu: 'NordVPN', nameZh: 'NordVPN', icon: 'Shield', slug: 'nordvpn', desc: 'NordVPN accounts', descRu: 'Аккаунты NordVPN', descZh: 'NordVPN账户' },
      { name: 'ExpressVPN', nameRu: 'ExpressVPN', nameZh: 'ExpressVPN', icon: 'Shield', slug: 'expressvpn', desc: 'ExpressVPN accounts', descRu: 'Аккаунты ExpressVPN', descZh: 'ExpressVPN账户' },
      { name: 'Surfshark', nameRu: 'Surfshark', nameZh: 'Surfshark', icon: 'Shield', slug: 'surfshark', desc: 'Surfshark accounts', descRu: 'Аккаунты Surfshark', descZh: 'Surfshark账户' },
      { name: 'CyberGhost', nameRu: 'CyberGhost', nameZh: 'CyberGhost', icon: 'Shield', slug: 'cyberghost', desc: 'CyberGhost accounts', descRu: 'Аккаунты CyberGhost', descZh: 'CyberGhost账户' },
      { name: 'ProtonVPN', nameRu: 'ProtonVPN', nameZh: 'ProtonVPN', icon: 'Shield', slug: 'protonvpn', desc: 'ProtonVPN accounts', descRu: 'Аккаунты ProtonVPN', descZh: 'ProtonVPN账户' },
      { name: 'IPVanish', nameRu: 'IPVanish', nameZh: 'IPVanish', icon: 'Shield', slug: 'ipvanish', desc: 'IPVanish accounts', descRu: 'Аккаунты IPVanish', descZh: 'IPVanish账户' },
      
      // AI Bots - Level 1
      { name: 'ChatGPT', nameRu: 'ChatGPT', nameZh: 'ChatGPT', icon: 'Bot', slug: 'chatgpt', desc: 'ChatGPT Plus accounts', descRu: 'Аккаунты ChatGPT Plus', descZh: 'ChatGPT Plus账户' },
      { name: 'Claude AI', nameRu: 'Claude AI', nameZh: 'Claude AI', icon: 'Bot', slug: 'claude', desc: 'Claude AI accounts', descRu: 'Аккаунты Claude AI', descZh: 'Claude AI账户' },
      { name: 'Midjourney', nameRu: 'Midjourney', nameZh: 'Midjourney', icon: 'Image', slug: 'midjourney', desc: 'Midjourney accounts', descRu: 'Аккаунты Midjourney', descZh: 'Midjourney账户' },
      { name: 'DALL-E', nameRu: 'DALL-E', nameZh: 'DALL-E', icon: 'Image', slug: 'dalle', desc: 'DALL-E accounts', descRu: 'Аккаунты DALL-E', descZh: 'DALL-E账户' },
      { name: 'Jasper AI', nameRu: 'Jasper AI', nameZh: 'Jasper AI', icon: 'Bot', slug: 'jasper', desc: 'Jasper AI accounts', descRu: 'Аккаунты Jasper AI', descZh: 'Jasper AI账户' },
      { name: 'Copy.ai', nameRu: 'Copy.ai', nameZh: 'Copy.ai', icon: 'Bot', slug: 'copyai', desc: 'Copy.ai accounts', descRu: 'Аккаунты Copy.ai', descZh: 'Copy.ai账户' },
      
      // Gaming - Level 1
      { name: 'Steam', nameRu: 'Steam', nameZh: 'Steam', icon: 'Gamepad2', slug: 'steam', desc: 'Steam accounts', descRu: 'Аккаунты Steam', descZh: 'Steam账户' },
      { name: 'Epic Games', nameRu: 'Epic Games', nameZh: 'Epic Games', icon: 'Gamepad2', slug: 'epic', desc: 'Epic Games accounts', descRu: 'Аккаунты Epic Games', descZh: 'Epic Games账户' },
      { name: 'Xbox Game Pass', nameRu: 'Xbox Game Pass', nameZh: 'Xbox Game Pass', icon: 'Gamepad2', slug: 'xbox', desc: 'Xbox Game Pass', descRu: 'Xbox Game Pass', descZh: 'Xbox Game Pass' },
      { name: 'PlayStation Plus', nameRu: 'PlayStation Plus', nameZh: 'PlayStation Plus', icon: 'Gamepad2', slug: 'playstation', desc: 'PS Plus accounts', descRu: 'Аккаунты PS Plus', descZh: 'PS Plus账户' },
      { name: 'EA Play', nameRu: 'EA Play', nameZh: 'EA Play', icon: 'Gamepad2', slug: 'ea-play', desc: 'EA Play accounts', descRu: 'Аккаунты EA Play', descZh: 'EA Play账户' },
      { name: 'Ubisoft+', nameRu: 'Ubisoft+', nameZh: 'Ubisoft+', icon: 'Gamepad2', slug: 'ubisoft', desc: 'Ubisoft+ accounts', descRu: 'Аккаунты Ubisoft+', descZh: 'Ubisoft+账户' },
      
      // Other Services - Level 1
      { name: 'Canva Pro', nameRu: 'Canva Pro', nameZh: 'Canva Pro', icon: 'Palette', slug: 'canva', desc: 'Canva Pro accounts', descRu: 'Аккаунты Canva Pro', descZh: 'Canva Pro账户' },
      { name: 'Adobe Creative', nameRu: 'Adobe Creative', nameZh: 'Adobe Creative', icon: 'Palette', slug: 'adobe', desc: 'Adobe Creative Cloud', descRu: 'Adobe Creative Cloud', descZh: 'Adobe Creative Cloud' },
      { name: 'Figma', nameRu: 'Figma', nameZh: 'Figma', icon: 'Palette', slug: 'figma', desc: 'Figma accounts', descRu: 'Аккаунты Figma', descZh: 'Figma账户' },
      { name: 'Notion', nameRu: 'Notion', nameZh: 'Notion', icon: 'FileText', slug: 'notion', desc: 'Notion accounts', descRu: 'Аккаунты Notion', descZh: 'Notion账户' },
      { name: 'GitHub', nameRu: 'GitHub', nameZh: 'GitHub', icon: 'Github', slug: 'github', desc: 'GitHub accounts', descRu: 'Аккаунты GitHub', descZh: 'GitHub账户' },
      { name: 'Shutterstock', nameRu: 'Shutterstock', nameZh: 'Shutterstock', icon: 'Image', slug: 'shutterstock', desc: 'Shutterstock accounts', descRu: 'Аккаунты Shutterstock', descZh: 'Shutterstock账户' },
      { name: 'Others', nameRu: 'Другое', nameZh: '其他', icon: 'MoreHorizontal', slug: 'others', desc: 'Other services not listed above', descRu: 'Другие сервисы, не указанные выше', descZh: '未在上方列出的其他服务' },
    ];

    const categoryMap = new Map<string, Category>();
    
    categories.forEach((cat, index) => {
      const category = this.createCategory({
        name: cat.name,
        nameRu: cat.nameRu,
        nameZh: cat.nameZh,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.desc,
        descriptionRu: cat.descRu,
        descriptionZh: cat.descZh,
        isActive: true,
        order: index,
      });
      categoryMap.set(cat.slug, category);
    });

    // Create sample products for each category
    const sampleProducts = [
      // Instagram products
      { category: 'instagram', seller: seller1, title: 'Instagram Aged Accounts | 6+ Months', titleRu: 'Возрастные аккаунты Instagram | 6+ месяцев', priceUsd: 3.50, tags: ['Aged', 'SMS Verified', 'Real'], tagsRu: ['Возрастной', 'SMS верифицирован', 'Реальный'] },
      { category: 'instagram', seller: seller2, title: 'Instagram Fresh Accounts | PVA', titleRu: 'Свежие аккаунты Instagram | PVA', priceUsd: 0.80, tags: ['PVA', 'Fresh', 'Real'], tagsRu: ['PVA', 'Свежий', 'Реальный'] },
      { category: 'instagram', seller: seller3, title: 'Instagram Business Accounts', titleRu: 'Бизнес аккаунты Instagram', priceUsd: 5.00, tags: ['Business', 'Verified', 'Real'], tagsRu: ['Бизнес', 'Верифицирован', 'Реальный'] },
      
      // Gmail products
      { category: 'gmail', seller: seller1, title: 'Gmail PVA Accounts | Phone Verified', titleRu: 'PVA аккаунты Gmail | Телефон верифицирован', priceUsd: 0.45, tags: ['PVA', 'SMS Verified', 'Real'], tagsRu: ['PVA', 'SMS верифицирован', 'Реальный'] },
      { category: 'gmail', seller: seller2, title: 'Gmail Aged Accounts | 2+ Years', titleRu: 'Возрастные аккаунты Gmail | 2+ года', priceUsd: 1.20, tags: ['Aged', 'Trusted', 'Real'], tagsRu: ['Возрастной', 'Надежный', 'Реальный'] },
      { category: 'gmail', seller: seller3, title: 'Gmail Bulk Accounts | 100+', titleRu: 'Массовые аккаунты Gmail | 100+', priceUsd: 0.25, tags: ['Bulk', 'Fresh', 'No Warranty'], tagsRu: ['Массовый', 'Свежий', 'Без гарантии'] },
      
      // Netflix products
      { category: 'netflix', seller: seller1, title: 'Netflix Premium 4K | 1 Month', titleRu: 'Netflix Premium 4K | 1 месяц', priceUsd: 2.50, tags: ['Premium', '4K', 'Shared'], tagsRu: ['Премиум', '4K', 'Общий'] },
      { category: 'netflix', seller: seller2, title: 'Netflix Standard HD | 3 Months', titleRu: 'Netflix Standard HD | 3 месяца', priceUsd: 5.00, tags: ['HD', 'Private', 'Warranty'], tagsRu: ['HD', 'Приватный', 'Гарантия'] },
      
      // NordVPN products
      { category: 'nordvpn', seller: seller1, title: 'NordVPN Premium | 1-12 Months', titleRu: 'NordVPN Premium | 1-12 месяцев', priceUsd: 2.00, tags: ['Premium', 'Retriv'], tagsRu: ['Премиум', 'Retriv'] },
      { category: 'nordvpn', seller: seller3, title: 'NordVPN Lifetime Access', titleRu: 'NordVPN пожизненный доступ', priceUsd: 8.00, tags: ['Lifetime', 'Warranty'], tagsRu: ['Пожизненный', 'Гарантия'] },
      
      // ChatGPT products
      { category: 'chatgpt', seller: seller2, title: 'ChatGPT Plus | 1 Month', titleRu: 'ChatGPT Plus | 1 месяц', priceUsd: 15.00, tags: ['Plus', 'GPT-4', 'Private'], tagsRu: ['Plus', 'GPT-4', 'Приватный'] },
      { category: 'chatgpt', seller: seller1, title: 'ChatGPT Plus | Shared', titleRu: 'ChatGPT Plus | Общий', priceUsd: 5.00, tags: ['Plus', 'Shared', 'Retriv'], tagsRu: ['Plus', 'Общий', 'Retriv'] },
      
      // Steam products
      { category: 'steam', seller: seller3, title: 'Steam Accounts with Games', titleRu: 'Аккаунты Steam с играми', priceUsd: 10.00, tags: ['Games', 'Level 10+', 'Warranty'], tagsRu: ['Игры', 'Уровень 10+', 'Гарантия'] },
      
      // Telegram products
      { category: 'telegram', seller: seller1, title: 'Telegram Accounts | TDATA', titleRu: 'Аккаунты Telegram | TDATA', priceUsd: 1.20, tags: ['TDATA', 'Retriv', 'No Warranty'], tagsRu: ['TDATA', 'Retriv', 'Без гарантии'] },
      { category: 'telegram', seller: seller2, title: 'Telegram Premium | 1 Year', titleRu: 'Telegram Premium | 1 год', priceUsd: 25.00, tags: ['Premium', 'Gift', 'Warranty'], tagsRu: ['Премиум', 'Подарок', 'Гарантия'] },
      
      // Twitter products
      { category: 'twitter', seller: seller2, title: 'Twitter/X Aged Accounts | 2015+', titleRu: 'Возрастные аккаунты Twitter/X | 2015+', priceUsd: 4.50, tags: ['Aged', 'Real', 'SMS Verified'], tagsRu: ['Возрастной', 'Реальный', 'SMS верифицирован'] },
      
      // Spotify products
      { category: 'spotify', seller: seller1, title: 'Spotify Premium | 1 Month', titleRu: 'Spotify Premium | 1 месяц', priceUsd: 1.50, tags: ['Premium', 'Family', 'Shared'], tagsRu: ['Премиум', 'Семейный', 'Общий'] },
      { category: 'spotify', seller: seller3, title: 'Spotify Premium | 6 Months', titleRu: 'Spotify Premium | 6 месяцев', priceUsd: 6.00, tags: ['Premium', 'Duo', 'Warranty'], tagsRu: ['Премиум', 'Duo', 'Гарантия'] },
      
      // Canva products
      { category: 'canva', seller: seller2, title: 'Canva Pro | 1 Year', titleRu: 'Canva Pro | 1 год', priceUsd: 8.00, tags: ['Pro', 'Education', 'Warranty'], tagsRu: ['Pro', 'Образование', 'Гарантия'] },
      
      // Midjourney products
      { category: 'midjourney', seller: seller1, title: 'Midjourney Pro | 1 Month', titleRu: 'Midjourney Pro | 1 месяц', priceUsd: 20.00, tags: ['Pro', 'Unlimited', 'Private'], tagsRu: ['Pro', 'Безлимит', 'Приватный'] },
    ];

    sampleProducts.forEach((prod) => {
      const category = categoryMap.get(prod.category);
      if (!category) return;

      const product = this.createProduct({
        sellerId: prod.seller.id,
        categoryId: category.id,
        title: prod.title,
        titleRu: prod.titleRu,
        titleZh: prod.title,
        description: `High quality ${prod.title.toLowerCase()} for your needs`,
        descriptionRu: `Высококачественные ${prod.titleRu.toLowerCase()} для ваших нужд`,
        descriptionZh: `高质量的${prod.title}`,
        priceRub: convertUsdToRub(prod.priceUsd, this.siteConfig),
        priceUsd: prod.priceUsd,
        formatType: 'SINGLE_LINE',
        delimiter: ':',
        tags: prod.tags,
        tagsRu: prod.tagsRu,
        tagsZh: prod.tags,
        isActive: true,
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        moderatedById: Array.from(this.users.values()).find((u) => u.role === 'ADMIN')?.id,
        requiresVideo: prod.tags.includes('Retriv') || prod.tagsRu.includes('Retriv'),
        warrantyDays: prod.tags.includes('No Warranty') || prod.tagsRu.includes('Без гарантии') ? 0 : 24,
      });

      // Add bulk prices
      product.bulkPrices = [
        { id: uuidv4(), productId: product.id, minQty: 5, maxQty: 19, priceRub: convertUsdToRub(prod.priceUsd * 0.9, this.siteConfig), priceUsd: prod.priceUsd * 0.9 },
        { id: uuidv4(), productId: product.id, minQty: 20, maxQty: 49, priceRub: convertUsdToRub(prod.priceUsd * 0.8, this.siteConfig), priceUsd: prod.priceUsd * 0.8 },
        { id: uuidv4(), productId: product.id, minQty: 50, maxQty: 999999, priceRub: convertUsdToRub(prod.priceUsd * 0.7, this.siteConfig), priceUsd: prod.priceUsd * 0.7 },
      ];
      this.products.set(product.id, product);

      // Create stock items
      const stockCount = Math.floor(Math.random() * 200) + 50;
      for (let i = 0; i < stockCount; i++) {
        this.createStockItem({
          productId: product.id,
          dataContent: `${prod.category}_user${i + 1}_${Math.random().toString(36).substring(7)}:pass${Math.random().toString(36).substring(5)}`,
          isSold: false,
          isReserved: false,
        });
      }
    });
  }
}

export const db = new Database();

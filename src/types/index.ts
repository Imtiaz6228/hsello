export type Language = 'en' | 'ru' | 'zh';

export interface Translations {
  [key: string]: string | Translations;
}

export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER';
export type SellerModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ProductModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'DISCONTINUED';
export type InsuranceLevel = 'NONE' | 'LEVEL_3' | 'LEVEL_2' | 'LEVEL_1';

export interface User {
  id: string;
  clerkId: string;
  email: string;
  password?: string;
  role: UserRole;
  storeName?: string;
  storeDescription?: string;
  storeLogoUrl?: string;
  balanceRub: number;
  balanceUsd: number;
  supplierId?: string;
  reputation: number;
  positiveVotes: number;
  negativeVotes: number;
  adminRatingOverride?: number | null;
  adminSalesQtyBoost?: number;
  adminRevenueRubBoost?: number;
  adminRankBoost?: number;
  isBanned: boolean;
  sellerModerationStatus?: SellerModerationStatus;
  sellerModeratedAt?: Date;
  sellerModeratedById?: string;
  sellerModerationReason?: string;
  insuranceBalanceRub?: number;
  insuranceLevel?: InsuranceLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailNotification {
  id: string;
  userId: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  parentId?: string;
  name: string;
  nameRu: string;
  nameZh: string;
  slug: string;
  icon: string;
  imageUrl?: string;
  description: string;
  descriptionRu: string;
  descriptionZh: string;
  isActive: boolean;
  order: number;
  children?: Category[];
  stockCount?: number;
}

export type FormatType = 'SINGLE_LINE' | 'JSON' | 'COOKIE' | 'ARCHIVE';

export interface BulkPrice {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number;
  priceRub: number;
  priceUsd: number;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  titleRu: string;
  titleZh: string;
  description: string;
  descriptionRu: string;
  descriptionZh: string;
  imageUrl?: string;
  priceRub: number;
  priceUsd: number;
  bulkPrices: BulkPrice[];
  formatType: FormatType;
  delimiter: string;
  tags: string[];
  tagsRu: string[];
  tagsZh: string[];
  isActive: boolean;
  moderationStatus?: ProductModerationStatus;
  moderatedAt?: Date;
  moderatedById?: string;
  moderationReason?: string;
  discontinuedAt?: Date;
  discontinuedById?: string;
  discontinuedReason?: string;
  adminRatingOverride?: number | null;
  adminSalesQtyBoost?: number;
  adminRevenueRubBoost?: number;
  adminRankBoost?: number;
  requiresVideo: boolean;
  warrantyDays: number;
  createdAt: Date;
  updatedAt: Date;
  seller?: User;
  category?: Category;
  stockCount?: number;
}

export interface StockItem {
  id: string;
  productId: string;
  dataContent: string;
  isSold: boolean;
  isReserved: boolean;
  reservedAt?: Date;
  orderId?: string;
  createdAt: Date;
  soldAt?: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CRYPTO' | 'BALANCE';
export type CryptoType = 'BTC' | 'ETH' | 'USDT' | 'TRX';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceRub: number;
  priceUsd: number;
  product?: Product;
}

export interface Order {
  id: string;
  buyerId?: string;
  buyerEmail: string;
  totalPriceRub: number;
  totalPriceUsd: number;
  platformFeeRub: number;
  platformFeeUsd: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cryptoType?: CryptoType;
  paymentTxId?: string;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
  stockItems?: StockItem[];
}

export type TicketStatus = 'OPEN' | 'RESOLVED' | 'DISPUTED' | 'CLOSED';
export type TicketType = 'SUPPORT' | 'DISPUTE';
export type SenderType = 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  senderType: SenderType;
  message: string;
  messageRu?: string;
  messageZh?: string;
  attachments?: string[];
  createdAt: Date;
}

export interface Ticket {
  id: string;
  orderId: string;
  buyerId?: string;
  sellerId?: string;
  status: TicketStatus;
  type: TicketType;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: TicketMessage[];
  order?: Order;
}

export interface Review {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  isPositive: boolean;
  comment?: string;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  sellerId: string;
  key: string;
  name: string;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

export interface SiteConfig {
  id: string;
  globalCommission: number;
  usdToRubRate: number;
  minWithdrawalRub: number;
  minWithdrawalUsd: number;
  announcement?: string;
  announcementRu?: string;
  announcementZh?: string;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: UserRole | 'SYSTEM';
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

export interface CartSession {
  id: string;
  sessionId: string;
  items: { productId: string; quantity: number }[];
  expiresAt: Date;
  createdAt: Date;
}

export interface CryptoTransaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  cryptoType: CryptoType;
  amountCrypto: number;
  amountRub: number;
  amountUsd: number;
  txId?: string;
  address: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: Date;
  confirmedAt?: Date;
}

export type ViewType = 
  | 'MARKETPLACE' 
  | 'CART' 
  | 'CHECKOUT' 
  | 'ORDERS' 
  | 'SELLER_DASHBOARD' 
  | 'SELLER_PRODUCTS' 
  | 'SELLER_UPLOAD' 
  | 'SELLER_ORDERS'
  | 'SELLER_API'
  | 'SELLER_WITHDRAW'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_CATEGORIES'
  | 'ADMIN_USERS'
  | 'ADMIN_DISPUTES'
  | 'ADMIN_CONFIG'
  | 'ADMIN_FINANCE'
  | 'LOGIN'
  | 'REGISTER'
  | 'DEPOSIT'
  | 'PROFILE';

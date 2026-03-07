import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  User, Product, Category, CartItem, Order, ViewType, UserRole,
  Ticket, ApiKey, SiteConfig, Language, CryptoTransaction, CryptoType
} from '@/types';
import { db } from './database';
import {
  convertUsdToRub,
  getCommissionRate,
  getCryptoUsdValue,
} from '@/lib/platform';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  authPreferredRole: UserRole;
  
  // Language
  language: Language;
  
  // Navigation
  currentView: ViewType;
  selectedCategory: string | null;
  isMobileMenuOpen: boolean;
  
  // Data
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  tickets: Ticket[];
  apiKeys: ApiKey[];
  cryptoTransactions: CryptoTransaction[];
  siteConfig: SiteConfig;
  
  // UI State
  isCartOpen: boolean;
  searchQuery: string;
  loginAttempts: Record<string, { count: number; firstAttemptAt: number }>;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setAuthPreferredRole: (role: UserRole) => void;
  setLanguage: (lang: Language) => void;
  setCurrentView: (view: ViewType) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setIsMobileMenuOpen: (value: boolean) => void;
  canAttemptAuth: (email: string) => { allowed: boolean; retryAfterMs?: number };
  
  // Data Actions
  refreshCategories: () => void;
  refreshProducts: () => void;
  refreshOrders: () => void;
  refreshTickets: () => void;
  refreshCryptoTransactions: () => void;
  refreshSiteConfig: () => void;
  
  // Cart Actions
  addToCart: (productId: string, quantity: number) => { success: boolean; message: string };
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotalRub: () => number;
  getCartTotalUsd: () => number;
  getCartItemCount: () => number;
  
  // Search
  setSearchQuery: (query: string) => void;
  
  // UI Actions
  setIsCartOpen: (value: boolean) => void;
  
  // Auth Actions
  login: (email: string, password: string) => { success: boolean; user?: User; error?: string };
  register: (email: string, password: string, role: UserRole, storeName?: string, storeDescription?: string) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  
  // Crypto Actions
  depositCrypto: (cryptoType: CryptoType, amountCrypto: number, address: string) => CryptoTransaction;
  withdrawCrypto: (cryptoType: CryptoType, amountCrypto: number, address: string) => { success: boolean; error?: string };
  confirmDeposit: (txId: string) => void;
  depositSellerInsurance: (amountRub: number) => { success: boolean; error?: string };
  withdrawAdminBalance: (amountRub: number) => { success: boolean; error?: string };
  
  // Computed
  getFilteredProducts: () => Product[];
  getCategoryTree: () => Category[];
  getAdminBalance: () => { rub: number; usd: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentUser: null,
      isAuthenticated: false,
      authPreferredRole: 'BUYER',
      language: 'en',
      currentView: 'MARKETPLACE',
      selectedCategory: null,
      isMobileMenuOpen: false,
      categories: [],
      products: [],
      cart: [],
      orders: [],
      tickets: [],
      apiKeys: [],
      cryptoTransactions: [],
      siteConfig: db.getSiteConfig(),
      isCartOpen: false,
      searchQuery: '',
      loginAttempts: {},

      // Auth Actions
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setAuthPreferredRole: (role) => set({ authPreferredRole: role }),
      
      // Language
      setLanguage: (lang) => set({ language: lang }),

      // Navigation Actions
      setCurrentView: (view) => set({ currentView: view, isMobileMenuOpen: false }),
      setSelectedCategory: (categoryId) => {
        set({ selectedCategory: categoryId });
        get().refreshProducts();
      },
      setIsMobileMenuOpen: (value) => set({ isMobileMenuOpen: value }),

      canAttemptAuth: (email) => {
        const key = email.trim().toLowerCase();
        const now = Date.now();
        const attempts = get().loginAttempts[key];
        if (!attempts) return { allowed: true };

        const windowMs = 10 * 60 * 1000;
        if (now - attempts.firstAttemptAt > windowMs) {
          return { allowed: true };
        }

        if (attempts.count >= 7) {
          return { allowed: false, retryAfterMs: windowMs - (now - attempts.firstAttemptAt) };
        }

        return { allowed: true };
      },

      // Data Actions
      refreshCategories: () => {
        const tree = db.getCategoryTree();
        set({ categories: tree });
      },

      refreshProducts: () => {
        const { selectedCategory, searchQuery } = get();
        let products: Product[];
        
        if (selectedCategory) {
          const category = db.getCategoryById(selectedCategory);
          if (category) {
            const getAllSubcategoryIds = (catId: string): string[] => {
              const children = db.getChildCategories(catId);
              const childIds = children.map(c => c.id);
              const grandChildIds = children.flatMap(c => getAllSubcategoryIds(c.id));
              return [catId, ...childIds, ...grandChildIds];
            };
            
            const categoryIds = getAllSubcategoryIds(selectedCategory);
            products = categoryIds.flatMap(id => db.getProductsByCategory(id));
          } else {
            products = db.getAllProducts();
          }
        } else {
          products = db.getAllProducts();
        }

        products = Array.from(new Map(products.map(p => [p.id, p])).values());

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          products = products.filter(p => 
            p.title.toLowerCase().includes(query) ||
            p.titleRu.toLowerCase().includes(query) ||
            (p.description?.toLowerCase().includes(query) ?? false) ||
            p.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }

        set({ products });
      },

      refreshOrders: () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ orders: [] });
          return;
        }

        let orders: Order[];
        if (currentUser.role === 'SELLER') {
          orders = db.getOrdersBySeller(currentUser.id);
        } else if (currentUser.role === 'ADMIN') {
          orders = db.getAllOrders();
        } else {
          orders = db.getOrdersByBuyer(currentUser.id);
        }
        set({ orders });
      },

      refreshTickets: () => {
        const tickets = db.getAllTickets();
        set({ tickets });
      },
      
      refreshCryptoTransactions: () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ cryptoTransactions: [] });
          return;
        }
        
        if (currentUser.role === 'ADMIN') {
          set({ cryptoTransactions: db.getAllCryptoTransactions() });
        } else {
          set({ cryptoTransactions: db.getCryptoTransactionsByUser(currentUser.id) });
        }
      },

      refreshSiteConfig: () => {
        set({ siteConfig: db.getSiteConfig() });
      },

      // Cart Actions
      addToCart: (productId, quantity) => {
        const product = db.getProductById(productId);
        if (!product) {
          return { success: false, message: 'Product not found' };
        }

        const availableStock = db.getProductStockCount(productId);
        if (availableStock < quantity) {
          return { success: false, message: `Only ${availableStock} items available` };
        }

        const { cart } = get();
        const existingItem = cart.find(item => item.productId === productId);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          if (availableStock < newQuantity) {
            return { success: false, message: `Only ${availableStock} items available` };
          }
          
          set({
            cart: cart.map(item =>
              item.productId === productId
                ? { ...item, quantity: newQuantity }
                : item
            ),
          });
        } else {
          set({ cart: [...cart, { productId, quantity, product }] });
        }

        db.reserveStock(productId, quantity);
        return { success: true, message: 'Added to cart' };
      },

      removeFromCart: (productId) => {
        const { cart } = get();
        const item = cart.find(i => i.productId === productId);
        if (item) {
          const stockItems = Array.from(db.stockItems.values())
            .filter(s => s.productId === productId && s.isReserved && !s.isSold)
            .slice(0, item.quantity)
            .map(s => s.id);
          db.releaseReservedStock(stockItems);
        }
        
        set({ cart: cart.filter(item => item.productId !== productId) });
      },

      updateCartQuantity: (productId, quantity) => {
        const { cart } = get();
        const item = cart.find(i => i.productId === productId);
        if (!item) return;

        const product = db.getProductById(productId);
        if (!product) return;

        const availableStock = db.getProductStockCount(productId) + item.quantity;
        
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        if (availableStock < quantity) {
          return;
        }

        const diff = quantity - item.quantity;
        if (diff > 0) {
          db.reserveStock(productId, diff);
        } else if (diff < 0) {
          const stockItems = Array.from(db.stockItems.values())
            .filter(s => s.productId === productId && s.isReserved && !s.isSold)
            .slice(0, Math.abs(diff))
            .map(s => s.id);
          db.releaseReservedStock(stockItems);
        }

        set({
          cart: cart.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => {
        const { cart } = get();
        for (const item of cart) {
          const stockItems = Array.from(db.stockItems.values())
            .filter(s => s.productId === item.productId && s.isReserved && !s.isSold)
            .slice(0, item.quantity)
            .map(s => s.id);
          db.releaseReservedStock(stockItems);
        }
        set({ cart: [] });
      },

      getCartTotalRub: () => {
        const { cart } = get();
        return cart.reduce((total, item) => {
          const product = db.getProductById(item.productId);
          if (!product) return total;

          const bulkPrice = product.bulkPrices.find(
            bp => item.quantity >= bp.minQty && item.quantity <= bp.maxQty
          );
          const price = bulkPrice ? bulkPrice.priceRub : product.priceRub;
          return total + price * item.quantity;
        }, 0);
      },
      
      getCartTotalUsd: () => {
        const { cart } = get();
        return cart.reduce((total, item) => {
          const product = db.getProductById(item.productId);
          if (!product) return total;

          const bulkPrice = product.bulkPrices.find(
            bp => item.quantity >= bp.minQty && item.quantity <= bp.maxQty
          );
          const price = bulkPrice ? bulkPrice.priceUsd : product.priceUsd;
          return total + price * item.quantity;
        }, 0);
      },

      getCartItemCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },

      // Search
      setSearchQuery: (query) => {
        set({ searchQuery: query });
        get().refreshProducts();
      },

      // UI Actions
      setIsCartOpen: (value) => set({ isCartOpen: value }),

      // Auth Actions
      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const now = Date.now();
        const limiter = get().canAttemptAuth(normalizedEmail);
        if (!limiter.allowed) {
          const retryIn = Math.ceil((limiter.retryAfterMs || 0) / 1000);
          return { success: false, error: `Too many login attempts. Try again in ${retryIn}s` };
        }

        const user = db.getUserByEmail(normalizedEmail);
        if (!user) {
          const prev = get().loginAttempts[normalizedEmail];
          set({
            loginAttempts: {
              ...get().loginAttempts,
              [normalizedEmail]: {
                count: (prev?.count ?? 0) + 1,
                firstAttemptAt: prev?.firstAttemptAt ?? now,
              },
            },
          });
          return { success: false, error: 'User not found' };
        }
        if (user.password !== password) {
          const prev = get().loginAttempts[normalizedEmail];
          set({
            loginAttempts: {
              ...get().loginAttempts,
              [normalizedEmail]: {
                count: (prev?.count ?? 0) + 1,
                firstAttemptAt: prev?.firstAttemptAt ?? now,
              },
            },
          });
          return { success: false, error: 'Invalid password' };
        }
        if (user.isBanned) {
          return { success: false, error: 'Account is banned' };
        }
        if (user.role === 'SELLER' && user.sellerModerationStatus === 'PENDING') {
          return { success: false, error: 'Seller account is pending admin approval' };
        }
        if (user.role === 'SELLER' && user.sellerModerationStatus === 'REJECTED') {
          return { success: false, error: 'Seller account was rejected by admin' };
        }
        const nextAttempts = { ...get().loginAttempts };
        delete nextAttempts[normalizedEmail];
        set({ loginAttempts: nextAttempts });
        set({ currentUser: user, isAuthenticated: true });
        db.createAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'USER_LOGIN',
          entityType: 'USER',
          entityId: user.id,
          details: 'User logged in',
        });
        return { success: true, user };
      },

      register: (email, password, role, storeName, storeDescription) => {
        const normalizedEmail = email.trim().toLowerCase();
        const limiter = get().canAttemptAuth(normalizedEmail);
        if (!limiter.allowed) {
          const retryIn = Math.ceil((limiter.retryAfterMs || 0) / 1000);
          return { success: false, error: `Too many attempts. Try again in ${retryIn}s` };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          return { success: false, error: 'Invalid email format' };
        }

        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters' };
        }

        if (role === 'ADMIN') {
          return { success: false, error: 'Admin registration is disabled' };
        }

        const existingUser = db.getUserByEmail(normalizedEmail);
        if (existingUser) {
          return { success: false, error: 'User already exists' };
        }

        let supplierId: string | undefined;
        if (role === 'SELLER') {
          const sellerIds = Array.from(db.users.values())
            .filter(u => u.role === 'SELLER' && !!u.supplierId)
            .map(u => Number((u.supplierId || '').replace('#', '')))
            .filter(n => !Number.isNaN(n));

          const nextId = (sellerIds.length ? Math.max(...sellerIds) : 1000) + 1;
          supplierId = `#${nextId}`;
        }

        const user = db.createUser({
          clerkId: `local_${crypto.randomUUID()}`,
          email: normalizedEmail,
          password,
          role,
          storeName: role === 'SELLER' ? storeName : undefined,
          storeDescription: role === 'SELLER' ? storeDescription : undefined,
          balanceRub: role === 'BUYER' ? 1000 : 0,
          balanceUsd: role === 'BUYER' ? 11 : 0,
          supplierId,
          reputation: 100,
          positiveVotes: 0,
          negativeVotes: 0,
          isBanned: false,
          sellerModerationStatus: role === 'SELLER' ? 'PENDING' : undefined,
        });

        if (role === 'SELLER') {
          // Seller accounts must be approved by admin before accessing seller dashboard.
        } else if (role === 'BUYER') {
          db.bootstrapBuyerProfile(user.id);
        }

        const hydratedUser = db.getUserById(user.id) || user;

        if (role === 'SELLER') {
          set({
            currentUser: null,
            isAuthenticated: false,
            authPreferredRole: role,
          });

          db.createAuditLog({
            actorId: hydratedUser.id,
            actorEmail: hydratedUser.email,
            actorRole: hydratedUser.role,
            action: 'USER_REGISTERED',
            entityType: 'USER',
            entityId: hydratedUser.id,
            details: `New ${role} user registered`,
          });
          get().refreshProducts();
          get().refreshOrders();
          get().refreshCryptoTransactions();
          return { success: true, user: hydratedUser };
        }

        set({ currentUser: hydratedUser, isAuthenticated: true, authPreferredRole: role });
        db.createAuditLog({
          actorId: hydratedUser.id,
          actorEmail: hydratedUser.email,
          actorRole: hydratedUser.role,
          action: 'USER_REGISTERED',
          entityType: 'USER',
          entityId: hydratedUser.id,
          details: `New ${role} user registered`,
        });
        get().refreshProducts();
        get().refreshOrders();
        get().refreshCryptoTransactions();
        return { success: true, user: hydratedUser };
      },
      
      logout: () => {
        const currentUser = get().currentUser;
        if (currentUser) {
          db.createAuditLog({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role,
            action: 'USER_LOGOUT',
            entityType: 'USER',
            entityId: currentUser.id,
            details: 'User logged out',
          });
        }
        set({ currentUser: null, isAuthenticated: false, cart: [] });
      },
      
      // Crypto Actions
      depositCrypto: (cryptoType, amountCrypto, address) => {
        const { currentUser, siteConfig } = get();
        if (!currentUser) throw new Error('Not authenticated');

        const amountUsd = getCryptoUsdValue(cryptoType, amountCrypto);
        
        const tx = db.createCryptoTransaction({
          userId: currentUser.id,
          type: 'DEPOSIT',
          cryptoType,
          amountCrypto,
          amountRub: convertUsdToRub(amountUsd, siteConfig),
          amountUsd,
          address,
          status: 'PENDING',
        });
        
        return tx;
      },
      
      withdrawCrypto: (cryptoType, amountCrypto, address) => {
        const { currentUser, siteConfig } = get();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const amountUsd = getCryptoUsdValue(cryptoType, amountCrypto);
        const amountRub = convertUsdToRub(amountUsd, siteConfig);
        const commissionRate = getCommissionRate(siteConfig);
        const netAmountRub = amountRub * (1 - commissionRate);
        const netAmountUsd = amountUsd * (1 - commissionRate);
        
        if (currentUser.balanceRub < amountRub) {
          return { success: false, error: 'Insufficient balance' };
        }
        
        // Create withdrawal transaction
        db.createCryptoTransaction({
          userId: currentUser.id,
          type: 'WITHDRAWAL',
          cryptoType,
          amountCrypto,
          amountRub: netAmountRub,
          amountUsd: netAmountUsd,
          address,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        });
        
        // Update user balance
        db.updateUser(currentUser.id, {
          balanceRub: currentUser.balanceRub - amountRub,
          balanceUsd: currentUser.balanceUsd - amountUsd,
        });

        const updatedCurrentUser = db.getUserById(currentUser.id);
        if (updatedCurrentUser) {
          set({ currentUser: updatedCurrentUser });
        }
        
        // Add commission to admin
        const admin = Array.from(db.users.values()).find(u => u.role === 'ADMIN');
        if (admin) {
          db.updateUser(admin.id, {
            balanceRub: admin.balanceRub + (amountRub * commissionRate),
            balanceUsd: admin.balanceUsd + (amountUsd * commissionRate),
          });
        }
        
        return { success: true };
      },
      
      confirmDeposit: (txId) => {
        const tx = db.cryptoTransactions.get(txId);
        if (!tx || tx.status !== 'PENDING') return;
        
        db.updateCryptoTransaction(txId, { 
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        });
        
        const user = db.getUserById(tx.userId);
        if (user) {
          const updatedUser = db.updateUser(user.id, {
            balanceRub: user.balanceRub + tx.amountRub,
            balanceUsd: user.balanceUsd + tx.amountUsd,
          });

          const currentUser = get().currentUser;
          if (currentUser && currentUser.id === user.id && updatedUser) {
            set({ currentUser: updatedUser });
          }
        }
      },

      depositSellerInsurance: (amountRub) => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'SELLER') {
          return { success: false, error: 'Only sellers can deposit insurance' };
        }

        const result = db.depositSellerInsurance(currentUser.id, amountRub);
        if (!result.success) {
          return { success: false, error: result.error || 'Insurance deposit failed' };
        }

        if (result.seller) {
          set({ currentUser: result.seller });
        }

        return { success: true };
      },

      withdrawAdminBalance: (amountRub) => {
        const { currentUser, siteConfig } = get();
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Only admin can withdraw platform balance' };
        }

        const normalizedAmount = Math.round(amountRub);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
          return { success: false, error: 'Invalid amount' };
        }

        if (currentUser.balanceRub < normalizedAmount) {
          return { success: false, error: 'Insufficient admin balance' };
        }

        const amountUsd = normalizedAmount / siteConfig.usdToRubRate;
        const updatedAdmin = db.updateUser(currentUser.id, {
          balanceRub: currentUser.balanceRub - normalizedAmount,
          balanceUsd: Math.max(0, currentUser.balanceUsd - amountUsd),
        });

        if (!updatedAdmin) {
          return { success: false, error: 'Failed to withdraw admin balance' };
        }

        db.createAuditLog({
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          actorRole: currentUser.role,
          action: 'ADMIN_BALANCE_WITHDRAWN',
          entityType: 'USER',
          entityId: currentUser.id,
          details: `Admin withdrew ${normalizedAmount} RUB from platform balance`,
          metadata: {
            amountRub: normalizedAmount,
          },
        });

        set({ currentUser: updatedAdmin });
        return { success: true };
      },

      // Computed
      getFilteredProducts: () => {
        return get().products;
      },

      getCategoryTree: () => {
        return db.getCategoryTree();
      },
      
      getAdminBalance: () => {
        const admin = Array.from(db.users.values()).find(u => u.role === 'ADMIN');
        if (!admin) return { rub: 0, usd: 0 };
        return { rub: admin.balanceRub, usd: admin.balanceUsd };
      },
    }),
    {
      name: 'hsello-store',
      partialize: (state) => ({
        cart: state.cart,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        authPreferredRole: state.authPreferredRole,
        language: state.language,
        loginAttempts: state.loginAttempts,
      }),
    }
  )
);

// Initialize data
useAppStore.getState().refreshCategories();
useAppStore.getState().refreshProducts();

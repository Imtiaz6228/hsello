import type { Language } from '@/types';

export const translations = {
  en: {
    // Header
    marketplace: 'Marketplace',
    myOrders: 'My Orders',
    sellerDashboard: 'Seller Dashboard',
    adminPanel: 'Admin Panel',
    login: 'Login',
    logout: 'Logout',
    search: 'Search products...',
    cart: 'Cart',
    
    // Hero
    heroTitle: 'Digital Goods Marketplace',
    heroSubtitle: 'Buy and sell verified accounts securely. 50+ categories, instant delivery, 24/7 support.',
    startBuying: 'Start Buying',
    startSelling: 'Start Selling',
    
    // Categories
    categories: 'Categories',
    allProducts: 'All Products',
    socialMedia: 'Social Media',
    emailServices: 'Email Services',
    streaming: 'Streaming',
    vpnProxy: 'VPN & Proxy',
    aiBots: 'AI Bots',
    gaming: 'Gaming',
    
    // Product Table
    product: 'Product',
    supplier: 'Supplier',
    reputation: 'Reputation',
    stock: 'Stock',
    price: 'Price',
    addToCart: 'Add',
    
    // Cart
    shoppingCart: 'Shopping Cart',
    emptyCart: 'Your cart is empty',
    subtotal: 'Subtotal',
    platformFee: 'Platform Fee (10%)',
    total: 'Total',
    checkout: 'Checkout',
    clearCart: 'Clear Cart',
    proceedToCheckout: 'Proceed to Checkout',
    
    // Checkout
    contactInfo: 'Contact Information',
    emailAddress: 'Email Address',
    paymentMethod: 'Payment Method',
    crypto: 'Cryptocurrency',
    balance: 'Account Balance',
    termsTitle: 'Terms & Conditions',
    videoRequired: 'I agree to screen record for warranty',
    agreeTerms: 'I agree to Terms of Service',
    completePurchase: 'Complete Purchase',
    orderConfirmed: 'Order Confirmed!',
    orderSuccess: 'Your order has been placed successfully',
    orderPlacedSuccess: 'Order placed successfully',
    orderError: 'Failed to place order',
    loginRequired: 'Please login to continue',
    cartEmpty: 'Your cart is empty',
    insufficientBalance: 'Insufficient balance',
    
    // Seller
    dashboard: 'Dashboard',
    todaySales: "Today's Sales",
    totalEarned: 'Total Earned',
    currentBalance: 'Current Balance',
    activeItems: 'Active Items',
    withdraw: 'Withdraw',
    uploadStock: 'Upload Stock',
    myProducts: 'My Products',
    bulkUpload: 'Bulk Upload',
    apiKeys: 'API Keys',
    reputationScore: 'Reputation Score',
    
    // Admin
    totalUsers: 'Total Users',
    totalProducts: 'Total Products',
    totalRevenue: 'Total Revenue',
    openTickets: 'Open Tickets',
    platformCommission: 'Platform Commission',
    minWithdrawal: 'Min Withdrawal',
    siteAnnouncement: 'Site Announcement',
    
    // Currency
    usd: 'USD',
    rub: 'RUB',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    back: 'Back',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Deposit/Withdraw
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    cryptoAddress: 'Crypto Address',
    amount: 'Amount',
    confirm: 'Confirm',
    depositInfo: 'Send crypto to the address below',
    withdrawalInfo: 'Enter your wallet address',
    
    // Auth
    email: 'Email',
    password: 'Password',
    register: 'Register',
    loginAsBuyer: 'Login as Buyer',
    loginAsSeller: 'Login as Seller',
    loginAsAdmin: 'Login as Admin',
    demoAccounts: 'Demo Accounts',
    allCategories: 'All Categories',
  },
  ru: {
    // Header
    marketplace: 'Маркетплейс',
    myOrders: 'Мои заказы',
    sellerDashboard: 'Панель продавца',
    adminPanel: 'Панель администратора',
    login: 'Вход',
    logout: 'Выход',
    search: 'Поиск товаров...',
    cart: 'Корзина',
    
    // Hero
    heroTitle: 'Маркетплейс цифровых товаров',
    heroSubtitle: 'Покупайте и продавайте verified аккаунты безопасно. 50+ категорий, мгновенная доставка, поддержка 24/7.',
    startBuying: 'Начать покупать',
    startSelling: 'Начать продавать',
    
    // Categories
    categories: 'Категории',
    allProducts: 'Все товары',
    socialMedia: 'Социальные сети',
    emailServices: 'Email сервисы',
    streaming: 'Стриминг',
    vpnProxy: 'VPN и Прокси',
    aiBots: 'AI Боты',
    gaming: 'Игры',
    
    // Product Table
    product: 'Товар',
    supplier: 'Поставщик',
    reputation: 'Репутация',
    stock: 'Наличие',
    price: 'Цена',
    addToCart: 'В корзину',
    
    // Cart
    shoppingCart: 'Корзина',
    emptyCart: 'Ваша корзина пуста',
    subtotal: 'Подытог',
    platformFee: 'Комиссия платформы (10%)',
    total: 'Итого',
    checkout: 'Оформить',
    clearCart: 'Очистить',
    proceedToCheckout: 'Перейти к оформлению',
    
    // Checkout
    contactInfo: 'Контактная информация',
    emailAddress: 'Email адрес',
    paymentMethod: 'Способ оплаты',
    crypto: 'Криптовалюта',
    balance: 'Баланс аккаунта',
    termsTitle: 'Условия использования',
    videoRequired: 'Я согласен записывать экран для гарантии',
    agreeTerms: 'Я согласен с Условиями использования',
    completePurchase: 'Завершить покупку',
    orderConfirmed: 'Заказ подтвержден!',
    orderSuccess: 'Ваш заказ успешно размещен',
    orderPlacedSuccess: 'Заказ успешно размещен',
    orderError: 'Не удалось оформить заказ',
    loginRequired: 'Пожалуйста, войдите в систему',
    cartEmpty: 'Ваша корзина пуста',
    insufficientBalance: 'Недостаточно средств',
    
    // Seller
    dashboard: 'Панель',
    todaySales: 'Продажи сегодня',
    totalEarned: 'Всего заработано',
    currentBalance: 'Текущий баланс',
    activeItems: 'Активные товары',
    withdraw: 'Вывод',
    uploadStock: 'Загрузить',
    myProducts: 'Мои товары',
    bulkUpload: 'Массовая загрузка',
    apiKeys: 'API ключи',
    reputationScore: 'Рейтинг репутации',
    
    // Admin
    totalUsers: 'Всего пользователей',
    totalProducts: 'Всего товаров',
    totalRevenue: 'Общий доход',
    openTickets: 'Открытые тикеты',
    platformCommission: 'Комиссия платформы',
    minWithdrawal: 'Мин. вывод',
    siteAnnouncement: 'Объявление на сайте',
    
    // Currency
    usd: 'USD',
    rub: 'RUB',
    
    // Common
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    create: 'Создать',
    back: 'Назад',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех',
    
    // Deposit/Withdraw
    deposit: 'Пополнение',
    withdrawal: 'Вывод',
    cryptoAddress: 'Крипто адрес',
    amount: 'Сумма',
    confirm: 'Подтвердить',
    depositInfo: 'Отправьте криптовалюту на адрес ниже',
    withdrawalInfo: 'Введите адрес вашего кошелька',
    
    // Auth
    email: 'Email',
    password: 'Пароль',
    register: 'Регистрация',
    loginAsBuyer: 'Вход как покупатель',
    loginAsSeller: 'Вход как продавец',
    loginAsAdmin: 'Вход как админ',
    demoAccounts: 'Демо аккаунты',
    allCategories: 'Все категории',
  },
  zh: {
    // Header
    marketplace: '市场',
    myOrders: '我的订单',
    sellerDashboard: '卖家面板',
    adminPanel: '管理面板',
    login: '登录',
    logout: '退出',
    search: '搜索产品...',
    cart: '购物车',
    
    // Hero
    heroTitle: '数字商品市场',
    heroSubtitle: '安全买卖验证账户。50+类别，即时交付，24/7支持。',
    startBuying: '开始购买',
    startSelling: '开始销售',
    
    // Categories
    categories: '类别',
    allProducts: '所有产品',
    socialMedia: '社交媒体',
    emailServices: '电子邮件服务',
    streaming: '流媒体',
    vpnProxy: 'VPN和代理',
    aiBots: 'AI机器人',
    gaming: '游戏',
    
    // Product Table
    product: '产品',
    supplier: '供应商',
    reputation: '信誉',
    stock: '库存',
    price: '价格',
    addToCart: '加入购物车',
    
    // Cart
    shoppingCart: '购物车',
    emptyCart: '您的购物车是空的',
    subtotal: '小计',
    platformFee: '平台费 (10%)',
    total: '总计',
    checkout: '结账',
    clearCart: '清空',
    proceedToCheckout: '前往结账',
    
    // Checkout
    contactInfo: '联系信息',
    emailAddress: '电子邮件地址',
    paymentMethod: '支付方式',
    crypto: '加密货币',
    balance: '账户余额',
    termsTitle: '条款和条件',
    videoRequired: '我同意录屏以获得保修',
    agreeTerms: '我同意服务条款',
    completePurchase: '完成购买',
    orderConfirmed: '订单已确认！',
    orderSuccess: '您的订单已成功下单',
    orderPlacedSuccess: '订单已成功提交',
    orderError: '下单失败',
    loginRequired: '请先登录',
    cartEmpty: '您的购物车为空',
    insufficientBalance: '余额不足',
    
    // Seller
    dashboard: '面板',
    todaySales: '今日销售',
    totalEarned: '总收入',
    currentBalance: '当前余额',
    activeItems: '活跃商品',
    withdraw: '提现',
    uploadStock: '上传库存',
    myProducts: '我的产品',
    bulkUpload: '批量上传',
    apiKeys: 'API密钥',
    reputationScore: '信誉评分',
    
    // Admin
    totalUsers: '总用户数',
    totalProducts: '总产品数',
    totalRevenue: '总收入',
    openTickets: '待处理工单',
    platformCommission: '平台佣金',
    minWithdrawal: '最低提现',
    siteAnnouncement: '网站公告',
    
    // Currency
    usd: '美元',
    rub: '卢布',
    
    // Common
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    back: '返回',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    
    // Deposit/Withdraw
    deposit: '充值',
    withdrawal: '提现',
    cryptoAddress: '加密货币地址',
    amount: '金额',
    confirm: '确认',
    depositInfo: '将加密货币发送到以下地址',
    withdrawalInfo: '输入您的钱包地址',
    
    // Auth
    email: '电子邮件',
    password: '密码',
    register: '注册',
    loginAsBuyer: '以买家身份登录',
    loginAsSeller: '以卖家身份登录',
    loginAsAdmin: '以管理员身份登录',
    demoAccounts: '演示账户',
    allCategories: '所有类别',
  },
};

export function t(key: string, lang: Language): string {
  const keys = key.split('.');
  let value: unknown = translations[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export function formatPriceRub(price: number, _lang?: Language): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatPriceUsd(price: number, _lang?: Language): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

// Exchange rate: 1 USD = 92 RUB
export const USD_TO_RUB = 92;

export function usdToRub(usd: number): number {
  return Math.round(usd * USD_TO_RUB);
}

export function rubToUsd(rub: number): number {
  return rub / USD_TO_RUB;
}

export function formatDate(date: Date, lang: Language): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return d.toLocaleDateString(locale, options);
}

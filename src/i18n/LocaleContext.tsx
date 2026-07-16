import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LocaleCode = "en" | "zh-CN" | "zh-TW" | "ru" | "vi";
export type CurrencyCode = "USD" | "CNY" | "TWD" | "RUB" | "VND" | "PKR";

export const languages: Array<{ code: LocaleCode; label: string; native: string; flag: string }> = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "zh-CN", label: "Simplified Chinese", native: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "Traditional Chinese", native: "繁體中文", flag: "🇹🇼" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
];

export const currencies: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "TWD", label: "Taiwan Dollar", symbol: "NT$" },
  { code: "RUB", label: "Russian Ruble", symbol: "₽" },
  { code: "VND", label: "Vietnamese Dong", symbol: "₫" },
  { code: "PKR", label: "Pakistani Rupee", symbol: "Rs" },
];

const copy: Record<LocaleCode, Record<string, string>> = {
  en: {
    explore: "Explore", protection: "Buyer protection", support: "Support", cart: "Cart", account: "My account", signIn: "Sign in", register: "Register", signOut: "Sign out", dashboard: "Dashboard",
    categories: "Categories", products: "Products", topSellers: "Top sellers", blog: "Blog", releases: "New releases", notes: "Field notes", sell: "Sell with us", sellOn: "Sell on HSello", search: "Search products, sellers and categories…",
    browse: "Browse, filter, and buy.", allCategories: "All categories", inStock: "Show in-stock products only", viewAll: "View all", purchase: "Purchase", details: "View details",
    adminChat: "Chat with admin", aiSupport: "AI support", adminOnline: "Human admins available", language: "Language", currency: "Currency", save: "Apply preferences",
    homeEyebrow: "DIGITAL PRODUCTS · VERIFIED EXPERTS", homeTitleA: "Buy digital products.", homeTitleB: "Hire trusted experts.", homeIntro: "Compare clear listings from reviewed sellers, then purchase downloads or expert services with protected checkout, delivery records, and human support.", homeSearch: "Search products, services, or sellers", searchMarketplace: "Search marketplace", shopByCategory: "Shop by category", popularNow: "Popular right now", newArrivals: "New arrivals", menu: "Menu", close: "Close"
  },
  "zh-CN": {
    explore: "探索", protection: "买家保障", support: "支持", cart: "购物车", account: "我的账户", signIn: "登录", register: "注册", signOut: "退出登录", dashboard: "控制面板",
    categories: "分类", products: "产品", topSellers: "优质卖家", blog: "博客", releases: "新品", notes: "指南", sell: "成为卖家", sellOn: "在 HSello 销售", search: "搜索产品、卖家和分类…",
    browse: "浏览、筛选并购买。", allCategories: "全部分类", inStock: "仅显示有库存产品", viewAll: "查看全部", purchase: "购买", details: "查看详情",
    adminChat: "联系管理员", aiSupport: "AI 支持", adminOnline: "人工管理员在线", language: "语言", currency: "货币", save: "应用设置",
    homeEyebrow: "高品质数字商品市场", homeTitleA: "数字所需，", homeTitleB: "尽在可信平台。", homeIntro: "发现来自认证卖家的优质数字产品、工具和服务，从结账到交付全程受保护。", homeSearch: "您在寻找什么？", searchMarketplace: "搜索市场", shopByCategory: "按分类选购", popularNow: "当前热门", newArrivals: "最新上架", menu: "菜单", close: "关闭"
  },
  "zh-TW": {
    explore: "探索", protection: "買家保障", support: "支援", cart: "購物車", account: "我的帳戶", signIn: "登入", register: "註冊", signOut: "登出", dashboard: "控制台",
    categories: "分類", products: "產品", topSellers: "優質賣家", blog: "部落格", releases: "新品", notes: "指南", sell: "成為賣家", sellOn: "在 HSello 銷售", search: "搜尋產品、賣家和分類…",
    browse: "瀏覽、篩選並購買。", allCategories: "所有分類", inStock: "只顯示有庫存產品", viewAll: "查看全部", purchase: "購買", details: "查看詳情",
    adminChat: "聯絡管理員", aiSupport: "AI 支援", adminOnline: "人工管理員在線", language: "語言", currency: "貨幣", save: "套用設定",
    homeEyebrow: "高品質數位商品市場", homeTitleA: "所有數位需求，", homeTitleB: "一個可信平台。", homeIntro: "探索認證賣家的優質數位產品、工具和服務，從結帳到交付全程受保護。", homeSearch: "您正在尋找什麼？", searchMarketplace: "搜尋市場", shopByCategory: "依分類選購", popularNow: "熱門商品", newArrivals: "最新上架", menu: "選單", close: "關閉"
  },
  ru: {
    explore: "Каталог", protection: "Защита покупателя", support: "Поддержка", cart: "Корзина", account: "Мой аккаунт", signIn: "Войти", register: "Регистрация", signOut: "Выйти", dashboard: "Панель",
    categories: "Категории", products: "Товары", topSellers: "Лучшие продавцы", blog: "Блог", releases: "Новинки", notes: "Гайды", sell: "Стать продавцом", sellOn: "Продавать на HSello", search: "Поиск товаров, продавцов и категорий…",
    browse: "Ищите, фильтруйте и покупайте.", allCategories: "Все категории", inStock: "Только товары в наличии", viewAll: "Показать все", purchase: "Купить", details: "Подробнее",
    adminChat: "Чат с администратором", aiSupport: "AI-помощник", adminOnline: "Администраторы онлайн", language: "Язык", currency: "Валюта", save: "Применить",
    homeEyebrow: "ПРЕМИАЛЬНЫЙ ЦИФРОВОЙ МАРКЕТПЛЕЙС", homeTitleA: "Всё цифровое.", homeTitleB: "В одном надёжном месте.", homeIntro: "Откройте качественные цифровые товары, инструменты и услуги проверенных продавцов с защитой от оплаты до доставки.", homeSearch: "Что вы ищете?", searchMarketplace: "Найти", shopByCategory: "Покупки по категориям", popularNow: "Сейчас популярно", newArrivals: "Новинки", menu: "Меню", close: "Закрыть"
  },
  vi: {
    explore: "Khám phá", protection: "Bảo vệ người mua", support: "Hỗ trợ", cart: "Giỏ hàng", account: "Tài khoản", signIn: "Đăng nhập", register: "Đăng ký", signOut: "Đăng xuất", dashboard: "Bảng điều khiển",
    categories: "Danh mục", products: "Sản phẩm", topSellers: "Người bán hàng đầu", blog: "Blog", releases: "Sản phẩm mới", notes: "Hướng dẫn", sell: "Trở thành người bán", sellOn: "Bán trên HSello", search: "Tìm sản phẩm, người bán và danh mục…",
    browse: "Duyệt, lọc và mua.", allCategories: "Tất cả danh mục", inStock: "Chỉ hiện sản phẩm còn hàng", viewAll: "Xem tất cả", purchase: "Mua", details: "Xem chi tiết",
    adminChat: "Chat với quản trị viên", aiSupport: "Hỗ trợ AI", adminOnline: "Quản trị viên đang trực tuyến", language: "Ngôn ngữ", currency: "Tiền tệ", save: "Áp dụng",
    homeEyebrow: "CHỢ KỸ THUẬT SỐ CAO CẤP", homeTitleA: "Mọi thứ kỹ thuật số.", homeTitleB: "Một nơi đáng tin cậy.", homeIntro: "Khám phá sản phẩm, công cụ và dịch vụ kỹ thuật số chất lượng từ người bán đã xác minh, được bảo vệ từ thanh toán đến giao hàng.", homeSearch: "Bạn đang tìm gì?", searchMarketplace: "Tìm kiếm", shopByCategory: "Mua theo danh mục", popularNow: "Đang phổ biến", newArrivals: "Mới ra mắt", menu: "Menu", close: "Đóng"
  }
};

const usdRates: Record<CurrencyCode, number> = { USD: 1, CNY: 7.24, TWD: 32.6, RUB: 91.5, VND: 25400, PKR: 279.5 };
const validLocales = new Set<LocaleCode>(languages.map((item) => item.code));
const validCurrencies = new Set<CurrencyCode>(currencies.map((item) => item.code));

type LocaleValue = {
  locale: LocaleCode;
  currency: CurrencyCode;
  setLocale: (locale: LocaleCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: string) => string;
  formatMoney: (usdCents: number) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

function storedLocale(): LocaleCode {
  const value = localStorage.getItem("hsello-locale") as LocaleCode | null;
  return value && validLocales.has(value) ? value : "en";
}

function storedCurrency(): CurrencyCode {
  const value = localStorage.getItem("hsello-currency") as CurrencyCode | null;
  return value && validCurrencies.has(value) ? value : "USD";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(storedLocale);
  const [currency, setCurrencyState] = useState<CurrencyCode>(storedCurrency);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
    localStorage.setItem("hsello-locale", locale);
  }, [locale]);
  useEffect(() => { localStorage.setItem("hsello-currency", currency); }, [currency]);

  const value = useMemo<LocaleValue>(() => ({
    locale,
    currency,
    // Language and currency are intentionally independent preferences.
    setLocale: setLocaleState,
    setCurrency: setCurrencyState,
    t(key) { return copy[locale][key] ?? copy.en[key] ?? key; },
    formatMoney(usdCents) {
      const converted = (usdCents / 100) * usdRates[currency];
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2
      }).format(converted);
    }
  }), [currency, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

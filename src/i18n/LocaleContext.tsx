import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LocaleCode = "en" | "zh-CN" | "zh-TW" | "ru" | "vi";
export type CurrencyCode = "USD" | "CNY" | "TWD" | "RUB" | "VND";

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
];

const copy: Record<LocaleCode, Record<string, string>> = {
  en: {
    explore: "Explore", protection: "Buyer protection", support: "Support", cart: "Cart", account: "My account", signIn: "Sign in",
    categories: "Categories", releases: "New releases", notes: "Field notes", sell: "Sell with us", search: "Search products, sellers and categories…",
    browse: "Browse, filter, and buy.", allCategories: "All categories", inStock: "Show in-stock products only", viewAll: "View all", purchase: "Purchase", details: "View details",
    adminChat: "Chat with admin", aiSupport: "AI support", adminOnline: "Human admins available", language: "Language", currency: "Currency", save: "Apply preferences"
  },
  "zh-CN": {
    explore: "探索", protection: "买家保障", support: "支持", cart: "购物车", account: "我的账户", signIn: "登录",
    categories: "分类", releases: "新品", notes: "指南", sell: "成为卖家", search: "搜索产品、卖家和分类…",
    browse: "浏览、筛选并购买。", allCategories: "全部分类", inStock: "仅显示有库存产品", viewAll: "查看全部", purchase: "购买", details: "查看详情",
    adminChat: "联系管理员", aiSupport: "AI 支持", adminOnline: "人工管理员在线", language: "语言", currency: "货币", save: "应用设置"
  },
  "zh-TW": {
    explore: "探索", protection: "買家保障", support: "支援", cart: "購物車", account: "我的帳戶", signIn: "登入",
    categories: "分類", releases: "新品", notes: "指南", sell: "成為賣家", search: "搜尋產品、賣家和分類…",
    browse: "瀏覽、篩選並購買。", allCategories: "所有分類", inStock: "只顯示有庫存產品", viewAll: "查看全部", purchase: "購買", details: "查看詳情",
    adminChat: "聯絡管理員", aiSupport: "AI 支援", adminOnline: "人工管理員在線", language: "語言", currency: "貨幣", save: "套用設定"
  },
  ru: {
    explore: "Каталог", protection: "Защита покупателя", support: "Поддержка", cart: "Корзина", account: "Мой аккаунт", signIn: "Войти",
    categories: "Категории", releases: "Новинки", notes: "Гайды", sell: "Стать продавцом", search: "Поиск товаров, продавцов и категорий…",
    browse: "Ищите, фильтруйте и покупайте.", allCategories: "Все категории", inStock: "Только товары в наличии", viewAll: "Показать все", purchase: "Купить", details: "Подробнее",
    adminChat: "Чат с администратором", aiSupport: "AI-помощник", adminOnline: "Администраторы онлайн", language: "Язык", currency: "Валюта", save: "Применить"
  },
  vi: {
    explore: "Khám phá", protection: "Bảo vệ người mua", support: "Hỗ trợ", cart: "Giỏ hàng", account: "Tài khoản", signIn: "Đăng nhập",
    categories: "Danh mục", releases: "Sản phẩm mới", notes: "Hướng dẫn", sell: "Trở thành người bán", search: "Tìm sản phẩm, người bán và danh mục…",
    browse: "Duyệt, lọc và mua.", allCategories: "Tất cả danh mục", inStock: "Chỉ hiện sản phẩm còn hàng", viewAll: "Xem tất cả", purchase: "Mua", details: "Xem chi tiết",
    adminChat: "Chat với quản trị viên", aiSupport: "Hỗ trợ AI", adminOnline: "Quản trị viên đang trực tuyến", language: "Ngôn ngữ", currency: "Tiền tệ", save: "Áp dụng"
  }
};

const currencyByLocale: Record<LocaleCode, CurrencyCode> = { en: "USD", "zh-CN": "CNY", "zh-TW": "TWD", ru: "RUB", vi: "VND" };
const usdRates: Record<CurrencyCode, number> = { USD: 1, CNY: 7.24, TWD: 32.6, RUB: 91.5, VND: 25400 };

type LocaleValue = {
  locale: LocaleCode;
  currency: CurrencyCode;
  setLocale: (locale: LocaleCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: string) => string;
  formatMoney: (usdCents: number) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => (localStorage.getItem("hsello-locale") as LocaleCode) || "en");
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => (localStorage.getItem("hsello-currency") as CurrencyCode) || "USD");

  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = "ltr"; localStorage.setItem("hsello-locale", locale); }, [locale]);
  useEffect(() => { localStorage.setItem("hsello-currency", currency); }, [currency]);

  const value = useMemo<LocaleValue>(() => ({
    locale,
    currency,
    setLocale(next) { setLocaleState(next); setCurrencyState(currencyByLocale[next]); },
    setCurrency: setCurrencyState,
    t(key) { return copy[locale][key] ?? copy.en[key] ?? key; },
    formatMoney(usdCents) {
      const converted = (usdCents / 100) * usdRates[currency];
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(converted);
    }
  }), [currency, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

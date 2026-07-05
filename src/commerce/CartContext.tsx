import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogProduct } from "../data/catalog";

export type CartItem = { product: CatalogProduct; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  add: (product: CatalogProduct) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const storageKey = "hsello-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CartItem[]; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)); }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0),
    add(product) {
      setItems((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        return existing
          ? current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item)
          : [...current, { product, quantity: 1 }];
      });
    },
    remove(productId) { setItems((current) => current.filter((item) => item.product.id !== productId)); },
    setQuantity(productId, quantity) {
      setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) } : item));
    },
    clear() { setItems([]); }
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

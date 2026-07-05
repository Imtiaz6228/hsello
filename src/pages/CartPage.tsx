import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

export function CartPage() {
  const { items, subtotalCents, remove, setQuantity } = useCart();
  return (
    <main className="commerce-page">
      <Seo title="Your cart" description="Review your HSello digital products and continue to secure checkout." />
      <MarketHeader />
      <section className="simple-hero"><span className="section-index">YOUR CART</span><h1>Ready when you are.</h1><p>Review products, delivery types, and quantities before checkout.</p></section>
      {items.length === 0 ? (
        <section className="empty-cart"><ShoppingBag /><h2>Your cart is quiet.</h2><p>Original digital goods and expert services are waiting in the catalog.</p><Link className="primary-link" to="/catalog">Browse marketplace <ArrowRight /></Link></section>
      ) : (
        <section className="cart-layout">
          <div className="cart-items">
            {items.map(({ product, quantity }) => (
              <article key={product.id}>
                <div className="cart-thumb">{product.icon}</div>
                <div><span>{product.category}</span><Link to={`/products/${product.slug}`}>{product.title}</Link><small>{product.delivery} · {product.seller}</small></div>
                <div className="quantity-control"><button onClick={() => setQuantity(product.id, quantity - 1)}><Minus /></button><span>{quantity}</span><button onClick={() => setQuantity(product.id, quantity + 1)}><Plus /></button></div>
                <strong>${(product.priceCents * quantity / 100).toFixed(2)}</strong>
                <button className="icon-button" onClick={() => remove(product.id)} aria-label={`Remove ${product.title}`}><Trash2 /></button>
              </article>
            ))}
          </div>
          <aside className="order-summary"><span className="section-index">ORDER SUMMARY</span><div><span>Subtotal</span><strong>${(subtotalCents / 100).toFixed(2)}</strong></div><div><span>Delivery</span><strong>Digital · $0</strong></div><div className="summary-total"><span>Total</span><strong>${(subtotalCents / 100).toFixed(2)}</strong></div><Link className="checkout-button" to="/checkout">Secure checkout <ArrowRight /></Link><p><ShieldCheck /> Payments stay protected. Downloads release only after confirmation.</p></aside>
        </section>
      )}
      <MarketFooter />
    </main>
  );
}

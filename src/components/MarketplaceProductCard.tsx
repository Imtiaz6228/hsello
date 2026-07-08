import { Clock3, Eye, PackageCheck, ShoppingCart, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { CatalogProduct } from "../data/catalog";

type Props = {
  product: CatalogProduct;
  onBuy: (product: CatalogProduct) => void;
  layout?: "grid" | "list";
};

export function MarketplaceProductCard({ product, onBuy, layout = "grid" }: Props) {
  const cny = (product.priceCnyCents ?? 0) > 0 ? `¥${((product.priceCnyCents ?? 0) / 100).toFixed(2)}` : null;
  const stockLabel = product.type === "SERVICE"
    ? "Service slot"
    : `${product.stockCount ?? 0} in stock`;

  return (
    <article className={`market-product-card ${layout === "list" ? "list" : ""}`}>
      <Link className="market-product-thumb" to={`/products/${product.slug}`} aria-label={product.title}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <b>{product.icon}</b>}
        <span className="badge green">{product.badge}</span>
        {product.sales !== "0" ? <span className="badge amber">Sold {product.sales}</span> : null}
      </Link>
      <div className="market-product-body">
        <div className="market-product-title-row">
          <div>
            <Link className="market-product-category" to={`/categories/${product.categorySlug}`}>{product.category}</Link>
            <Link to={`/products/${product.slug}`}><h2>{product.title}</h2></Link>
          </div>
          <button className="heart-button" type="button" aria-label="Save product">♡</button>
        </div>
        <p>{product.description}</p>
        <div className="market-product-meta">
          <span><Clock3 /> {product.afterSalesServiceHours ?? 12} hours</span>
          <span><PackageCheck /> {stockLabel}</span>
          <span><Star fill="currentColor" /> {product.rating || "New"} <small>({product.reviews})</small></span>
          <span><Zap /> Auto</span>
        </div>
        <footer>
          <div>
            <strong>${(product.priceCents / 100).toFixed(2)}</strong>
            {cny ? <small>{cny} CNY</small> : null}
          </div>
          <div className="market-card-actions">
            <Link to={`/products/${product.slug}`}><Eye /> View Details</Link>
            <button type="button" onClick={() => onBuy(product)}><ShoppingCart /> Purchase</button>
          </div>
        </footer>
      </div>
    </article>
  );
}

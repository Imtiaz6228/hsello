import {
  BadgeCheck,
  Clock3,
  Eye,
  PackageCheck,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";
import { useState } from "react";

type Props = {
  product: CatalogProduct;
  onBuy: (product: CatalogProduct) => void;
  layout?: "grid" | "list";
};

export function MarketplaceProductCard({
  product,
  onBuy,
  layout = "grid",
}: Props) {
  const { formatMoney, t } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);
  const stockLabel =
    product.type === "SERVICE"
      ? "Service slot"
      : `${product.stockCount ?? 0} in stock`;

  return (
    <article
      className={`market-product-card ${layout === "list" ? "list" : ""}`}
    >
      <Link
        className="market-product-thumb"
        to={`/products/${product.slug}`}
        aria-label={product.title}
      >
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={`${product.title} product preview`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <b>{product.icon}</b>
        )}
        <span className="badge green">{product.badge}</span>
        {product.sales !== "0" ? (
          <span className="badge amber">Sold {product.sales}</span>
        ) : null}
      </Link>
      <div className="market-product-body">
        <div className="market-product-title-row">
          <div>
            <Link
              className="market-product-category"
              to={`/categories/${product.categorySlug}`}
            >
              {product.category}
            </Link>
            <Link to={`/products/${product.slug}`}>
              <h2>{product.title}</h2>
            </Link>
            <Link
              className="market-product-seller"
              to={`/stores/${product.sellerSlug}`}
            >
              {product.seller} <BadgeCheck aria-hidden="true" />
            </Link>
          </div>
        </div>
        <p>{product.description}</p>
        <div className="market-product-meta">
          <span>
            <Clock3 /> {product.afterSalesServiceHours ?? 12} hours
          </span>
          <span>
            <PackageCheck /> {stockLabel}
          </span>
          <span>
            <Star fill="currentColor" /> {product.rating || "New"}{" "}
            <small>({product.reviews})</small>
          </span>
          <span>
            <Zap /> Auto
          </span>
        </div>
        <footer>
          <div>
            <strong>{formatMoney(product.priceCents)}</strong>
            <small>Secure marketplace checkout</small>
          </div>
          <div className="market-card-actions">
            <Link to={`/products/${product.slug}`}>
              <Eye /> {t("details")}
            </Link>
            <button type="button" onClick={() => onBuy(product)}>
              <ShoppingCart /> {t("purchase")}
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

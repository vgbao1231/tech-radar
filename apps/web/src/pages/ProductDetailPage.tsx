import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { categoryLabel, formatDate, formatPrice, stockLabel } from "../lib/format.js";
import type { ProductDetail } from "../lib/types.js";
import { PriceSparkline } from "../components/PriceSparkline.js";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .product(id)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="alert">{error}</p>;
  if (!data) return <p className="muted">Đang tải…</p>;

  const { product, listings } = data;
  const prices = listings
    .map((listing) => listing.price)
    .filter((price): price is number => price !== null && Number.isFinite(price));
  const bestPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <section>
      <Link to="/" className="back">
        ← Về danh sách
      </Link>

      <header className="detail-header">
        <div>
          <span className="badge">{categoryLabel(product.category)}</span>
          {product.brand && <span className="badge badge--muted">{product.brand}</span>}
          <h1>{product.name}</h1>
          <p className="muted">
            {listings.length} cửa hàng đang theo dõi · {product.model ?? "chưa rõ model"}
          </p>
        </div>
        <div className="detail-best">
          <small>Giá tốt nhất</small>
          <strong>{formatPrice(bestPrice)}</strong>
        </div>
      </header>

      <div className="listing-grid">
        {listings.map((listing) => (
          <article key={listing.id} className="card">
            <div className="card__top">
              <span className="badge">{listing.sourceName}</span>
              <span className={`badge ${listing.stockStatus === "InStock" ? "badge--ok" : "badge--warn"}`}>
                {stockLabel(listing.stockStatus)}
              </span>
            </div>
            <p className="card__price">{formatPrice(listing.price)}</p>
            {listing.priceOriginal !== null && listing.priceOriginal > (listing.price ?? 0) && (
              <p className="muted small">
                Giá gốc: <s>{formatPrice(listing.priceOriginal)}</s>
              </p>
            )}
            <PriceSparkline points={listing.history} />
            <p className="muted small">Cập nhật: {formatDate(listing.lastSeenAt)}</p>
            <a className="btn btn--ghost" href={listing.url} target="_blank" rel="noopener noreferrer">
              Xem tại cửa hàng ↗
            </a>
          </article>
        ))}
      </div>

      {Object.keys(product.specs ?? {}).length > 0 && (
        <section className="panel">
          <h2>Thông số</h2>
          <dl className="spec-list">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}

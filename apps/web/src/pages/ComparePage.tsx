import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { categoryLabel, formatPrice } from "../lib/format.js";
import type { CompareProduct } from "../lib/types.js";

export function ComparePage() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [specKeys, setSpecKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    api
      .compare(ids)
      .then((response) => {
        if (cancelled) return;
        setProducts(response.products);
        setSpecKeys(response.specKeys);
        setError(null);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (ids.length === 0) {
    return (
      <section>
        <h1>So sánh sản phẩm</h1>
        <p className="empty">
          Chưa chọn sản phẩm nào. <Link to="/">Quay lại danh sách</Link> và chọn tối đa 3 sản phẩm.
        </p>
      </section>
    );
  }

  if (error) return <p className="alert">{error}</p>;

  return (
    <section>
      <Link to="/" className="back">
        ← Về danh sách
      </Link>
      <h1>So sánh sản phẩm</h1>

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              {products.map((product) => (
                <th key={product.id}>
                  <Link to={`/products/${product.id}`}>{product.name}</Link>
                  <div className="muted small">{product.brand ?? "—"}</div>
                  <div className="badge badge--muted">{categoryLabel(product.category)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Giá tốt nhất</th>
              {products.map((product) => {
                const prices = product.offers.map((offer) => offer.price).filter((price): price is number => price !== null);
                return <td key={product.id}>{prices.length > 0 ? formatPrice(Math.min(...prices)) : "Liên hệ"}</td>;
              })}
            </tr>
            <tr>
              <th>Cửa hàng</th>
              {products.map((product) => (
                <td key={product.id}>
                  <ul className="offer-list">
                    {product.offers.map((offer) => (
                      <li key={`${product.id}-${offer.source}`}>
                        <a href={offer.url} target="_blank" rel="noopener noreferrer">
                          {offer.sourceName}
                        </a>{" "}
                        — {formatPrice(offer.price)}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            {specKeys.map((key) => (
              <tr key={key}>
                <th>{key}</th>
                {products.map((product) => (
                  <td key={product.id}>{product.specs?.[key] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

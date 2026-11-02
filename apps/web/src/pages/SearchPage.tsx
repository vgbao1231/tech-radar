import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { categoryLabel, formatPrice } from "../lib/format.js";
import type { ProductSummary } from "../lib/types.js";

const MAX_COMPARE = 3;

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [crawling, setCrawling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .products({ q: query.trim() || undefined, category: category || undefined })
        .then((response) => {
          if (cancelled) return;
          setItems(response.items);
          setTotal(response.total);
          setError(null);
        })
        .catch((cause: Error) => {
          if (!cancelled) setError(cause.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, category]);

  const crawlAll = async () => {
    setCrawling(true);
    try {
      await api.triggerRun("all");
      // reload
      const response = await api.products({ q: query.trim() || undefined, category: category || undefined });
      setItems(response.items);
      setTotal(response.total);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCrawling(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current.length >= MAX_COMPARE ? current : [...current, id],
    );
  };

  return (
    <section>
      <div className="hero">
        <h1>Theo dõi giá gear gaming</h1>
        <p>Giá từ nhiều cửa hàng được giữ riêng biệt, kèm lịch sử thay đổi. Không trộn giá giữa các nơi.</p>
      </div>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          placeholder="Tìm theo tên, hãng, model…"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Tìm sản phẩm"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Danh mục">
          <option value="">Tất cả danh mục</option>
          <option value="mechanical_keyboard">Bàn phím cơ</option>
          <option value="gaming_mouse">Chuột gaming</option>
        </select>
        <span className="muted">{loading ? "Đang tải…" : `${total} sản phẩm`}</span>
        <button type="button" className="btn btn--primary" disabled={crawling} onClick={crawlAll}>
          {crawling ? "Đang thu thập…" : "Thu thập tất cả"}
        </button>
      </div>

      {error && <p className="alert">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="empty">Chưa có sản phẩm. Hãy chạy worker để thu thập dữ liệu (xem README).</p>
      )}

      <div className="grid">
        {items.map((product) => {
          const isSelected = selected.includes(product.id);
          return (
            <article key={product.id} className={`card ${isSelected ? "card--selected" : ""}`}>
              <div className="card__top">
                <span className="badge">{categoryLabel(product.category)}</span>
                {product.brand && <span className="badge badge--muted">{product.brand}</span>}
              </div>
              {product.imageUrl && <img className="card__image" src={product.imageUrl} alt={product.name} loading="lazy" />}
              <Link to={`/products/${product.id}`} className="card__title">
                {product.name}
              </Link>
              <p className="card__price">{formatPrice(product.bestPrice)}</p>
              {Object.keys(product.specs ?? {}).length > 0 && (
                <p className="muted small">
                  {Object.entries(product.specs).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                </p>
              )}
              <p className="muted small">
                {product.listings.length} cửa hàng:
              </p>
              <ul className="source-links">
                {product.listings.map((listing) => (
                  <li key={listing.id}>
                    <a href={listing.url} target="_blank" rel="noopener noreferrer">
                      {listing.sourceName}
                    </a>
                    {listing.price !== null && <span> — {formatPrice(listing.price)}</span>}
                  </li>
                ))}
              </ul>
              <label className="check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isSelected && selected.length >= MAX_COMPARE}
                  onChange={() => toggle(product.id)}
                />
                Chọn để so sánh
              </label>
            </article>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="compare-bar">
          <span>Đã chọn {selected.length}/{MAX_COMPARE} sản phẩm</span>
          <div className="compare-bar__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setSelected([])}>
              Bỏ chọn
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate(`/compare?ids=${selected.join(",")}`)}
            >
              So sánh ngay
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDate, sourceStatusLabel } from "../lib/format.js";
import type { SourceInfo } from "../lib/types.js";

export function SourcesPage() {
  const [items, setItems] = useState<SourceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .sources()
      .then((response) => {
        if (!cancelled) setItems(response.items);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="alert">{error}</p>;

  return (
    <section>
      <h1>Nguồn dữ liệu</h1>
      <p className="muted">
        Trạng thái pháp lý/kỹ thuật của từng nguồn. Chỉ nguồn “Được phép dùng” mới được thu thập tự động.
      </p>

      <div className="source-list">
        {items.map((source) => (
          <article key={source.id} className="card">
            <div className="card__top">
              <strong>{source.name}</strong>
              <span
                className={`badge ${
                  source.status === "approved_for_use"
                    ? "badge--ok"
                    : source.status === "blocked"
                      ? "badge--warn"
                      : "badge--muted"
                }`}
              >
                {sourceStatusLabel(source.status)}
              </span>
            </div>
            <p className="small">
              <a href={source.baseUrl} target="_blank" rel="noopener noreferrer">
                {source.baseUrl}
              </a>
            </p>
            <p className="muted small">{source.notes}</p>
            <p className="small">
              {source.termsUrl && (
                <a href={source.termsUrl} target="_blank" rel="noopener noreferrer">
                  Điều khoản
                </a>
              )}
              {source.termsUrl && source.robotsUrl && " · "}
              {source.robotsUrl && (
                <a href={source.robotsUrl} target="_blank" rel="noopener noreferrer">
                  robots.txt
                </a>
              )}
            </p>
            <p className="muted small">Khảo sát: {formatDate(source.investigatedAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

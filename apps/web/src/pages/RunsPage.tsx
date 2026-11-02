import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import type { ScrapeRunInfo } from "../lib/types.js";

const STATUS_LABELS: Record<string, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  success: "Thành công",
  partial: "Một phần",
  failed: "Thất bại",
};

export function RunsPage() {
  const [items, setItems] = useState<ScrapeRunInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .runs({ q: q || undefined })
      .then((response) => {
        if (!cancelled) setItems(response.items);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (error) return <p className="alert">{error}</p>;

  return (
    <section>
      <h1>Lần chạy thu thập</h1>
      <p className="muted">Mỗi lần chạy ghi lại số listing tìm thấy, số mới, số cập nhật và lỗi (nếu có).</p>

      <div className="toolbar">
        <input placeholder="Tìm kiếm (nguồn/trạng thái/trigger)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {items.length === 0 ? (
        <p className="empty">Chưa có lần chạy nào.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Tìm thấy</th>
                <th>Mới</th>
                <th>Cập nhật</th>
                <th>Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((run) => (
                <tr key={run.id}>
                  <td>{run.source}</td>
                  <td>
                    <span className={`badge ${run.status === "success" ? "badge--ok" : run.status === "failed" ? "badge--warn" : "badge--muted"}`}>
                      {STATUS_LABELS[run.status] ?? run.status}
                    </span>
                  </td>
                  <td>{formatDate(run.startedAt)}</td>
                  <td>{formatDate(run.finishedAt)}</td>
                  <td>{run.listingsFound}</td>
                  <td>{run.listingsNew}</td>
                  <td>{run.listingsUpdated}</td>
                  <td>{Array.isArray(run.errors) ? run.errors.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

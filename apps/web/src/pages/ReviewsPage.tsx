import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import type { ReviewInfo } from "../lib/types.js";

export function ReviewsPage() {
  const [items, setItems] = useState<ReviewInfo[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .reviews(status)
      .then((response) => {
        if (!cancelled) setItems(response.items);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const decide = async (id: string, decision: "accept" | "reject") => {
    setBusy(id);
    try {
      await api.decideReview(id, decision);
      const response = await api.reviews(status);
      setItems(response.items);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <p className="alert">{error}</p>;

  return (
    <section>
      <h1>Hàng đợi review gom trùng</h1>
      <p className="muted">Các trường hợp không chắc chắn được đưa vào đây để bạn quyết định thủ công.</p>

      <div className="toolbar">
        <label>
          Trạng thái:
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="pending">Chờ xử lý</option>
            <option value="merged">Đã gộp</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="empty">Không có review nào.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ứng viên</th>
                <th>Phương pháp</th>
                <th>Độ tin cậy</th>
                <th>Lý do</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((review) => (
                <tr key={review.id}>
                  <td>{review.candidate_name ?? review.candidate_brand ?? "—"}</td>
                  <td>{review.method}</td>
                  <td>{review.confidence}</td>
                  <td>{review.reason ?? "—"}</td>
                  <td>{formatDate(review.created_at)}</td>
                  <td>
                    {review.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={busy === review.id}
                          onClick={() => decide(review.id, "accept")}
                        >
                          Gộp
                        </button>{" "}
                        <button
                          type="button"
                          className="btn"
                          disabled={busy === review.id}
                          onClick={() => decide(review.id, "reject")}
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <span className="badge badge--muted">{review.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { getToken, setToken } from "./lib/api.js";
import { SearchPage } from "./pages/SearchPage.js";
import { ProductDetailPage } from "./pages/ProductDetailPage.js";
import { ComparePage } from "./pages/ComparePage.js";
import { SourcesPage } from "./pages/SourcesPage.js";
import { RunsPage } from "./pages/RunsPage.js";

export function App() {
  const [showToken, setShowToken] = useState(false);
  const [token, setTokenState] = useState(getToken());

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to="/" className="brand">
            <span className="brand__mark">◎</span>
            <span>
              <strong>Tech Radar</strong>
              <small>So sánh giá gear gaming</small>
            </span>
          </NavLink>

          <nav className="nav">
            <NavLink to="/" end>
              Tìm kiếm
            </NavLink>
            <NavLink to="/compare">So sánh</NavLink>
            <NavLink to="/sources">Nguồn dữ liệu</NavLink>
            <NavLink to="/runs">Lần chạy</NavLink>
            <button type="button" className="btn btn--ghost" onClick={() => setShowToken((value) => !value)}>
              {token ? "Đã đặt token" : "Token"}
            </button>
          </nav>
        </div>

        {showToken && (
          <div className="token-bar">
            <label htmlFor="api-token">Token truy cập API (lưu trong trình duyệt):</label>
            <input
              id="api-token"
              type="password"
              value={token}
              placeholder="API_TOKEN"
              onChange={(event) => {
                setTokenState(event.target.value);
                setToken(event.target.value);
              }}
            />
            <span className="muted">Để trống nếu API chạy ở chế độ cá nhân không đặt token.</span>
          </div>
        )}
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="*" element={<p className="empty">Không tìm thấy trang.</p>} />
        </Routes>
      </main>

      <footer className="site-footer">
        <p>
          Dự án cá nhân, phi thương mại. Giá chỉ mang tính tham khảo, luôn kiểm tra lại tại cửa hàng trước khi mua.
        </p>
      </footer>
    </div>
  );
}

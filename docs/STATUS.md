# STATUS — Trạng thái dự án

> Cập nhật ngày: **2026-11-02**. Chỉ ghi **fact** (đã chạy/quan sát). Không ghi task chưa chạy là hoàn thành.

## Đã xác minh (fact)

### 1. Môi trường & Database
- **Môi trường:** Node v26.11.1, pnpm 12.14.0, Git 2.56.0 trên EndeavourOS (Arch rolling). Máy chưa cài daemon PostgreSQL hệ thống và không có Docker.
- **Database driver:** Hỗ trợ kép qua `@tech-radar/db`:
  - **PGlite** (PostgreSQL WASM chạy nhúng trong tiến trình Node): dùng cho môi trường dev local (`.data/pglite`) và toàn bộ test suite in-memory mà không cần cài daemon ngoài.
  - **pg (node-postgres)**: dùng cho PostgreSQL thật qua `DATABASE_URL` khi triển khai production/staging.
  - Cả hai driver dùng chung SQL migrations từ `drizzle-kit`.
- **Schema & Migration:** 7 bảng đúng chuẩn `docs/DATA_MODEL.md` (`sources`, `canonical_products`, `product_listings`, `price_history`, `dedupe_reviews`, `match_evidence`, `scrape_runs`). Đã generate và áp dụng migration `0000`, `0001` và `0002` (thêm `image_url` cho canonical + listing).
- **Seed:** Đã seed 3 nguồn (`gearvn`, `phongvu`, `cellphones`) với tính chất idempotent (upsert).

### 2. Thư viện Core & Adapter
- **`@tech-radar/core`:**
  - `parseVndPrice`: parse giá tiền Việt Nam ("9.590.000đ", "1,990,000 VND"), loại bỏ dấu phân cách hàng nghìn, định dạng số thập phân an toàn (không dùng float).
  - `normalizeText` & `normalizeBrand`: chuẩn hóa tiếng Việt, bỏ dấu diacritics, ánh xạ alias thương hiệu, Jaccard token similarity.
  - `hasPriceChanged`: so sánh snapshot giá/kho để đảm bảo tính chất **append-only** (chỉ ghi bản ghi mới vào `price_history` khi giá hoặc trạng thái kho thực sự đổi).
  - `compareCandidates` & `bestCandidate`: thuật toán phân tầng độ tin cậy (MPN/SKU match = high/auto-merge; brand+model = review; tên gần = review/no-match).
- **`@tech-radar/sources`:**
  - Adapter `gearvnAdapter` với interface chuẩn: `parseCategory` (20 card/trang từ HTML tĩnh) và `parseProduct` (trích xuất JSON-LD `Product`: tên, sku, brand, price, availability, specs).
  - Adapter `phongvuAdapter` (Phase 7): category page là Next.js nên đọc `__NEXT_DATA__` → `props.pageProps.serverProducts` (40 sản phẩm/trang); product page dùng JSON-LD `Product`. Biến thể cùng URL được gom thành một listing (chọn biến thể rẻ nhất còn hàng, giữ toàn bộ payload biến thể trong `raw_payload`). Chuẩn hóa Unicode NFC cho spec.
  - Helper dùng chung `jsonld.ts` (JSON-LD, `__NEXT_DATA__`, availability) cho các adapter.
  - `normalizeSourceUrl`: chuẩn hóa URL listing làm khóa duy nhất cùng với `source_id`.
  - Toàn bộ parser được test bằng fixtures đã lưu trong `tests/fixtures/sources/gearvn/` và `tests/fixtures/sources/phongvu/`, không phụ thuộc mạng.

### 3. Worker & Ingestion Pipeline
- **`@tech-radar/worker`:**
  - `PoliteFetcher`: tuân thủ độ trễ tối thiểu (>= 2s giữa các request cùng host), gửi User-Agent bot nhận diện rõ ràng, retry có backoff theo cấp số nhân cho 5xx/429, tôn trọng header `Retry-After`, không bypass CAPTCHA/bot.
  - `ingestListings`: upsert idempotent vào `product_listings` theo `(source_id, source_url)`; tự động ghi nhận vào `price_history` khi phát hiện thay đổi.
  - `linkListing`: gom listing vào `canonical_products` hoặc gửi vào `dedupe_reviews` kèm audit evidence (`match_evidence`).
  - Đã kiểm thử tích hợp toàn diện qua mock fixture server (offline): kiểm tra lần đầu tải đủ 40 listings, lần chạy sau idempotent không tạo trùng, cập nhật khi đổi giá, xử lý lỗi khi URL 404.
  - **Chạy thực tế (live run 2026-11-01):** Thu thập thử 2 danh mục bàn phím cơ và chuột gaming từ GEARVN (40 listing, 40 bản ghi lịch sử giá, 25 canonical tạo mới, 15 đề xuất review phân tầng, 0 lỗi).
  - **Chạy thực tế 2 nguồn (live run 2026-11-02):** `start -- --all --live` chạy GEARVN + Phong Vũ: GEARVN 40 listing / 25 canonical / 15 review; Phong Vũ 73 listing (35 bàn phím + 38 chuột sau khi gom biến thể) / 42 canonical / 31 review; tổng 113 listing, 113 canonical, 46 review, 0 auto-attach liên nguồn, 0 lỗi. Các đề xuất review liên nguồn (ví dụ Logitech G304 X) được đưa vào hàng đợi thay vì tự gộp — đúng thiết kế phân tầng.

### 4. API & Giao diện người dùng
- **`@tech-radar/api` (Fastify):**
  - REST API chạy trên cổng 3001 (hoặc `API_PORT`).
  - Hỗ trợ bảo mật token đơn giản cho cá nhân (`API_TOKEN` / header `Authorization: Bearer <token>`).
  - Endpoints đã hiện thực và có test kiểm thử:
    - `GET /api/health`
    - `GET /api/products` (tìm kiếm, lọc danh mục, gom listing theo canonical, tính giá tốt nhất, giữ độc lập từng cửa hàng)
    - `GET /api/products/:id` (chi tiết sản phẩm, danh sách các shop kèm lịch sử giá đầy đủ)
    - `GET /api/compare?ids=...` (so sánh đối chiếu thông số và giá giữa tối đa 5 model)
    - `GET /api/sources` (danh sách nguồn và trạng thái khảo sát)
    - `GET /api/runs` (nhật ký các chu kỳ thu thập; lọc theo `q` và `source`)
    - `GET /api/reviews` (hàng đợi review gom trùng)
    - `POST /api/reviews/:id/decision` (gộp/từ chối thủ công, có transaction audit)
    - `POST /api/runs/trigger` (kích hoạt thu thập cho một nguồn hoặc `all`; runner injectable cho test)
- **`@tech-radar/web` (React + Vite SPA):**
  - Toàn bộ giao diện bằng tiếng Việt, hỗ trợ theme sáng/tối.
  - Các trang: Tìm kiếm & lọc sản phẩm (kèm ảnh, link từng shop, nút thu thập), Chi tiết sản phẩm với biểu đồ SVG giá thu nhỏ (sparkline), So sánh 2–3 sản phẩm theo bảng thông số, Trang trạng thái các nguồn (nút chạy thu thập), Trang lịch sử các lần chạy (có tìm kiếm), Trang review gom trùng (gộp/từ chối), Thanh nhập token truy cập.
  - Build Vite ra thư mục `dist/` thành công (0 warning, 0 error).

### 5. Kết quả kiểm thử toàn diện
- **`pnpm test`:** 59/59 test cases đều **PASS** (100% offline với in-memory PGlite):
  - `@tech-radar/db`: 7 tests
  - `@tech-radar/core`: 18 tests
  - `@tech-radar/sources`: 17 tests (GEARVN 9 + Phong Vũ 8)
  - `@tech-radar/worker`: 15 tests
  - `@tech-radar/api`: 12 tests
- **`pnpm typecheck`:** 6/6 workspace packages biên dịch TypeScript strict không có lỗi nào.
- **`pnpm --filter @tech-radar/web build`:** Vite build thành công.

## Quyết định của người dùng (2026-11-01)
- Dự án phục vụ mục đích **cá nhân + portfolio**, hoàn toàn phi thương mại, không trục lợi.
- Duyệt triển khai đầy đủ các thành phần khả thi theo scope thiết kế.
- Nguồn **GEARVN** được duyệt đưa vào sử dụng (`approved_for_use`) cho mục đích nghiên cứu và theo dõi cá nhân với tần suất lịch sự.
- Nguồn **Phong Vũ** được duyệt (`approved_for_use`) với cùng điều kiện cá nhân, phi thương mại.

## Trạng thái nguồn hiện tại

| Nguồn | Trạng thái | Đánh giá |
|---|---|---|
| **GEARVN** | `approved_for_use` | Đã test kỹ thuật + adapter + fixture; chạy cá nhân lịch sự (>= 2s/req). |
| **Phong Vũ** | `approved_for_use` | Owner duyệt dùng cá nhân phi thương mại (ToS art. 14.2 chỉ hạn chế thương mại); POC 2026-11-02 + adapter + fixture. |
| **CellphoneS** | `investigated` | ToS tải động chưa đọc trích xuất được; cần duyệt thủ công trước khi viết adapter. |

## Bước tiếp theo (Next Steps)
1. Trải nghiệm thực tế: `pnpm dev:full` (migrate + seed + API + web), bấm "Chạy thu thập" trên trang Nguồn hoặc trang tìm kiếm.
2. Backlog (đọc duyệt sau):
   - Chạy live run định kỳ cho cả 2 nguồn để bắt đầu tích lũy lịch sử giá.
   - Chính sách lưu trữ/xóa lịch sử giá (retention) — owner đã tạm hoãn.
   - CellphoneS: đọc ToS thủ công trước khi quyết định.
   - Cải thiện dedupe quality trên fixture có nhãn; đo precision/recall.
   - Hardening, security, backup, deployment (Phase 8).

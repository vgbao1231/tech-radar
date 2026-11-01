# Tech Radar

Ứng dụng cá nhân tổng hợp và so sánh giá **tech gear** (chuột gaming, bàn phím cơ) từ các cửa hàng trực tuyến tại Việt Nam.

## Điểm nổi bật & Triết lý thiết kế

- **Gom đúng model (Canonical Product):** Tự động gom các listing cùng một sản phẩm từ các shop khác nhau vào một *canonical product*, nhưng **giữ độc lập hoàn toàn giá và trạng thái kho** của từng cửa hàng.
- **Deduplication phân tầng & minh bạch:**
  - Khớp tuyệt đối theo MPN hoặc SKU: tự động ghép (auto-merge), ghi lại bằng chứng đối soát (`match_evidence`).
  - Khớp tên/model có độ tương tự cao: tạo canonical riêng và gửi vào hàng đợi duyệt (`dedupe_reviews`), tuyệt đối không gom ẩu làm sai lệch dữ liệu.
- **Lịch sử giá Append-only:** Chỉ tạo bản ghi mới khi giá hoặc trạng thái còn/hết hàng thực sự thay đổi. Không ghi đè lịch sử cũ.
- **Thu thập lịch sự & Đạo đức:**
  - Tần suất tối thiểu giữa các request tới cùng một trang: >= 2 giây.
  - Gửi `User-Agent` bot mô tả rõ mục đích phi thương mại.
  - Tự động backoff khi gặp mã 429 hoặc lỗi 5xx tạm thời.
  - Tuyệt đối không bypass CAPTCHA, paywall hoặc cơ chế chống bot.
- **Không cần cài đặt cơ sở dữ liệu phức tạp:** Hỗ trợ nhúng **PGlite** (Postgres WASM) chạy trực tiếp trong Node.js để phát triển và test local; đồng thời sẵn sàng chuyển sang PostgreSQL thật thông qua cấu hình `DATABASE_URL`.

---

## Kiến trúc thư mục Monorepo

```text
tech-radar/
├── apps/
│   ├── web/        # Frontend React + Vite SPA (giao diện tiếng Việt)
│   ├── api/        # REST API Fastify (tìm kiếm, so sánh, quản lý nguồn và lượt chạy)
│   └── worker/     # Ingestion worker (thu thập lịch sự, chuẩn hóa, phân tầng gom trùng)
├── packages/
│   ├── core/       # Thuật toán: parse giá VND, chuẩn hóa tiếng Việt, Jaccard similarity, scoring
│   ├── sources/    # Source adapters (GEARVN adapter, cheerio parser cho danh mục & JSON-LD)
│   └── db/         # Drizzle ORM schema 7 bảng, migrations, seeds, PGlite/Node-PG client
├── docs/           # Bộ tài liệu kiến trúc, data model, quy chuẩn deduplication
└── tests/fixtures/ # Fixture HTML mẫu để test offline độc lập không cần mạng
```

---

## Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Cài đặt dependencies
Yêu cầu Node.js ≥ 20 và pnpm ≥ 9:
```bash
pnpm install
```

### 2. Khởi tạo cơ sở dữ liệu & Seed nguồn
```bash
# Chạy migration tạo 7 bảng (mặc định lưu vào .data/pglite)
pnpm db:migrate

# Seed danh sách nguồn dữ liệu (GEARVN, Phong Vũ, CellphoneS)
pnpm db:seed
```

### 3. Chạy thử nghiệm toàn bộ test suite (50 tests offline)
```bash
pnpm test
pnpm typecheck
```

### 4. Thu thập dữ liệu thực tế (quy mô nhỏ, lịch sự)
```bash
pnpm --filter @tech-radar/worker start -- --live
```

### 5. Khởi động API và Web UI
Mở 2 terminal riêng biệt:
```bash
# Terminal 1: Chạy API Fastify tại http://localhost:3001
pnpm dev:api

# Terminal 2: Chạy Web UI React tại http://localhost:5173
pnpm dev:web
```

---

## Trạng thái các nguồn dữ liệu

| Nguồn | Trạng thái | Đánh giá pháp lý & kỹ thuật |
|---|---|---|
| **GEARVN** | `approved_for_use` | Đã test kỹ thuật HTML tĩnh + JSON-LD `Product`. Đã được phê duyệt chạy phục vụ mục đích cá nhân, phi thương mại. |
| **Phong Vũ** | `blocked` | Điều 14.2 ToS giới hạn sao chép cho thương mại; tạm ngưng tự động thu thập. |
| **CellphoneS** | `investigated` | ToS tải động chưa đọc trích xuất được; cần duyệt thủ công trước khi viết adapter. |

Chi tiết xem tại [docs/SOURCES.md](docs/SOURCES.md).

---

## Tài liệu chi tiết

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Kiến trúc hệ thống và data flow
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): Mô hình dữ liệu và các bảng quan hệ
- [docs/DEDUPLICATION.md](docs/DEDUPLICATION.md): Chiến lược chuẩn hóa và thuật toán ghép trùng
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): Hướng dẫn phát triển và danh mục lệnh
- [docs/STATUS.md](docs/STATUS.md): Nhật ký trạng thái các phase đã hoàn thành
- [docs/ROADMAP.md](docs/ROADMAP.md): Lộ trình các giai đoạn tiếp theo

# ROADMAP — Lộ trình

> **Quy tắc gating:** không bắt đầu phase sau khi acceptance criteria của phase trước **chưa đạt hoặc chưa được người dùng chấp thuận**. Mỗi phase có mục tiêu, dependency, deliverables, acceptance criteria và cách xác minh (verification).

## Phase 0 — Repository reconnaissance & project docs
- **Mục tiêu:** khảo sát repo, xác minh môi trường, tạo bộ tài liệu nền.
- **Trạng thái:** **HOÀN THÀNH**. Đã chốt ADR 0001, các docs nền tảng, pnpm workspace.

## Phase 1 — Source feasibility
- **Mục tiêu:** xác minh nguồn (GEARVN, Phong Vũ, CellphoneS) về khả năng kỹ thuật + ToS; POC GEARVN quy mô nhỏ.
- **Trạng thái:** **HOÀN THÀNH**. Khảo sát cả 3 nguồn, lưu fixture HTML cho GEARVN, xác minh ToS và nhận duyệt phê duyệt sử dụng cá nhân cho GEARVN (`approved_for_use`).

## Phase 2 — Domain model & database design
- **Mục tiêu:** hiện thực schema (canonical, listing, price_history, source, run, review), migration, seed nguồn.
- **Trạng thái:** **HOÀN THÀNH**.
  - Package `@tech-radar/db` hoàn chỉnh với Drizzle ORM.
  - Hỗ trợ kép PGlite (chạy nhúng không cần cài PostgreSQL ngoài trên máy) và PostgreSQL thật qua `DATABASE_URL`.
  - 7 bảng quan hệ đúng chuẩn `DATA_MODEL.md`.
  - Seed 3 nguồn tự động và idempotent.
  - 7 unit tests kiểm tra schema, index, FK constraints, append-only history pass 100%.

## Phase 3 — Ingestion pipeline & source adapter đầu tiên
- **Mục tiêu:** worker + adapter GEARVN + fetch/parse/normalize + persist + price history + lịch sự với nguồn.
- **Trạng thái:** **HOÀN THÀNH**.
  - Package `@tech-radar/sources`: adapter GEARVN trích xuất danh mục và chi tiết sản phẩm.
  - Package `@tech-radar/worker`: PoliteFetcher (delay >= 2s, retry backoff, headers chuẩn bot), ingest idempotent và ghi nhận lịch sử giá.
  - 14 tests pass với fixture HTTP server offline giả lập đầy đủ kịch bản mạng và thay đổi giá.
  - Đã chạy thực tế một chu kỳ thu thập trực tiếp (live run) thành công với 40 listing.

## Phase 4 — Normalization & deduplication với fixture nhãn đúng/sai
- **Mục tiêu:** dedupe engine, confidence tiers, review queue, link listing vào canonical.
- **Trạng thái:** **HOÀN THÀNH**.
  - Package `@tech-radar/core`: chuẩn hóa tiếng Việt, Jaccard token similarity, thuật toán so khớp phân tầng (MPN/SKU -> auto_merge; brand+model / name similarity -> review/no_match).
  - Tích hợp trực tiếp vào worker linking pipeline: tự động gom khi tin cậy cao, tạo canonical độc lập và đưa vào `dedupe_reviews` kèm audit evidence khi chưa chắc chắn.
  - 18 tests trong `@tech-radar/core` và 4 integration tests linking pass 100%.

## Phase 5 — API & giao diện tìm kiếm/so sánh
- **Mục tiêu:** REST API + UI tìm kiếm, lọc, so sánh giá, lịch sử giá.
- **Trạng thái:** **HOÀN THÀNH**.
  - `@tech-radar/api`: Fastify server với đầy đủ endpoints tìm kiếm, lọc danh mục, chi tiết sản phẩm kèm lịch sử giá theo shop, so sánh thông số nhiều sản phẩm, quản lý nguồn và lượt crawl. Đã có 10 contract tests pass.
  - `@tech-radar/web`: Ứng dụng React + Vite tiếng Việt với giao diện trực quan: trang tìm kiếm kèm chọn so sánh, trang chi tiết vẽ biểu đồ SVG sparkline lịch sử giá, bảng so sánh đa sản phẩm, danh sách nguồn dữ liệu, danh sách runs. Build production Vite thành công.

## Phase 6 — Cập nhật thủ công, worker status, retry, logging, lịch sử giá
- **Mục tiêu:** hoàn thiện vận hành: trigger thủ công, xem trạng thái run, retry/backoff, log tìm kiếm được, chính sách lưu giữ lịch sử giá.
- **Trạng thái:** **SẴN SÀNG THỰC HIỆN / ĐANG TIẾP TỤC**.

## Phase 7 — Thêm nguồn đã vượt feasibility
- **Mục tiêu:** thêm Phong Vũ, CellphoneS (chỉ khi đã qua feasibility + duyệt ToS) và nguồn khác.
- **Trạng thái:** Chưa thực hiện (Phong Vũ đang `blocked`, CellphoneS đang `investigated`).

## Phase 8 — Hardening, security, performance, backup, deployment
- **Mục tiêu:** chắc chắn hóa trước khi dùng lâu dài (deploy VPS cá nhân).
- **Trạng thái:** Kế hoạch tương lai.

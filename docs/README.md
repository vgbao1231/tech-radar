# Tài liệu Tech Radar

Chỉ mục tài liệu. Thứ tự đọc đề xuất:

1. [PRODUCT.md](PRODUCT.md) — người dùng, vấn đề, MVP, ngoài phạm vi, tiêu chí thành công. *(VI)*
2. [ARCHITECTURE.md](ARCHITECTURE.md) — kiến trúc, data flow, ranh giới module, xử lý lỗi. *(EN)*
3. [DATA_MODEL.md](DATA_MODEL.md) — thực thể, trường, quan hệ, uniqueness, provenance. *(EN)*
4. [DEDUPLICATION.md](DEDUPLICATION.md) — chuẩn hóa, matching, confidence tiers, merge/split, test cases. *(EN)*
5. [SOURCES.md](SOURCES.md) — trạng thái từng nguồn dữ liệu, robots.txt, điều khoản, bằng chứng. *(VI)*
6. [ROADMAP.md](ROADMAP.md) — các phase, mục tiêu, dependency, acceptance criteria, verification. *(VI)*
7. [STATUS.md](STATUS.md) — đã xác minh / đang làm / blocker / đã quyết định / next step. *(VI)*
8. [DEVELOPMENT.md](DEVELOPMENT.md) — prerequisites và lệnh dev/test/lint/build (đã kiểm chứng hay chưa). *(EN)*
9. [TESTING.md](TESTING.md) — unit/integration/e2e, fixtures, test dữ liệu thiếu/đổi format. *(EN)*
10. [PHASE_1_PLAN.md](PHASE_1_PLAN.md) — khảo sát nguồn & thiết kế POC Phase 1 (chờ duyệt). *(VI)*
11. [adr/README.md](adr/README.md) — quy ước ADR; [adr/0001-initial-architecture.md](adr/0001-initial-architecture.md) — kiến trúc (accepted). *(EN)*

## Quy ước ngôn ngữ tài liệu

- **Tài liệu owner đọc → tiếng Việt (VI):** `README.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md`, `SOURCES.md`, `PHASE_1_PLAN.md`.
- **Tài liệu agent/dev đọc → tiếng Anh (EN):** `AGENTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `DEDUPLICATION.md`, `TESTING.md`, `DEVELOPMENT.md`, `adr/*`.
- **Code:** UI tiếng Việt; field/biến/API/code/schema tiếng Anh.
- Không dịch tài liệu qua ranh giới này khi chưa có sự đồng ý của owner.

## Nguyên tắc chung

- **Phân biệt fact / assumption / proposal.** Fact = đã chạy hoặc đã quan sát. Assumption = giả định hợp lý, chưa kiểm chứng. Proposal = đề xuất, cần duyệt.
- **Không bịa dữ liệu.** URL, robots.txt, kết quả test, trạng thái nguồn chỉ ghi khi có bằng chứng; nếu chưa có, ghi rõ "chưa xác minh".
- **Tránh lặp nội dung.** Mỗi chủ đề nằm ở đúng một tài liệu; tài liệu khác chỉ tham chiếu.

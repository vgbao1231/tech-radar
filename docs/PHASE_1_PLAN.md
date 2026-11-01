# PHASE_1_PLAN — Khảo sát nguồn & thiết kế POC (Phase 1)

> **Trạng thái: ĐÃ THỰC THI (2026-11-01) — khảo sát nguồn + POC GEARVN quy mô nhỏ.** Kết quả thực tế ghi tại [STATUS.md](STATUS.md) và [SOURCES.md](SOURCES.md). Không cài dependency, không sửa source code, không triển khai database. Phase 1 chỉ dùng khảo sát (curl/fetch thủ công, tần suất thấp) + lưu fixture HTML.

## Mục tiêu

1. **Xác định điều khoản sử dụng (ToS)** của GEARVN (ưu tiên), Phong Vũ, CellphoneS — làm rõ quyền sử dụng dữ liệu; **không** suy ra quyền từ robots.txt.
2. **Khảo sát khả năng kỹ thuật:** sitemap, cấu trúc trang sản phẩm/category, trang render tĩnh hay cần JS, có anti-bot hay không (**quan sát, không bypass**).
3. **POC GEARVN quy mô nhỏ** (sau khi có ToS + người dùng duyệt): một nhóm nhỏ **bàn phím cơ + chuột gaming**, chỉ truy cập công khai, tần suất thấp.
4. Ghi trạng thái rõ từng nguồn kèm **bằng chứng**; nếu chưa thể xác nhận cách sử dụng dữ liệu → chỉ làm phần được phép và ghi blocker.

## Đã xác minh (từ lượt trước, 2026-11-01)

- **GEARVN:** robots.txt `Allow: /`, Cloudflare + `Content-Signal: search=yes, ai-train=no`; trang chính sách: `/pages/chinh-sach-bao-hanh`, `chinh-sach-bao-mat`, `chinh-sach-van-chuyen`. **ToS chưa tìm thấy.**
- **Phong Vũ:** robots.txt `Allow: /`, cấm `/search?*`, `/account/*`; **trang chủ render JS** (không trích link qua HTML thô). **ToS chưa tìm thấy.**
- **CellphoneS:** robots cấm `/admin`, `/checkout`, `/customer`, `/catalogsearch`, URL query `/*?*`; trang quy định: `/chinh-sach-bao-hanh`, `/quy-dinh-*`. **ToS chưa tìm thấy.**
- Môi trường: Node 26.11.1, pnpm 12.14.0, Git 2.56.0; không Docker; **chưa xác minh PostgreSQL**.

## Nhiệm vụ khảo sát

| # | Nhiệm vụ | Cách làm | Kết quả mong đợi |
|---|---|---|---|
| S1 | Tìm ToS GEARVN | Sitemap, footer, các trang `/pages/*`, tìm kiếm "điều khoản/quy định" | URL ToS hoặc ghi rõ "không tìm thấy" |
| S2 | Tìm ToS Phong Vũ | Footer/sitemap (trang JS → dùng Playwright? **chỉ quan sát**, không bypass) | URL ToS hoặc ghi rõ |
| S3 | Tìm ToS CellphoneS | Footer/sitemap | URL ToS hoặc ghi rõ |
| S4 | Kiểm tra sitemap | Fetch sitemap XML của từng nguồn | Có/không; danh mục sản phẩm |
| S5 | Kiểm tra render tĩnh vs JS | Fetch 1 trang category/sản phẩm, so sánh HTML thô vs cần JS | Kết luận cho từng nguồn |
| S6 | Quan sát anti-bot | Request công khai, tần suất thấp; ghi nhận HTTP status, header, rate-limit | Ghi nhận; **không** bypass |

## Thiết kế POC GEARVN

**Điều kiện tiên quyết để chạy POC:** ToS đã đọc và không cấm rõ ràng **hoặc** đã có cách dùng dữ liệu phù hợp; người dùng duyệt thiết kế này. Nếu không xác nhận được → chỉ làm S1–S6 và ghi blocker.

**Phạm vi:**
- Một nhóm nhỏ: **chuột gaming + bàn phím cơ** (2 category), giới hạn số trang (vd 1–2 category page + một vài trang sản phẩm).
- **Chỉ truy cập công khai** (public URLs), tần suất thấp (độ trễ ≥ 2–3 giây/request, tổng request hạn chế, dừng sau N request).
- Dùng User-Agent mô tả bot + liên hệ (không giả mạo).

**Không làm:** bypass CAPTCHA/đăng nhập/paywall/rate limit/anti-bot; crawl sâu toàn bộ site; tự động định kỳ ở giai đoạn POC; dùng API nội bộ không công khai.

**Dữ liệu cần trích (fixture):** source, source URL, title listing, brand, model, SKU/MPN (nếu có), giá hiện tại, giá gốc (nếu có), trạng thái hàng (nếu có), thông số, thời điểm thu thập. Trường thiếu = `null`, **không suy diễn**.

**Lưu vết:** mỗi lần fetch lưu HTML fixture vào `tests/fixtures/sources/gearvn/` + `manifest.json` (URL, fetched_at, ghi chú, loại trang). Không lưu dữ liệu nhạy cảm.

## Kết quả Phase 1 (deliverables)

- Báo cáo khảo sát từng nguồn: trạng thái `investigated / technically-tested / blocked / approved-for-use` + bằng chứng + blocker (nếu có) → cập nhật `docs/SOURCES.md`.
- ToS URL (nếu tìm được) + tóm tắt điều khoản liên quan thu thập dữ liệu.
- Fixture HTML hợp lệ + ví dụ listing đã parse (nếu POC chạy).
- Khuyến nghị: nguồn nào dùng được, nguồn nào bỏ/để sau.

## Acceptance criteria

- [ ] ToS của ít nhất GEARVN đã được xác định (URL + nội dung liên quan) **hoặc** ghi rõ blocker.
- [ ] Sitemap + mức render (tĩnh/JS) của từng nguồn đã được ghi nhận.
- [ ] POC GEARVN (nếu được phép): chạy quy mô nhỏ, lưu fixture, parse được listing chuẩn hóa; **không** bypass; tần suất thấp.
- [ ] Mỗi nguồn có trạng thái rõ trong `SOURCES.md`; nguồn blocked có blocker, không bị ép.
- [ ] Không tuyên bố "thành công/approved" khi chưa chạy thật và chưa có quyết định người dùng.

## Verification & bằng chứng

- Ghi lại từng bước đã chạy: URL, thời gian, HTTP status, kết quả (thành công/lỗi) — **fact**, không bịa.
- Fixture lưu trong repo (kèm manifest); parse thủ công đối chiếu dữ liệu.
- Cập nhật `docs/STATUS.md` cuối phase với những gì **thực sự chạy**.

## Ràng buộc

- Không cài dependency, không viết crawler chạy thật, không kết nối DB, không migration, không commit/push trong phase này (trừ khi người dùng yêu cầu riêng).
- Không mở rộng sang category khác ngoài chuột + bàn phím cơ.
- Nếu GEARVN bị chặn → ghi blocker, chuyển trọng tâm nguồn khác hoặc tiếp tục Phase 2 (kiến trúc không phụ thuộc nguồn cụ thể).

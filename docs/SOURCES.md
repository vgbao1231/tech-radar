# SOURCES — Nguồn dữ liệu

Trạng thái nguồn: `unknown` → `investigated` → `technically-tested` → `approved-for-use` | `blocked`.

> **Ngày kiểm tra: 2026-11-01.** Phase 1 đã chạy khảo sát + POC nhỏ cho GEARVN (bằng chứng bên dưới). **Chưa nguồn nào `approved-for-use`.**
>
> **Cảnh báo pháp lý:** robots.txt **không phải giấy phép pháp lý**. Việc được phép thu thập/tái sử dụng dữ liệu phụ thuộc điều khoản sử dụng (ToS) và pháp luật. Không suy ra quyền từ robots.txt.

## GEARVN — `gearvn`

| Mục | Giá trị |
|---|---|
| Trạng thái | **`technically-tested`** (POC kỹ thuật) — **chưa** `approved-for-use` |
| Trang chủ | https://www.gearvn.com/ |
| robots.txt | https://www.gearvn.com/robots.txt — đã tải 2026-11-01 |
| Điều khoản | **https://gearvn.com/pages/dieu-khoan-dich-vu** — đã đọc 2026-11-01 |
| Điều khoản liên quan khác | `/pages/chinh-sach-bao-mat`, `/pages/chinh-sach-bao-hanh`, `/pages/chinh-sach-van-chuyen` |

**robots.txt (2026-11-01):** Cloudflare managed; `User-agent: *` → `Allow: /`; `Content-Signal: search=yes, ai-train=no, use=reference`; cấm bot huấn luyện AI. Cho phép crawl chung `/`. (Không phải giấy phép pháp lý.)

**ToS (Điều khoản dịch vụ) — tóm tắt:** gồm giới thiệu (truy cập = đồng ý điều khoản; có thể thay đổi), hướng dẫn sử dụng (18+, đồng ý nhận email quảng cáo), thanh toán. **Không có điều khoản nêu rõ về thu thập tự động, crawling, hay tái sử dụng nội dung.** Việc ToS "không nhắc tới" **không đồng nghĩa với cho phép** — cần quyết định của owner/ý kiến pháp lý trước khi dùng dữ liệu lâu dài.

**POC kỹ thuật (đã chạy 2026-11-01, quy mô nhỏ, tần suất thấp, chỉ trang công khai, không bypass):**
- Đã tải 2 category page (`/collections/ban-phim-co`, `/collections/gaming-mouse`) + 1 product page. Tất cả HTTP 200 với UA bot mô tả (`TechRadarBot/0.1 ...`), **không bị chặn**.
- **Server-rendered** (không cần JS). Product card chứa: tên, `price-sale`, specs, link `/products/slug`.
- **Product detail** có **JSON-LD `Product`**: `name`, `sku` (vd `KB-ASUS-M902-ROG-AZOTH-96-HE-WHI`), `brand` (`ASUS`), `offers` (`price`, `availability=InStock`, `seller=GEARVN`), `additionalProperty` (specs). **`mpn` không có.**
- Đã trích được 20 listing/category page (title + giá + URL). Mẫu: `tests/fixtures/sources/gearvn/extracted-sample.json`.
- Trường chưa có ở list page: brand/model/mpn/sku/stock (có ở product detail hoặc cần parse thêm). **Không suy diễn** — để `null` khi thiếu.

**Bằng chứng (fixture):** `tests/fixtures/sources/gearvn/` — `ban-phim-co.html`, `gaming-mouse.html`, `product-azoth-96-he-white.html`, `extracted-sample.json`, `manifest.json`.

**Kết luận:** khả năng kỹ thuật **đã xác minh ở quy mô nhỏ**. Dùng lâu dài cần quyết định của owner về quyền sử dụng dữ liệu (ToS không nêu rõ).

## Phong Vũ — `phongvu`

| Mục | Giá trị |
|---|---|
| Trạng thái | **`investigated`** — **chưa** `technically-tested`, **chưa** `approved-for-use`; có **ràng buộc ToS** |
| Trang chủ | https://phongvu.vn/ |
| robots.txt | https://phongvu.vn/robots.txt — đã tải 2026-11-01 |
| Điều khoản | **https://help.phongvu.vn/chinh-sach-ban-hang/dieu-kien-giao-dich** — đã đọc 2026-11-01 |
| Bảo mật thông tin | https://help.phongvu.vn/chinh-sach-chung/bao-mat-thong-tin |

**robots.txt (2026-11-01):** `User-agent: *` → `Allow: /`; `Disallow: /checkout/`, `/cart`, `/login/`, `/account/...`, `/search?*`, `/notification`. Trang category/sản phẩm không bị disallow.

**ToS (Điều kiện giao dịch chung) — điểm quan trọng (Điều 14.2), trích nguyên văn:**
> "Nội dung được đăng trên Website/ App Phong Vũ phục vụ cho mục đích tham khảo cá nhân của Khách Hàng. Khách Hàng không được tải về, sao chép, sử dụng, tái sản xuất hoặc tham khảo bất kỳ nội dung nào cho mục đích kinh doanh hoặc thương mại."

Diễn giải: ToS cho phép **tham khảo cá nhân**, nhưng hạn chế tải về/sao chép/tái sử dụng **cho mục đích kinh doanh/thương mại**. Ứng dụng cá nhân phi thương mại có thể nằm trong "tham khảo cá nhân", **nhưng thu thập tự động quy mô lớn là mơ hồ về pháp lý** → **chưa thể coi là phù hợp**. Cần ý kiến pháp lý/quyết định owner trước khi thu thập tự động.

**Kết luận:** **blocker pháp lý** — không thu thập tự động cho đến khi có quyết định rõ. Không chạy POC kỹ thuật ở giai đoạn này.

## CellphoneS — `cellphones`

| Mục | Giá trị |
|---|---|
| Trạng thái | **`investigated`** — **chưa** `technically-tested`, **chưa** `approved-for-use` |
| Trang chủ | https://cellphones.com.vn/ |
| robots.txt | https://cellphones.com.vn/robots.txt — đã tải 2026-11-01 |
| Điều khoản | **https://cellphones.com.vn/tos** ("Quy chế hoạt động") — reachable 200, **nội dung chi tiết chưa trích được** (tải động) |
| Bảo mật | https://cellphones.com.vn/tos?part=privacy-policy |

**robots.txt (2026-11-01):** Magento; cấm `/admin/`, `/checkout/`, `/customer/...`, `/catalogsearch/`, nhiều URL query `/*?*`. URL sản phẩm tĩnh (`...-p.html`) không bị disallow rõ ràng.

**ToS:** trang `/tos` trả 200 nhưng phần nội dung quy chế không có trong HTML tĩnh (chỉ thấy tiêu đề), nên **chưa đọc được điều khoản chi tiết**. Cần đọc thủ công/qua trình duyệt. Không kết luận gì khi chưa đọc.

**Kết luận:** **blocker** — ToS chưa được review; chưa thể đánh giá. **Chưa** chạy POC.

---

## Tổng hợp trạng thái

| Nguồn | Trạng thái | robots | ToS | Đề xuất tiếp theo |
|---|---|---|---|---|
| GEARVN | **technically-tested** | cho phép crawl chung `/` | tìm thấy; **không nêu rõ** thu thập/tái sử dụng | Owner quyết định quyền dùng dữ liệu (ToS mơ hồ) |
| Phong Vũ | investigated | cho phép category; cấm `/search?*` | tìm thấy; **hạn chế sao chép/thương mại** (Đ.14.2) | Blocker pháp lý; không auto-collect |
| CellphoneS | investigated | hạn chế URL query | trang `/tos` có nhưng **chưa đọc được nội dung** | Đọc ToS thủ công trước |

**Chưa nguồn nào `approved-for-use`.** Quyết định dùng nguồn thuộc về owner sau khi xem xét ToS/ý kiến pháp lý.

## Nguyên tắc khi triển khai (Phase sau)

- Không bypass CAPTCHA, đăng nhập, paywall, rate limit, anti-bot.
- Tôn trọng robots.txt và ToS riêng từng nguồn; dùng độ trễ lịch sự.
- Khi nguồn bị chặn/chưa phù hợp: ghi blocker và **tiếp tục phần kiến trúc không phụ thuộc nguồn đó**, không đổi mục tiêu sản phẩm.
- Robot.txt chỉ là tín hiệu kỹ thuật, **không phải** quyền pháp lý.

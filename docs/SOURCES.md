# SOURCES — Nguồn dữ liệu

Trạng thái nguồn: `unknown` → `investigated` → `technically-tested` → `approved-for-use` | `blocked`.

> **Ngày kiểm tra: 2026-11-01 (GEARVN, ToS các nguồn); 2026-11-02 (POC Phong Vũ).** Phase 1/7 đã chạy khảo sát + POC nhỏ (bằng chứng bên dưới). **GEARVN và Phong Vũ đã `approved_for_use`** theo quyết định owner (cá nhân, phi thương mại).
>
> **Cảnh báo pháp lý:** robots.txt **không phải giấy phép pháp lý**. Việc được phép thu thập/tái sử dụng dữ liệu phụ thuộc điều khoản sử dụng (ToS) và pháp luật. Không suy ra quyền từ robots.txt.

## GEARVN — `gearvn`

| Mục | Giá trị |
|---|---|
| Trạng thái | **`approved_for_use`** — POC kỹ thuật đạt; owner duyệt dùng cá nhân phi thương mại |
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

**Kết luận:** khả năng kỹ thuật **đã xác minh ở quy mô nhỏ**; owner đã duyệt dùng cá nhân phi thương mại (adapter + fixture đang dùng).

## Phong Vũ — `phongvu`

| Mục | Giá trị |
|---|---|
| Trạng thái | **`approved_for_use`** — owner decision 2026-11-01: phi thương mại, cá nhân; ToS art. 14.2 chỉ hạn chế mục đích kinh doanh/thương mại |
| Trang chủ | https://phongvu.vn/ |
| robots.txt | https://phongvu.vn/robots.txt — đã tải 2026-11-01 |
| Điều khoản | **https://help.phongvu.vn/chinh-sach-ban-hang/dieu-kien-giao-dich** — đã đọc 2026-11-01 |
| Bảo mật thông tin | https://help.phongvu.vn/chinh-sach-chung/bao-mat-thong-tin |

**robots.txt (2026-11-01):** `User-agent: *` → `Allow: /`; `Disallow: /checkout/`, `/cart`, `/login/`, `/account/...`, `/search?*`, `/notification`. Trang category/sản phẩm không bị disallow.

**ToS (Điều kiện giao dịch chung) — điểm quan trọng (Điều 14.2), trích nguyên văn:**
> "Nội dung được đăng trên Website/ App Phong Vũ phục vụ cho mục đích tham khảo cá nhân của Khách Hàng. Khách Hàng không được tải về, sao chép, sử dụng, tái sản xuất hoặc tham khảo bất kỳ nội dung nào cho mục đích kinh doanh hoặc thương mại."

Diễn giải: ToS cho phép **tham khảo cá nhân**, nhưng hạn chế tải về/sao chép/tái sử dụng **cho mục đích kinh doanh/thương mại**. Ứng dụng cá nhân phi thương mại nằm trong "tham khảo cá nhân"; owner đã quyết định phê duyệt dùng cá nhân phi thương mại với tần suất lịch sự (xem mục "Quyết định của người dùng" trong `STATUS.md`).

**POC kỹ thuật (đã chạy 2026-11-02, quy mô nhỏ, tần suất thấp, chỉ trang công khai, không bypass):**
- Đã tải 2 category page (`/c/ban-phim-gaming`, `/c/chuot-gaming`) + 1 product page. Tất cả HTTP 200 với UA bot mô tả (`TechRadarBot/0.1 ...`), **không bị chặn**; mỗi request cách nhau ≥ 2s.
- Category page là **Next.js**: grid sản phẩm nằm trong `<script id="__NEXT_DATA__">` tại `props.pageProps.serverProducts` (40 sản phẩm/trang, 11 trang cho bàn phím). DOM product card được render client-side nên không parse HTML card.
- Mỗi item có: `sku`, `name`, `imageUrl`, `price.latestPrice`, `price.supplierRetailPrice`, `stockQuantity`, `isPreOrder`, `brand.name`, `link.as.pathname`.
- **Biến thể (màu/switch) là SKU khác nhau nhưng dùng chung một URL sản phẩm** (ví dụ AULA F75). Vì `product_listings` khóa theo `(source_id, source_url)`, adapter gom nhóm biến thể thành **một listing**: chọn biến thể rẻ nhất còn hàng làm giá đại diện, toàn bộ payload biến thể giữ trong `raw_payload`.
- **Product detail** có **JSON-LD `Product`**: `name`, `image`, `brand.name`, `offers` (`price`, `priceCurrency`, `availability`), `sku`, `additionalProperty` (specs). **`mpn` không có**; **giá gốc (list price) không có trong JSON-LD**.
- Lưu ý dữ liệu: một số chuỗi spec ở dạng Unicode NFD; adapter chuẩn hóa về NFC khi parse.
- Đã trích được 35 listing bàn phím + 38 listing chuột (sau khi gom biến thể) từ 2 fixture category.

**Bằng chứng (fixture):** `tests/fixtures/sources/phongvu/` — `ban-phim-gaming.html`, `chuot-gaming.html`, `product-aula-s500.html`, `manifest.json`.

**Kết luận:** khả năng kỹ thuật **đã xác minh**; adapter `phongvuAdapter` đã hiện thực và test offline bằng fixture.

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
| GEARVN | **approved_for_use** | cho phép crawl chung `/` | tìm thấy; **không nêu rõ** thu thập/tái sử dụng | Đang dùng (adapter + fixture). |
| Phong Vũ | **approved_for_use** | cho phép category; cấm `/search?*` | ToS Đ.14.2 hạn chế mục đích thương mại; owner duyệt dùng cá nhân | Đang dùng (adapter + fixture). |
| CellphoneS | investigated | hạn chế URL query | trang `/tos` có nhưng **chưa đọc được nội dung** | Đọc ToS thủ công trước |

Owner đã phê duyệt GEARVN và Phong Vũ cho mục đích cá nhân phi thương mại. CellphoneS **chưa** được duyệt.

## Nguyên tắc khi triển khai (Phase sau)

- Không bypass CAPTCHA, đăng nhập, paywall, rate limit, anti-bot.
- Tôn trọng robots.txt và ToS riêng từng nguồn; dùng độ trễ lịch sự.
- Khi nguồn bị chặn/chưa phù hợp: ghi blocker và **tiếp tục phần kiến trúc không phụ thuộc nguồn đó**, không đổi mục tiêu sản phẩm.
- Robot.txt chỉ là tín hiệu kỹ thuật, **không phải** quyền pháp lý.

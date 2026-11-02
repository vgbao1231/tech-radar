# PRODUCT — Định nghĩa sản phẩm

## Người dùng mục tiêu

- **Chính chủ dự án (owner)** — một người dùng cá nhân muốn theo dõi giá tech gear tại Việt Nam.
- Không phục vụ nhiều người dùng; không cần đăng nhập/đa người dùng ở MVP.

## Vấn đề

- Giá tech gear ở Việt Nam **phân tán** qua nhiều cửa hàng (GEARVN, Phong Vũ, CellphoneS, ...), mỗi nơi một tên/một giá.
- Cùng một sản phẩm có thể xuất hiện ở nhiều nguồn với tên hơi khác nhau → trùng lặp, khó theo dõi.
- Người dùng phải lướt nhiều nơi, dễ bỏ sót và mất thời gian.
- Mục tiêu: gom các tech gear từ nhiều nguồn, khử trùng, hiển thị thống nhất (tên, giá, hình, thông số) kèm nguồn + link gốc.

## Use cases

1. **Theo dõi giá một model** từ nhiều cửa hàng, biết nơi rẻ nhất hiện tại.
2. **Xem lịch sử giá** của một listing/model theo thời gian.
3. **Tìm kiếm** model theo brand, category, mức ngân sách.
4. **So sánh** listing của cùng một model giữa các cửa hàng (giá, trạng thái, cập nhật).
5. **Cập nhật thủ công** một listing/nhóm listing (chạy lại, sửa liên kết, gom/split).
6. **Quản lý nguồn:** thêm/bật/tắt nguồn đã qua kiểm tra; xem trạng thái nguồn.

## MVP (phạm vi tối thiểu)

- Ít nhất **1 nguồn** (ứng viên: GEARVN) với **chuột gaming + bàn phím cơ** — kiểm chứng model/SKU matching trước khi mở rộng màn hình, tai nghe, linh kiện PC.
- Ba thực thể lõi: **Canonical Product**, **Product Listing**, **Price History**.
- **Deduplication** với confidence tiers + hàng chờ review (không tự gom khi chưa chắc chắn).
- **Tìm kiếm + lọc + so sánh** giữa các cửa hàng + biểu đồ lịch sử giá.
- **Cập nhật tự động** (cron) + **thủ công**; ở giai đoạn POC **chưa tự động thu thập định kỳ**.
- Lưu **provenance** (source, URL, raw payload, timestamp) cho mọi dữ liệu thu thập.
- **Dashboard cá nhân, truy cập riêng** (mặc định kiểm soát một chủ đơn giản — token/basic auth từ env; **không** tài khoản đa người dùng).
- **Lịch sử giá không xóa trong MVP:** lưu theo thời điểm thu thập, nguồn, giá trị thực; thay đổi giá ghi bản ghi mới, không ghi đè lịch sử cũ; chưa cần cleanup.

## Ngoài phạm vi (không triển khai)

- Blog/tin tức công nghệ, review, bài viết.
- Catalog nhập tay (chỉ cho phép **review/sửa** kết quả dedupe, không phải nguồn dữ liệu chính).
- Tính năng AI (tóm tắt, gợi ý, chat).
- Cảnh báo/alert (email, push) — chưa yêu cầu.
- Tài khoản nhiều người dùng, đăng nhập phức tạp, thanh toán.
- Ứng dụng di động.

## Tiêu chí thành công (đo được)

- ≥ 90% listing từ nguồn chính được gom đúng canonical trên bộ fixture có nhãn đúng/sai.
- Giá hiển thị **độc lập theo từng cửa hàng**, không bị trộn hoặc ghi đè.
- Lịch sử giá chính xác: không mất mốc giá, không ghi trùng liên tiếp.
- Tìm kiếm/lọc phản hồi < 200 ms (mục tiêu trên dữ liệu thực tế).
- Vòng thu thập tự động chạy ổn định (không lỗi liên tục > 1 ngày) cho nguồn đã approve.
- Mọi nguồn bị chặn đều có blocker ghi rõ, và sản phẩm vẫn hoạt động với các nguồn còn lại.

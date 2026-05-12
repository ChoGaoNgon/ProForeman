# Changelog - Lịch sử cập nhật ProForeman

## [2026-05-12] - Cập Nhật Hệ Thống Phân Quyền & Tài Chính

### Đã thêm (Added)
- Hệ thống phân quyền RBAC đa lớp:
    - Phân quyền theo cấp độ hệ thống (ADMIN, CEO, LEADER, STAFF).
    - Phân quyền theo chức danh trong dự án (CHỈ HUY TRƯỞNG, Kế Toán).
- Tối ưu hóa lượt đọc Firestore (Spark plan):
    - Triển khai phân trang (Pagination) cho màn hình Báo cáo: Chỉ tải 3 báo cáo mỗi lần.
    - Bổ sung nút "Hiển thị thêm" (Load More).
    - Loại bỏ việc tự động tải toàn bộ dữ liệu báo cáo khi khởi động ứng dụng.
- Tự động lọc dữ liệu dự án, thanh toán và báo cáo dựa trên sự phân bổ nhân sự (Assignments).
- Trạng thái `loading` và vô hiệu hóa nút (disable) khi đang xử lý giao dịch tài chính để tránh lỗi trùng lặp dữ liệu.
- Tài liệu hướng dẫn sử dụng (`README.md`) và tài liệu kỹ thuật (`TECHNICAL.md`).

### Đã sửa (Changed)
- Logic tính thực thanh: Không cộng dồn khoản "Trích chi khác" vào giá trị Thực thanh đợt này.
- Giao diện "Thanh toán": Bỏ cột "Nội dung thanh toán khác" theo yêu cầu người dùng để tinh gọn bảng.
- Điều hướng & Quyền hạn: 
    - Ẩn "Bảng điều khiển" (Dashboard) đối với người dùng không có vai trò quản lý dự án (BCH/Kế toán).
    - Chuyển hướng người dùng cơ bản vào màn hình Báo cáo khi đăng nhập.
- Hiển thị: Ẩn các menu quản trị (Phòng ban, Nhân sự, Chức danh) đối với người dùng không phải ADMIN/CEO.

### Đã xóa (Removed)
- Trường `other_payment_content` trong form và bảng thanh toán.

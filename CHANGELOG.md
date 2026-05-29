# Changelog - Lịch sử cập nhật ProForeman

## [2026-05-29] - Thêm Quản Lý Danh Mục Vật Tư Chuẩn Hóa & Nhập Liệu Tự Động điền thông tin

### Đã thêm (Added)
- **Màn hình Quản lý Danh mục Vật tư Quy chuẩn (`MaterialItemsView`)**:
    - Quản lý từ điển vật tư dùng chung cho toàn hệ thống (ví dụ: gạch, cát, đá, sỏi, xi măng, sắt xà gồ, thép...).
    - Hỗ trợ đầy đủ các thao tác CRUD (Thêm mới, Hiển thị danh sách kết hợp tìm kiếm nhanh, Chỉnh sửa thông số, và Xóa mềm chỉ định với `is_deleted: 1`).
    - Tính năng **Nạp danh mục mẫu nhanh (Dynamic Seed)**: Khi danh sách vật tư quy chuẩn trống, người dùng có thể kích hoạt nút tự động nạp loạt vật tư thông dụng (gạch chỉ đỏ, cát vàng sông Hồng, sỏi sông, đá dăm 1x2, xi măng Hà Tiên, thép Thái Nguyên...) để rút ngắn tối đa thời gian cấu hình ban đầu.
- **Tính năng Lựa chọn Vật tư Quy chuẩn khi Nhập Kho**:
    - Thay thế trường nhập tay tự do (`material_name` text input) trong form **Nhập vật tư** bằng thẻ `<select>` dropdown kết nối trực tiếp đến danh mục vật tư quy chuẩn đã được định nghĩa.
    - **Cơ chế điền nhanh thông minh (Smart Autofill)**: Tự động điền Đơn vị tính mặc định (`default_unit`) và Đơn giá tham khảo (`default_unit_price`) ngay khi người dùng chọn vật tư, giúp nâng cao tối đa tốc độ nhập liệu hiện trường và đảm bảo tính nhất quán dữ liệu.
- **Quy tắc bảo mật Firestore**:
    - Bổ sung quy tắc Security Rules cho collection `material_items` trong `firestore.rules` để cho phép tất cả các tài khoản nhân viên được cấp quyền đọc/ghi đồng bộ.
- **Mô tả cấu trúc Schema**:
    - Cập nhật định nghĩa và sơ đồ quan hệ đối tượng `MaterialItem` trong tệp cấu hình blueprint cơ sở dữ liệu `firebase-blueprint.json`.

## [2026-05-28] - Tích hợp PWA, Tối ưu hóa UI/UX Lịch & Khả năng hoạt động Ngoại tuyến

### Đã thêm (Added)
- **Tích hợp PWA (Progressive Web Application)**:
    - Bổ sung cấu hình `manifest.json` đầy đủ cùng thẻ siêu dữ liệu (meta tags) tối ưu hóa trải nghiệm ứng dụng di động độc lập.
    - Phát triển Service Worker (`sw.js`) áp dụng mô hình cache *Stale-While-Revalidate* giúp hệ thống khởi động tức thì và hoạt động mượt mà khi mất kết nối mạng.
    - Cung cấp logo định dạng SVG nguyên bản độ phân giải cao (`icon.svg`), tối ưu hiển thị cho cả thiết bị máy tính và di động.
    - Pinia Store chuyên biệt (`pwa.ts`) quản lý logic cài đặt và bắt sự kiện `beforeinstallprompt`.
- **Giao diện Cài đặt Ứng dụng (App Install Widget)**:
    - Nút **"Tải App" / "Tải Ứng Dụng"** xuất hiện trên thanh Tiêu đề (Header) và Sidebar khi trình duyệt hỗ trợ cài đặt PWA trực tiếp.
    - Thiết kế giao diện hộp thoại hướng dẫn chi tiết dành riêng cho người dùng iOS (Safari) thực hiện thêm ứng dụng vào Màn hình chính.
- **Nút Làm mới Dữ liệu Báo cáo**:
    - Bổ sung nút **"Làm mới" (Refresh)** tích hợp hiệu ứng xoay tải dữ liệu (`animate-spin`) trong màn hình Báo cáo công việc (`ReportsView`), cho phép kéo thả/tự tải lại dữ liệu mới nhất thủ công từ Firestore một cách linh hoạt.

### Đã sửa (Changed)
- **Tái thiết kế Giao diện Lịch (Google Calendar UI/UX style)**:
    - Cải tiến hiệu ứng khi bấm chọn ô ngày: Loại bỏ lỗi mất màu nền trắng hoàn toàn, thay thế bằng viền xanh mỏng tinh tế (`border-blue-600 ring-2`) để giữ nguyên màu nền hiển thị của các sự kiện bên dưới.
    - Trình bày ngày hiện tại (Today) bằng hình tròn xanh đậm nổi bật kèm chữ trắng, ngày được chọn (Selected Date) bằng vòng tròn đen nguyên bản.
    - Làm mới thanh hiển thị sự kiện trên ô lịch: Sử dụng viền trái đậm cùng tông màu xanh nhạt bắt mắt, font chữ đậm thu gọn giúp bố cục sạch sẽ giống ứng dụng Google Calendar.
- **Khả năng Kháng lỗi Ngoại tuyến (Offline Connection Resilience)**:
    - Bọc logic khởi tạo / kiểm tra người dùng trong Firestore Auth bằng cấu trúc `try/catch`. 
    - Cho phép tự động tạo tài khoản hoặc tải thông tin cá nhân giả định tạm thời khi chạy trên môi trường ngoại tuyến (Local Sandbox) mà không gây treo ứng dụng hay báo lỗi cấu hình.

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

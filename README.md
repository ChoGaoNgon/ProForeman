# ProForeman - Hệ Thống Quản Lý Dự Án Xây Dựng

## Tổng Quan
ProForeman là ứng dụng quản lý tiến độ, nhân sự và tài chính dành cho các đơn vị thi công xây dựng. Hệ thống cho phép theo dõi dòng tiền, quản lý hồ sơ thanh toán, báo cáo nhật ký hiện trường và phân quyền chi tiết theo từng cấp độ và dự án.

## Các Tính Năng Vừa Cập Nhật

### 1. Quản lý Danh mục Vật tư Chuẩn & Nhập Kho Thông Minh
- **Danh mục Vật tư Quy chuẩn**: Giờ đây người dùng có thể quản lý một thư viện các vật tư chuẩn của công ty (như Gạch chỉ đỏ, Đá dăm 1x2, Cát mịn, Sỏi,...). Giao diện hỗ trợ đầy đủ bộ công cụ Thêm, Sửa, Xóa và Tìm kiếm để kiểm soát danh sách vật liệu đồng nhất.
- **Nạp nhanh danh mục mẫu (One-click Seeding)**: Đối với các tài khoản mới lập chưa có dữ liệu, hệ thống tự động cung cấp nút **"NẠP DANH MỤC MẪU"** ở góc phải giúp điền nhanh đầy đủ 9 nhóm vật liệu xây dựng phổ biến nhất chỉ trong 1 giây.
- **Loại bỏ gõ phím thủ công (Autofill)**: Màn hình **Nhập vật tư** đã chuyển đổi hoàn toàn từ ô nhập liệu tự do sang danh sách chọn nhanh (`<select>`). Khi người dùng chọn bất kỳ loại vật tư nào, hệ thống sẽ tự động điền **Đơn vị tính** mặc định và **Đơn giá tham khảo** tương ứng, triệt tiêu sai lệch chính tả và tăng tốc thao tác đến 80%.

### 2. Tích Hợp PWA & Trải Nghiệm Di Động Độc Lập
- **Cài đặt Không cần Cửa hàng Ứng dụng**: Cho phép người dùng trực tiếp tải và lưu ứng dụng vào màn hình chính của điện thoại hoặc máy tính (Home Screen) thông qua nút **Tải App** được tích hợp ở thanh điều hướng trên cùng hoặc thanh Sidebar cạnh bên.
- **Hỗ trợ Thiết bị Apple (iOS)**: Tự động phát hiện trình duyệt Safari trên iPhone/iPad để hiển thị bảng hướng dẫn từng bước trực quan giúp người dùng thêm ứng dụng vào Màn hình chính thủ công một cách dễ dàng.
- **Service Worker & Caching Ngoại tuyến**: Tải trước tất cả các tài nguyên giao diện cơ bản (App Shell) nhờ Service Worker hoạt động dưới chế độ *Stale-While-Revalidate*, giúp hệ thống khởi động cực nhanh kể cả khi ở hiện trường sóng yếu hay mất kết nối Internet.

### 2. Giao Diện Lịch Cải Tiến Chuẩn Google Calendar
- **Hiệu ứng ô ngày được chọn**: Sửa lỗi ô ngày chuyển hoàn toàn sang nền trắng khi bấm chọn. Giờ đây, ô ngày được chọn nổi bật nhờ đường viền mỏng xanh dương cùng hiệu ứng bắt mát (`ring`), trong khi toàn bộ nội dung lịch trình bên dưới vẫn giữ nguyên màu sắc hiển thị sắc nét.
- **Chỉ báo chữ số ngày**: Trình bày ngày hiện tại bằng hình tròn xanh dương thẫm chữ trắng nổi bật, ngày được chọn bằng một hình tròn tối màu tinh giản.
- **Thành phần sự kiện trực quan**: Lịch trình hiện trường sử dụng thanh màu nền dịu nhẹ với đường viền trái dày dặn, tiêu đề đậm nét giúp người dùng dễ dàng lướt xem lịch làm việc năng suất như trên Google Calendar thực tế.

### 3. Nút Làm Mới Thủ Công (Manual Refresh)
- Tiện ích nút **Làm mới dữ liệu** được đặt ngay bên cạnh bộ lọc dự án tại trang **Báo cáo**. Giúp người dùng/Chỉ huy trưởng nhanh chóng kéo hay tải lại dữ liệu công việc hiện trường mới nhất trực tiếp từ Firestore mà không phải tải lại toàn bộ trang web.

### 4. Logic Tính Toán Tài Chính
- **Thực thanh đợt này (Net Payment)**: Được tính bằng `Giá trị nghiệm thu - Thu hồi tạm ứng`.
- **Khoản trích chi khác**: Được ghi nhận như một phần trong giá trị nghiệm thu để theo dõi các khoản chi dịch vụ ngoài, không cộng thêm vào giá trị thực thanh của nhà thầu.
- **Lũy kế**: Tự động tính toán lũy kế nghiệm thu và thu hồi tạm ứng dựa trên các đợt thanh toán trước đó.

### 2. Kiểm Soát Giao Dịch
- **Chống Double-click**: Toàn bộ các nút lưu phiếu chi và lưu dữ liệu quan trọng đã được tích hợp trạng thái `loading` và `disabled` để ngăn chặn việc tạo dữ liệu trùng lặp khi người dùng nhấn chuột nhiều lần.

### 3. Hệ Thống Phân Quyền (RBAC) Cố Định
Hệ thống áp dụng cơ chế phân quyền hai lớp (Hệ thống & Dự án):

#### A. Quyền Hệ Thống (System Role)
- **ADMIN & CEO**: Toàn quyền truy cập tất cả các tính năng. Có quyền quản lý Phòng ban, Nhân sự, Chức danh, Dự án, Thanh toán và Báo cáo trên toàn hệ thống.
- **LEADER & STAFF**: Chỉ nhìn thấy các dự án mà mình được gán (assigned).

#### B. Quyền Theo Dự Án (Project-Based Role)
Đối với LEADER và STAFF, quyền hạn trong dự án phụ thuộc vào chức danh được gán:
- **CHỈ HUY TRƯỞNG (BCH) hoặc Kế Toán**: Toàn quyền quản lý trong phạm vi dự án được gán (Thêm/Sửa/Xoá hồ sơ thanh toán, chi tiết dự án).
- **Các chức danh khác**: 
    - Chỉ có quyền xem thông tin chi tiết dự án.
    - Lập báo cáo công việc (nhật ký) cho dự án đó.
    - Không được quyền truy cập vào màn hình "Thanh toán" chung hoặc thực hiện các thao tác quản lý tài chính dự án trừ khi có chức danh quản lý dự án nêu trên.

#### C. Chuyển Hướng Mặc Định
- Người dùng không có quyền quản lý (BCH/Kế toán) sẽ bị ẩn Bảng điều khiển và chuyển hướng mặc định vào màn hình **Báo cáo** để tập trung vào việc cập nhật nhật ký hiện trường.

## Công Nghệ Sử Dụng
- **Frontend**: Vue 3 (Composition API), Vite, TypeScript.
- **Styling**: Tailwind CSS (Thiết kế hiện đại, bento grid layout).
- **State Management**: Pinia.
- **Backend/Database**: Firebase Firestore, Firebase Authentication.
- **Icons**: Lucide Vue.

## Cấu trúc Dữ liệu (Firebase)
Chi tiết cấu trúc thực thể (Entity) và quan hệ dữ liệu được định nghĩa trong file `firebase-blueprint.json`.

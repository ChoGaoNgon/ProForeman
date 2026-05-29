# Tài liệu Kỹ Thuật Dự Án ProForeman

## 1. Kiến Trúc Phân Quyền (RBAC)
Hệ thống sử dụng Pinia stores để quản lý quyền hạn của người dùng một cách tập trung.

### Auth Store (`src/stores/auth.ts`)
- `isAdmin`: Trả về `true` nếu người dùng là `ADMIN` hoặc `CEO`. Quyền này cho phép quản lý toàn bộ hệ thống (Danh mục, Nhân sự, Cấu hình).
- `isStaff`: Trả về `true` cho các role `LEADER` và `STAFF`.
- `canManageSystem`: Tương đương `isAdmin`.

### App Store (`src/stores/app.ts`)
Store này xử lý các logic phân quyền phức tạp dựa trên dữ liệu thực tế từ Firestore:
- `visibleProjects`: Tự động lọc danh sách dự án dựa trên bảng `project_assignments`. Người dùng chỉ thấy các dự án mà mình được gán vào.
- `canManageProject(projectId)`: Kiểm tra chức danh của người dùng trong một dự án cụ thể. Nếu người dùng có chức danh chứa các từ khóa: `chỉ huy trưởng`, `bch`, `kế toán` (hoặc mã code tương ứng `cht`, `kt`), hàm sẽ trả về `true`.
- `hasAnyPaymentAccess`: Kiểm tra xem người dùng có quyền quản lý tài chính/dự án ở BẤT KỲ dự án nào không. Được dùng để ẩn/hiện menu "Bảng điều khiển" và "Thanh toán".
- `fetchReportsPaginated`: Cơ chế lấy báo cáo theo đợt (pagination) để tối ưu lượt đọc Firestore (reads).

## 2. Bảo Mật và Phân Quyền (Firestore Rules)
Hệ thống sử dụng cơ chế định danh tài liệu có quy tắc (**Predictable Document IDs**) để thực thi bảo mật RBAC trên server:
- **Project Assignments**: Sử dụng ID theo định dạng `{employee_id}_{project_id}`. Điều này cho phép Security Rules có thể `get()` trực tiếp thông tin quyền hạn mà không cần thực hiện query phức tạp.
- **Payments & Projects Protection**: Các quy tắc `allow write` sẽ kiểm tra chéo qua bảng `project_assignments` và `project_roles` để xác định xem một người dùng `STAFF` có chức danh quản lý (BCH/Kế toán) trong dự án đó hay không trước khi cho phép ghi dữ liệu.

## 3. Quy trình Vận hành
### Khởi tạo Dự án
- Mặc định, mọi dự án mới khi tạo sẽ có trạng thái **An toàn (SAFE)**.
- Trạng thái này có thể được thay đổi bởi Admin hoặc nhân sự BCH được gán vào dự án.

## 4. Xử lý Dữ liệu Tài chính và Báo cáo
### Báo cáo (Reports)
- Hệ thống không tải toàn bộ báo cáo lúc khởi tạo. Thay vào đó, nó sử dụng query `limit(3)` và `startAfter` để tải 3 báo cáo mỗi lần người dùng nhấn "Hiển thị thêm".
- Các câu truy vấn báo cáo được gán thêm `where('project_id', 'in', ...)` để đảm bảo tính bảo mật và đúng đối tượng.

### Thanh toán (Payments)
- `paid_amount` (Thực thanh): Trong code, giá trị này được tính toán động (computed) để đảm bảo tính nhất quán:
  ```typescript
  paidAmount = completed_value - recovered_amount
  ```
- `other_payment` (Khoản trích chi khác): Được lưu trữ như một trường tham chiếu, không tham gia vào phép tính `paid_amount` để tránh làm sai lệch dòng tiền thực tế trả cho nhà thầu chính.

## 3. Router Guards
File `src/router/index.ts` chứa các logic bảo mật route:
- `adminOnly`: Chặn truy cập vào các trang dành riêng cho Admin (Phòng ban, Nhân viên, Chức danh).
- Chuyển hướng Dashboard: Nếu người dùng không có quyền quản lý tài chính, route `/` sẽ tự động chuyển hướng sang `/reports`.

## 4. Firebase Security Rules
Các quy tắc bảo mật trong `firestore.rules` cần được cập nhật tương ứng với logic RBAC này để đảm bảo an toàn dữ liệu từ phía server. Hiện tại, server-side rules tuân thủ:
- `get()` từ bảng `employees` để xác thực `system_role`.
- `get()` từ bảng `project_assignments` để xác thực quyền truy cập dự án.

## 5. Cơ Chế PWA & Tải Ứng Dụng (Progressive Web Application)

### A. Cấu Hình Ứng Dụng Độc Lập (`public/manifest.json`)
- Định nghĩa thông tin ứng dụng (`Bạch Đằng Invest ERP`), chế độ hiển thị `standalone` (ẩn toàn bộ thanh công cụ của trình duyệt để có giao diện app thuần túy), màu nền `#f8fafc`, màu chủ đạo `#2563eb`.
- Khai báo logo vector chất lượng sắc nét (`/icon.svg`) làm biểu tượng ứng dụng đa kích thước, hỗ trợ cả `maskable` icon để bo góc tự nhiên trên hệ điều hành Android.

### B. Service Worker Caching & Offline Fallback (`public/sw.js`)
- **Chiến lược Stale-While-Revalidate**: Khi người dùng chuyển đổi qua lại giữa các menu, Service Worker trả về tài nguyên đã lưu trong Cache ngay lập tức giúp tốc độ hiển thị đạt < 50ms. Đồng thời, ngầm tạo yêu cầu mạng để cập nhật lại Cache mới nhất.
- **Lọc Request thông minh**: Bỏ qua các API Firebase, REST Endpoint thời gian thực. Đối với các request điều hướng HTML bị ngắt mạng hoàn toàn, SW tự động fallback về `index.html` của trang Single-Page App để duy trì trải nghiệm liền mạch cho thiết bị.

### C. Quản lý Sự kiện Cài đặt (`src/stores/pwa.ts`)
- Lắng nghe sự kiện `beforeinstallprompt` từ Window, ngăn chặn popup mặc định của HĐH và lưu đối tượng `event` vào bộ nhớ Pinia State.
- Cung cấp phương thức `install()` nhằm kích hoạt hộp thoại tải xuống của Google Chrome/Edge/Samsung Internet khi người dùng bấm vào nút tương tác **"Tải App"**.
- Tích hợp bộ phát hiện `userAgent` cho iOS nhằm hiển thị hộp thoại hướng dẫn từng bước kích hoạt nút "Thêm vào MH chính" của trình duyệt Apple Safari.

## 6. Danh mục Vật tư Quy chuẩn chung

### A. Cấu Trúc Thực Thể (`material_items`)
Nằm trong tệp blueprint hệ thống, tài liệu `material_items` được quản lý độc lập để tạo luồng đồng bộ:
- `id` (string): ID duy nhất tự khởi tạo bởi Firestore DB.
- `name` (string): Tên nhãn đại lượng vật liệu quy ước (gạch chỉ đỏ, cát vàng hạt lớn, xi măng...).
- `code` (string): Mã nhận dạng nội bộ (SKU) viết hoa (DA-1X2, T-HP-D6...).
- `default_unit` (string): Đơn vị tính đại diện để tự động gán vào form (viên, bao, kg, khối (m3)...).
- `default_unit_price` (number): Đơn giá tham khảo hỗ trợ điền nhanh dự tính tài chính.
- `is_deleted` (number): Cờ xóa mềm (`0` hoặc `1`).

### B. Pinia State Cache & Thao Tác CRUD
- Được gán trực tiếp vào mảng `ENTITIES` trong `src/stores/app.ts`, tự động truy vấn toàn bộ dữ liệu khi khởi động hoặc nhấn refresh thủ công.
- Loại bỏ các vật tư bị đánh dấu xóa mềm nhờ mảng filter tập trung sau lần tải:
  ```typescript
  this.material_items = (this.material_items || []).filter(m => m.is_deleted !== 1).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  ```
- Sử dụng hàm tổng quát `appStore.saveEntity('material_items', 'CREATE' | 'UPDATE' | 'DELETE', payload)` giúp đồng bộ hóa tức thì với Firestore mà không sinh thêm các luồng xử lý riêng biệt.

### C. Cơ Chế Autofill Điền Liệu Nhanh
- Sử dụng liên kết liên khóa `selectedMaterialItemId` trong `MaterialsView.vue`. Khi người dùng tương tác lựa chọn, hệ thống lắng nghe sự kiện `@change="handleMaterialItemChange"` để trích lọc và gán các trường `material_name`, `unit`, `unit_price` tự động, tối ưu hóa triệt để hiệu suất máy chủ nhờ xử lý cục bộ trên Client-side.


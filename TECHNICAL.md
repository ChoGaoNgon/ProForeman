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

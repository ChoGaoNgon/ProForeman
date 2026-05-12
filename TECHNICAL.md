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
- `hasAnyPaymentAccess`: Kiểm tra xem người dùng có quyền quản lý tài chính ở BẤT KỲ dự án nào không. Được dùng để ẩn/hiện menu "Thanh toán".

## 2. Xử lý Dữ liệu Tài chính
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

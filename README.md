# ProForeman - Hệ Thống Quản Lý Dự Án Xây Dựng

## Tổng Quan
ProForeman là ứng dụng quản lý tiến độ, nhân sự và tài chính dành cho các đơn vị thi công xây dựng. Hệ thống cho phép theo dõi dòng tiền, quản lý hồ sơ thanh toán, báo cáo nhật ký hiện trường và phân quyền chi tiết theo từng cấp độ và dự án.

## Các Tính Năng Vừa Cập Nhật

### 1. Logic Tính Toán Tài Chính
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

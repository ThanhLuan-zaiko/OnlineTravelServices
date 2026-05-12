# ⟡ Cổng Nội Bộ Và Seed Role

Cổng nội bộ nằm tại `/internal`, được thiết kế cho nhân sự vận hành nội bộ. Giai đoạn hiện tại chỉ mở quyền `AdministrativeStaff`, tương ứng role kỹ thuật `administrative_staff`.

## ✦ Vai Trò Hiện Tại

`AdministrativeStaff` có quyền truy cập:

- Quản lý thông tin tour.
- Quản lý ảnh tour và ảnh đại diện.
- Quản lý lịch khởi hành.
- Quản lý lịch trình từng tour.
- Quản lý chương trình khuyến mãi.
- Xem thống kê doanh thu tour.
- Publish tour ra landing page public qua public projection và realtime event.

Các role dự kiến có thể mở rộng sau:

- `operations_staff`
- `statistics_staff`
- `admin`

Khi thêm role mới, nên mở rộng role guard và permission map thay vì bỏ qua kiểm tra quyền.

## ⬢ Route Nội Bộ

| Route | Mục đích |
| --- | --- |
| `/internal` | Dashboard tổng quan |
| `/internal/tours` | CRUD thông tin tour |
| `/internal/tours/[tourId]` | Quản lý lịch khởi hành và lịch trình của tour |
| `/internal/tours/media` | Quản lý ảnh tour |
| `/internal/schedules` | Trang chọn tour để quản lý lịch trình |
| `/internal/promotions` | CRUD chương trình khuyến mãi |
| `/internal/revenue` | Dashboard doanh thu |

## ◈ API Nội Bộ

Tất cả API dưới `/api/internal/*` yêu cầu session của role `administrative_staff`.

| API | Chức năng |
| --- | --- |
| `POST /api/internal/auth/login` | Đăng nhập staff |
| `POST /api/internal/auth/logout` | Đăng xuất staff |
| `GET /api/internal/auth/me` | Kiểm tra session staff |
| `GET/POST /api/internal/tours` | Danh sách và tạo tour |
| `GET/PATCH/DELETE /api/internal/tours/[tourId]` | Chi tiết, cập nhật, lưu trữ tour |
| `GET/POST /api/internal/tours/[tourId]/media` | Danh sách và upload ảnh tour |
| `PATCH /api/internal/tours/[tourId]/media/[mediaId]/cover` | Đặt ảnh đại diện tour |
| `DELETE /api/internal/tours/[tourId]/media/[mediaId]` | Xóa ảnh tour |
| `GET/POST /api/internal/tours/[tourId]/schedules` | Danh sách và tạo lịch khởi hành |
| `PATCH/DELETE /api/internal/tours/[tourId]/schedules/[scheduleId]` | Cập nhật hoặc xóa lịch khởi hành |
| `GET/POST /api/internal/tours/[tourId]/itinerary` | Danh sách và thêm mục lịch trình |
| `PATCH/DELETE /api/internal/tours/[tourId]/itinerary/[dayNumber]/[itemOrder]` | Cập nhật hoặc xóa mục lịch trình |
| `GET/POST /api/internal/promotions` | Danh sách và tạo khuyến mãi |
| `GET/PATCH/DELETE /api/internal/promotions/[promotionId]` | Chi tiết, cập nhật, lưu trữ khuyến mãi |
| `GET /api/internal/revenue` | Thống kê doanh thu |

## ◇ Seed AdministrativeStaff

Lệnh:

```powershell
bun run seed:administrative-staff
```

Biến môi trường cần có:

```env
ADMINISTRATIVE_STAFF_EMAIL=staff@example.com
ADMINISTRATIVE_STAFF_PASSWORD=replace-with-a-strong-password
ADMINISTRATIVE_STAFF_FULL_NAME=Administrative Staff
ADMINISTRATIVE_STAFF_PHONE=0900000000
```

Script seed ghi vào các bảng:

- `users_by_id`
- `users_by_email`
- `users_by_phone`
- `users_by_role`
- `staff_by_id`
- `staff_by_role`

Quyền mặc định trong `staff_by_id.permissions`:

- `tour:manage`
- `schedule:manage`
- `promotion:manage`
- `revenue:read`

## ✧ Lưu Ý Bảo Mật

- Không commit `.env.local`.
- Không hardcode email, mật khẩu hoặc `AUTH_SECRET` vào source code.
- Dùng `/internal/login` cho tài khoản staff.
- Customer role `customer` không thể truy cập `/internal`.
- Khi deploy, đưa biến `ADMINISTRATIVE_STAFF_*` vào secret manager hoặc chỉ set tạm trong lúc seed.

## ⬡ Ghi Chú Dữ Liệu

Tour và khuyến mãi đang dùng soft delete bằng trạng thái `archived`. Cách này phù hợp hơn với dữ liệu vận hành vì giữ được lịch sử tham chiếu và tránh mất dữ liệu liên quan booking, lịch trình hoặc thống kê.

Khi tour chuyển sang `published`, hoặc khi thông tin ảnh/lịch/destination liên quan thay đổi, API internal sẽ sync lại public projection. Realtime event được publish qua channel `public-tours` để các landing page có thể invalidate cache và hiển thị tour mới mà không cần đăng nhập.

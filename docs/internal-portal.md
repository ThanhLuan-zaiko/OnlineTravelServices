# ⟡ Cổng Nội Bộ Và Seed Role

Cổng nội bộ nằm tại `/internal`, được thiết kế cho nhân sự vận hành nội bộ. Hệ thống hiện có hai role staff:

- `administrative_staff`: quản trị dữ liệu tour, khách hàng, khuyến mãi, nhà cung cấp, audit.
- `operations_statistics_staff`: vận hành tour, kiểm soát lịch trình, gửi thông báo khách, thống kê, phân tích xu hướng và báo cáo.

## ✦ Vai Trò Hiện Tại

`AdministrativeStaff` có quyền truy cập:

- Quản lý thông tin tour.
- Quản lý ảnh tour và ảnh đại diện.
- Quản lý lịch khởi hành.
- Quản lý lịch trình từng tour.
- Quản lý chương trình khuyến mãi.
- Xem thống kê doanh thu tour.
- Publish tour ra landing page public qua public projection và realtime event.

`OperationsAndStatisticsStaff` có quyền truy cập:

- Cập nhật trạng thái vận hành tour: chuẩn bị, diễn ra, hoàn thành, hủy lịch.
- Ghi nhận số lượng khách thực tế.
- Kiểm soát lịch trình: đổi giờ khởi hành, đổi số khách, đóng/mở/hủy lịch, điều chỉnh giá tạm thời.
- Gửi thông báo cập nhật cho khách theo tour hoặc booking.
- Xem thống kê khách/địa điểm theo ngày, tuần, tháng, năm.
- Lưu ảnh chụp phân tích xu hướng.
- Tạo báo cáo vận hành và xuất CSV.

Các role có thể mở rộng sau:

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
| `/internal/operations` | Tổng quan Operations and Statistics |
| `/internal/operations/tours` | Cập nhật trạng thái vận hành tour |
| `/internal/operations/tours/status` | Tab cập nhật trạng thái tour |
| `/internal/operations/tours/events` | Tab lịch sử trạng thái vận hành |
| `/internal/operations/schedules` | Kiểm soát lịch trình, số khách và giá tạm thời |
| `/internal/operations/schedules/adjust` | Tab điều chỉnh lịch trình |
| `/internal/operations/schedules/calendar` | Tab xem lịch hiện tại |
| `/internal/operations/notifications` | Gửi thông báo cập nhật cho khách |
| `/internal/operations/notifications/compose` | Tab soạn thông báo |
| `/internal/operations/notifications/history` | Tab lịch sử thông báo |
| `/internal/operations/statistics` | Thống kê khách và địa điểm |
| `/internal/operations/statistics/visits` | Tab thống kê khách và địa điểm |
| `/internal/operations/statistics/performance` | Tab hiệu suất tour |
| `/internal/operations/trends` | Phân tích xu hướng |
| `/internal/operations/trends/analysis` | Tab ghi nhận phân tích mới |
| `/internal/operations/trends/snapshots` | Tab ảnh chụp xu hướng |
| `/internal/operations/reports` | Báo cáo vận hành và xuất CSV |
| `/internal/operations/reports/editor` | Tab tạo báo cáo |
| `/internal/operations/reports/list` | Tab danh sách báo cáo |

## ◈ API Nội Bộ

API dưới `/api/internal/*` yêu cầu session staff. API quản trị cũ yêu cầu `administrative_staff`; API `/api/internal/operations/*` yêu cầu `operations_statistics_staff`.

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
| `GET /api/internal/operations` | Dashboard tổng hợp Operations |
| `PATCH /api/internal/operations/tours/[tourId]/status` | Ghi nhận trạng thái vận hành tour |
| `GET /api/internal/operations/tours/[tourId]/events` | Lịch sử trạng thái vận hành tour |
| `PATCH /api/internal/operations/tours/[tourId]/schedules/[scheduleId]/adjust` | Điều chỉnh lịch khởi hành |
| `GET/POST /api/internal/operations/tours/[tourId]/notifications` | Danh sách và gửi thông báo cập nhật khách |
| `GET /api/internal/operations/stats/customer-visits` | Thống kê khách theo địa điểm/kỳ |
| `GET/POST /api/internal/operations/trends` | Danh sách và lưu phân tích xu hướng |
| `GET/POST /api/internal/operations/reports` | Danh sách và tạo báo cáo vận hành |

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

- `audit:read`
- `customer:manage`
- `notification:read`
- `suggested_tour:manage`
- `tour_approval:manage`
- `tour:manage`
- `schedule:manage`
- `promotion:manage`
- `revenue:read`

## ◇ Seed OperationsAndStatisticsStaff

Lệnh:

```powershell
bun run seed:operations-statistics-staff
```

Biến môi trường cần có:

```env
OPERATIONS_STATISTICS_STAFF_EMAIL=operations@example.com
OPERATIONS_STATISTICS_STAFF_PASSWORD=replace-with-a-strong-password
OPERATIONS_STATISTICS_STAFF_FULL_NAME=Operations Statistics Staff
OPERATIONS_STATISTICS_STAFF_PHONE=0900000001
```

Script seed ghi vào cùng các bảng `users_by_*` và `staff_*`, với role `operations_statistics_staff`.

Quyền mặc định:

- `operations:access`
- `tour:read`
- `tour:update_status`
- `tour_info:update`
- `schedule:manage`
- `customer_stats:read`
- `customer_trend:analyze`
- `destination_stats:read`
- `revenue:read`
- `report:manage`
- `notification:manage`
- `notification:read`
- `audit:read`

## ✧ Lưu Ý Bảo Mật

- Không commit `.env.local`.
- Không hardcode email, mật khẩu hoặc `AUTH_SECRET` vào source code.
- Dùng `/internal/login` cho tài khoản staff.
- Customer role `customer` không thể truy cập `/internal`.
- Khi deploy, đưa biến `ADMINISTRATIVE_STAFF_*` và `OPERATIONS_STATISTICS_STAFF_*` vào secret manager hoặc chỉ set tạm trong lúc seed.

## ⬡ Ghi Chú Dữ Liệu

Tour và khuyến mãi đang dùng soft delete bằng trạng thái `archived`. Cách này phù hợp hơn với dữ liệu vận hành vì giữ được lịch sử tham chiếu và tránh mất dữ liệu liên quan booking, lịch trình hoặc thống kê.

Khi tour chuyển sang `published`, hoặc khi thông tin ảnh/lịch/destination liên quan thay đổi, API internal sẽ sync lại public projection. Realtime event được publish qua channel `public-tours` để các landing page có thể invalidate cache và hiển thị tour mới mà không cần đăng nhập.

Operations and Statistics dùng các bảng projection riêng để đọc theo đúng query pattern:

- `tour_operation_events_by_tour` cho lịch sử trạng thái vận hành theo tour.
- `tour_update_notifications` và `customer_notifications_by_booking` cho thông báo cập nhật.
- `customer_visit_stats_by_period` cho thống kê khách/địa điểm theo kỳ.
- `trend_analysis_snapshots` cho phân tích xu hướng.
- `operation_reports_by_staff` và `operation_reports_by_period` cho báo cáo.

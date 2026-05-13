# ✦ Online Travel Services

Ứng dụng web dịch vụ du lịch trực tuyến, xây dựng bằng Next.js App Router, React TypeScript, Tailwind CSS v4 và ScyllaDB. Dự án có giao diện khách hàng, cổng nội bộ cho `AdministrativeStaff` và `OperationsAndStatisticsStaff`, cùng module Admin tổng seed-only tại `/internal/admin`.

## ⬢ Bức Tranh Tổng Quan

- ◇ **Customer-facing portal**: đăng ký, đăng nhập, hồ sơ tài khoản và giao diện light/dark responsive.
- ◇ **Public tour landing pages**: trang chủ, tour trong nước, tour nước ngoài, sự kiện, chi tiết tour, Google Map, tìm kiếm, cuộn vô tận và tab quốc gia cho tour nước ngoài.
- ◇ **Customer workflows**: đánh giá tour cần đăng nhập, lịch sử đặt tour và lịch sử thanh toán có tìm kiếm + phân trang rõ ràng.
- ◇ **Internal portal**: quản lý tour, doanh thu tour, lịch khởi hành, lịch trình, khuyến mãi và đồng bộ tour public cho `AdministrativeStaff`.
- ◇ **Operations and statistics portal**: role `operations_statistics_staff` quản lý trạng thái vận hành tour, kiểm soát lịch trình, gửi thông báo khách, xem thống kê, phân tích xu hướng và lập báo cáo tại `/internal/operations`.
- ◇ **Admin tổng**: tài khoản tạo bằng `seed:admin-super-staff`, có toàn bộ quyền của Administrative + Operations và là quyền duy nhất được truy cập staff/system management.
- ◇ **Auth phân quyền**: session cookie dùng chung, guard riêng cho customer và staff.
- ◇ **ScyllaDB query-oriented schema**: dữ liệu được lưu theo các bảng lookup/projection trong `schema.cql`.
- ◇ **Reusable realtime WebSocket**: Bun WebSocket server dùng channel để tái sử dụng cho nhiều tính năng; public tour hiện dùng channel `public-tours`.
- ◇ **Seed role an toàn**: tài khoản staff đầu tiên được tạo từ `.env.local`, không hardcode secret vào GitHub.

## ✧ Tech Stack

| Lớp | Công nghệ |
| --- | --- |
| Web app | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, React Icons, light/dark theme |
| Client data | TanStack Query, Axios, Zustand |
| Server data | ScyllaDB qua `cassandra-driver` |
| Auth | Argon2 password hash, signed HTTP-only session cookie |
| Runtime | Bun |

## ◈ Chạy Nhanh Sau Khi Clone

```powershell
git clone <repository-url>
cd onlinetravelservices
bun install
Copy-Item .env.example .env.local
```

Cập nhật `.env.local` theo môi trường máy bạn:

```env
SCYLLA_CONTACT_POINTS=127.0.0.1
SCYLLA_PORT=9042
SCYLLA_LOCAL_DATACENTER=datacenter1
SCYLLA_KEYSPACE=online_travel_services
AUTH_SECRET=replace-with-at-least-32-random-characters

ADMIN_BACKUP_DIR=./backups
ADMIN_SCYLLA_CONTAINER_NAME=scylladb
ADMIN_CQL_REQUEST_TIMEOUT_SECONDS=120

ADMIN_SUPER_STAFF_EMAIL=admin@example.com
ADMIN_SUPER_STAFF_PASSWORD=replace-with-a-strong-password
ADMIN_SUPER_STAFF_FULL_NAME=Admin Super Staff
ADMIN_SUPER_STAFF_PHONE=0900000099

ADMINISTRATIVE_STAFF_EMAIL=staff@example.com
ADMINISTRATIVE_STAFF_PASSWORD=replace-with-a-strong-password
ADMINISTRATIVE_STAFF_FULL_NAME=Administrative Staff
ADMINISTRATIVE_STAFF_PHONE=0900000000

OPERATIONS_STATISTICS_STAFF_EMAIL=operations@example.com
OPERATIONS_STATISTICS_STAFF_PASSWORD=replace-with-a-strong-password
OPERATIONS_STATISTICS_STAFF_FULL_NAME=Operations Statistics Staff
OPERATIONS_STATISTICS_STAFF_PHONE=0900000001

REALTIME_WS_PORT=3002
REALTIME_WS_PUBLISH_URL=http://127.0.0.1:3002/publish
NEXT_PUBLIC_REALTIME_WS_URL=ws://localhost:3002/realtime-updates
REALTIME_EVENTS_SECRET=
```

Khởi tạo database local:

```powershell
.\reset_database.ps1
```

Seed tài khoản Admin tổng:

```powershell
bun run seed:admin-super-staff
```

Seed tài khoản `AdministrativeStaff` đầu tiên:

```powershell
bun run seed:administrative-staff
```

Seed tài khoản `OperationsAndStatisticsStaff`:

```powershell
bun run seed:operations-statistics-staff
```

Chạy ứng dụng:

```powershell
bun run dev
```

Chạy realtime WebSocket server trong terminal riêng nếu muốn nhận cập nhật tour mới realtime:

```powershell
bun run dev:realtime-ws
```

Mở trình duyệt:

- ⟡ Customer portal: `http://localhost:3000`
- ⟡ Internal access: `http://localhost:3000/internal/login`
- ⟡ Domestic tours: `http://localhost:3000/tours/domestic`
- ⟡ International tours: `http://localhost:3000/tours/international`

## ⟡ Seed Role Staff

Script `bun run seed:admin-super-staff` đọc các biến `ADMIN_SUPER_STAFF_*`, tạo staff role `administrative_staff` với `staff_level = super_admin`, và cấp quyền superset:

- Toàn bộ quyền business của `seed:administrative-staff`.
- Toàn bộ quyền vận hành/thống kê của `seed:operations-statistics-staff`.
- Quyền cấp hệ thống chỉ dành cho Admin tổng: `staff:manage`, `system:manage`.

Script `bun run seed:administrative-staff` đọc các biến `ADMINISTRATIVE_STAFF_*` từ môi trường, hash mật khẩu bằng Argon2, rồi ghi đồng bộ vào:

- `users_by_id`
- `users_by_email`
- `users_by_phone`
- `users_by_role`
- `staff_by_id`
- `staff_by_role`

Script `bun run seed:operations-statistics-staff` dùng biến `OPERATIONS_STATISTICS_STAFF_*` và tạo role `operations_statistics_staff` với quyền mặc định cho `/internal/operations`.

Ranh giới bảo mật: `seed:administrative-staff` và `seed:operations-statistics-staff` không cấp `staff:manage` hoặc `system:manage`. `/internal/admin` và `/api/internal/admin/*` yêu cầu đúng hồ sơ `super_admin` được seed riêng.

Không commit `.env.local`. File này chứa email, mật khẩu seed và `AUTH_SECRET`, chỉ dùng cục bộ hoặc qua secret manager khi deploy.

## ◇ Cổng Nội Bộ `/internal`

Quyền hiện tại:

- `administrative_staff`: quản trị nghiệp vụ tour/khách hàng/khuyến mãi/doanh thu/audit, không có quyền hệ thống mặc định.
- `operations_statistics_staff`: vận hành tour, lịch trình, thông báo, thống kê, xu hướng và báo cáo.
- Admin tổng: vẫn dùng role `administrative_staff` để đăng nhập, nhưng phải có `staff_level = super_admin` và quyền `staff:manage`, `system:manage`.

Chức năng đã có:

- Quản lý thông tin tour.
- Quản lý lịch khởi hành và lịch trình từng tour.
- Quản lý chương trình khuyến mãi.
- Theo dõi doanh thu tour từ bảng thống kê.

Operations and Statistics module:

- `/internal/operations`: tổng quan và điều hướng module.
- `/internal/operations/tours`: cập nhật trạng thái vận hành tour; tab con `/status`, `/events`.
- `/internal/operations/schedules`: kiểm soát lịch trình; tab con `/adjust`, `/calendar`.
- `/internal/operations/notifications`: gửi thông báo cập nhật cho khách; tab con `/compose`, `/history`.
- `/internal/operations/statistics`: thống kê khách và địa điểm; tab con `/visits`, `/performance`.
- `/internal/operations/trends`: phân tích xu hướng; tab con `/analysis`, `/snapshots`.
- `/internal/operations/reports`: lưu báo cáo và xuất CSV; tab con `/editor`, `/list`.

Admin tổng module:

- `/internal/admin`: tổng quan quyền Admin tổng.
- `/internal/admin/staff/list`, `/create`, `/roles`, `/permissions`, `/activity`, `/disabled`.
- `/internal/admin/customers/list`, `/vip`, `/rewards`, `/feedback`, `/security`, `/violations`, `/segments`.
- `/internal/admin/revenue/dashboard`, `/forecast`, `/profitability`, `/compare`, `/taxes`, `/losses`.
- `/internal/admin/operations/*`: nhúng toàn bộ module Operations bằng URL riêng.
- `/internal/admin/system/tasks`, `/jobs`, `/backups`, `/restore`, `/maintenance`, `/health`.

Các route chính:

- `/internal`
- `/internal/tours`
- `/internal/tours/[tourId]`
- `/internal/tours/media`
- `/internal/schedules`
- `/internal/promotions`
- `/internal/revenue`

## ✦ Lệnh Thường Dùng

```powershell
bun run dev
bun run dev:realtime-ws
bun run build
bun run lint
bun run seed:admin-super-staff
bun run seed:administrative-staff
bun run seed:operations-statistics-staff
.\reset_database.ps1
```

## ⬡ Tài Liệu Chi Tiết

- [Hướng dẫn setup local](docs/setup-local.md)
- [Cổng nội bộ và seed role](docs/internal-portal.md)
- [Customer portal, tour public và lịch sử](docs/customer-portal.md)
- [Ghi chú database ScyllaDB](docs/database.md)

## ◈ Ghi Chú Phát Triển

- Dùng Bun cho package/script.
- Khi thay đổi data access, ưu tiên query pattern đã có trong `schema.cql`.
- Không dùng relational join hoặc lọc thủ công trên partition lớn.
- Giữ UI đồng bộ với Tailwind setup và theme controller hiện có.
- Khi thêm role mới như Operations Staff, Statistics Staff hoặc Admin tổng, mở rộng role guard thay vì bỏ qua kiểm tra quyền.

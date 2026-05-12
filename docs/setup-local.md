# ✦ Hướng Dẫn Setup Local

Tài liệu này dành cho người mới clone project và muốn chạy đầy đủ web app, database, customer portal và internal portal trên máy local.

## ⬢ Yêu Cầu

- Bun đã được cài đặt.
- Docker Desktop hoặc Docker qua WSL.
- PowerShell trên Windows.
- Node.js tương thích với Next.js nếu môi trường cần fallback.

## ◈ Clone Và Cài Dependency

```powershell
git clone <repository-url>
cd onlinetravelservices
bun install
```

## ⟡ Tạo File Môi Trường

```powershell
Copy-Item .env.example .env.local
```

Cập nhật `.env.local`:

```env
SCYLLA_CONTACT_POINTS=127.0.0.1
SCYLLA_PORT=9042
SCYLLA_LOCAL_DATACENTER=datacenter1
SCYLLA_KEYSPACE=online_travel_services
AUTH_SECRET=replace-with-at-least-32-random-characters

ADMINISTRATIVE_STAFF_EMAIL=staff@example.com
ADMINISTRATIVE_STAFF_PASSWORD=replace-with-a-strong-password
ADMINISTRATIVE_STAFF_FULL_NAME=Administrative Staff
ADMINISTRATIVE_STAFF_PHONE=0900000000

REALTIME_WS_PORT=3002
REALTIME_WS_PUBLISH_URL=http://127.0.0.1:3002/publish
NEXT_PUBLIC_REALTIME_WS_URL=ws://localhost:3002/realtime-updates
REALTIME_EVENTS_SECRET=
```

Không commit `.env.local`. File này chứa secret thật.

## ◇ Khởi Tạo ScyllaDB

Script `reset_database.ps1` sẽ tạo hoặc khởi động container `scylladb`, load `schema.cql`, rồi truncate dữ liệu các bảng project.

```powershell
.\reset_database.ps1
```

Nếu muốn drop keyspace trước khi load lại schema:

```powershell
.\reset_database.ps1 -DropKeyspaceFirst
```

## ✧ Seed AdministrativeStaff

Sau khi database đã sẵn sàng:

```powershell
bun run seed:administrative-staff
```

Script sẽ:

- Đọc thông tin staff từ `.env.local`.
- Hash mật khẩu bằng Argon2.
- Tạo user role `administrative_staff`.
- Tạo staff profile trong các bảng `staff_*`.
- Không ghi secret nào vào source code.

Nếu email đã tồn tại đúng role, script sẽ dừng nhẹ và báo tài khoản đã có. Nếu email hoặc số điện thoại thuộc role khác, script sẽ báo lỗi để tránh ghi đè nhầm dữ liệu.

## ⬡ Chạy App

```powershell
bun run dev
```

Realtime WebSocket chạy bằng Bun built-in WebSocket và nên chạy trong terminal riêng khi cần kiểm tra luồng cập nhật realtime:

```powershell
bun run dev:realtime-ws
```

Alias cũ vẫn còn để không làm gãy workflow trước đó:

```powershell
bun run dev:tour-ws
```

Mở:

- Customer portal: `http://localhost:3000`
- Internal access: `http://localhost:3000/internal/login`
- Realtime health: `http://localhost:3002/health`

## ✦ Realtime WebSocket Local

Server realtime dùng channel để tái sử dụng cho nhiều tính năng:

- WebSocket endpoint dùng chung: `ws://localhost:3002/realtime-updates?channel=<channel>`
- Publish endpoint: `POST http://127.0.0.1:3002/publish`
- Payload publish chuẩn: `{ "channel": "public-tours", "event": { ... } }`
- Channel public tour hiện tại: `public-tours`

Các biến `PUBLIC_TOUR_WS_*` cũ vẫn được hỗ trợ làm fallback, nhưng code mới nên dùng biến `REALTIME_*`.

## ◈ Kiểm Tra Trước Khi Commit

```powershell
bun run lint
bun run build
```

Hai lệnh này nên pass trước khi tạo pull request hoặc push nhánh chính.

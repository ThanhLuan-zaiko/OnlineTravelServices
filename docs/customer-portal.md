# ◇ Customer Portal, Tour Public Và Lịch Sử

Tài liệu này mô tả phần trải nghiệm khách hàng và các route public/customer-authenticated hiện có.

## ✦ Route Public Không Cần Đăng Nhập

| Route | Mục đích |
| --- | --- |
| `/` | Landing page tour tổng hợp |
| `/events` | Trang sự kiện, ưu đãi và lịch khởi hành nổi bật |
| `/tours/domestic` | Tour trong nước |
| `/tours/international` | Tour nước ngoài |
| `/tours/[slug]` | Chi tiết tour |

Các trang danh sách tour có:

- Thanh tìm kiếm thông tin.
- Cuộn vô tận bằng cursor API.
- Google Map theo `latitude`/`longitude` từ destination.
- Realtime update qua channel `public-tours`.
- Speculation Rules API để prefetch các trang chi tiết tour có khả năng được mở.

Trang `/tours/international` có tab quốc gia lấy từ database qua `GET /api/tours/countries?feed=international`. Tab này đọc từ `public_tour_countries_by_feed`, không hardcode danh sách quốc gia.

## ⬢ Route Cần Customer Session

| Route | Mục đích |
| --- | --- |
| `/account` | Hồ sơ tài khoản |
| `/bookings` | Lịch sử đặt tour |
| `/payments` | Lịch sử thanh toán |
| `/suggested-tours/new` | Tạo yêu cầu tour đề xuất |

Các route trên dùng customer session cookie. Nếu chưa đăng nhập, server redirect về `/login?next=...`.

`/bookings` và `/payments` không dùng cuộn vô tận. Hai trang này dùng:

- Thanh tìm kiếm.
- Cursor pagination.
- `components/ui/pagination-control.tsx`.

`/suggested-tours/new` không dùng Speculation Rules API và chỉ render sau khi session hợp lệ.

## ◈ Public API

| API | Auth | Chức năng |
| --- | --- | --- |
| `GET /api/tours?feed=all|domestic|international&cursor=&limit=&country=` | Không | Danh sách tour public |
| `GET /api/tours/countries?feed=international` | Không | Danh sách quốc gia cho tab tour nước ngoài |
| `GET /api/tours/[slugOrId]` | Không | Chi tiết tour public |
| `GET /api/tours/[slugOrId]/reviews` | Không | Danh sách review tour |
| `POST /api/tours/[slugOrId]/reviews` | Customer | Gửi đánh giá tour |
| `GET /api/customer/bookings?cursor=&limit=&q=` | Customer | Lịch sử đặt tour |
| `GET /api/customer/payments?cursor=&limit=&q=` | Customer | Lịch sử thanh toán |

`POST /api/tours/[slugOrId]/reviews` có same-origin check và yêu cầu customer session. Khách chưa đăng nhập chỉ được xem review, không được gửi review.

## ⟡ Realtime

Realtime WebSocket server chạy bằng Bun built-in WebSocket:

```powershell
bun run dev:realtime-ws
```

Endpoint dùng chung:

```text
ws://localhost:3002/realtime-updates?channel=<channel>
```

Channel public tour:

```text
public-tours
```

Public tour client dùng `hooks/use-realtime-channel.ts` thông qua wrapper `components/customer-facing/use-public-tour-updates.ts`. Khi nhận event đúng feed, client invalidate các query:

- `["public", "tours"]`
- `["public", "tour-countries"]`

Alias cũ `bun run dev:tour-ws` vẫn còn, nhưng code mới nên dùng `dev:realtime-ws`.

## ✧ Speculation Rules Policy

Được dùng:

- Landing page public.
- Trang sự kiện.
- Lịch sử đặt tour chỉ prefetch link chi tiết tour liên quan.

Không dùng:

- Lịch sử thanh toán.
- Tạo tour đề xuất.
- Các route yêu cầu thao tác nhạy cảm hoặc cần kiểm tra session rõ ràng trước khi render.

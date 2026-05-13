# ◈ Ghi Chú Database ScyllaDB

Project dùng ScyllaDB với schema chính trong `schema.cql`. Thiết kế dữ liệu ưu tiên query pattern rõ ràng thay vì mô hình quan hệ truyền thống.

## ✦ Keyspace

```cql
online_travel_services
```

Biến môi trường tương ứng:

```env
SCYLLA_KEYSPACE=online_travel_services
```

## ⬢ Nhóm Bảng Chính

| Nhóm | Bảng tiêu biểu |
| --- | --- |
| Auth user | `users_by_id`, `users_by_email`, `users_by_phone`, `users_by_role`, `user_sessions` |
| Staff | `staff_by_id`, `staff_by_role`, `staff_activity_by_day` |
| Customer | `customers_by_id`, `customer_history_by_user`, `customer_preferences` |
| Tour | `tours_by_id`, `tours_by_status`, `tours_by_destination`, `tours_by_category` |
| Public tour feed | `public_tours_by_feed`, `public_tours_by_country`, `public_tour_countries_by_feed`, `public_tour_projection_keys_by_tour` |
| Lịch trình | `tour_schedules_by_tour`, `tour_itinerary_items` |
| Booking và payment | `bookings_by_user`, `payments_by_user`, `payments_by_booking` |
| Review | `reviews_by_tour`, `reviews_by_user`, `tour_rating_summary` |
| Khuyến mãi | `promotions_by_id`, `promotions_by_status`, `promotions_by_customer_tier` |
| Doanh thu | `revenue_stats_by_day`, `revenue_stats_by_month`, `tour_performance_by_month` |
| Vận hành và thống kê | `tour_operation_events_by_tour`, `tour_update_notifications`, `customer_visit_stats_by_period`, `trend_analysis_snapshots`, `operation_reports_by_staff`, `operation_reports_by_period`, `customer_notifications_by_booking` |

## ⟡ Nguyên Tắc Khi Viết Data Access

- Query theo partition key đã thiết kế trong `schema.cql`.
- Không tạo relational join trong application code.
- Không scan bảng lớn rồi filter thủ công.
- Khi có bảng projection, ghi đồng bộ projection cần thiết trong cùng workflow mutation.
- Với public landing pages, đọc từ projection public thay vì đọc trực tiếp toàn bộ bảng internal rồi lọc trên client.
- Với thao tác xóa vận hành, ưu tiên soft delete bằng `status = archived` nếu dữ liệu có thể được tham chiếu bởi booking, lịch trình hoặc báo cáo.

## ◇ Reset Local Database

```powershell
.\reset_database.ps1
```

Script sẽ:

- Tạo container ScyllaDB nếu chưa có.
- Chờ CQL service sẵn sàng.
- Copy và load `schema.cql`.
- Truncate các bảng project để có database sạch.

Nếu cần reset mạnh:

```powershell
.\reset_database.ps1 -DropKeyspaceFirst
```

## ✧ Internal Portal Và Projection

Các mutation nội bộ hiện ghi vào bảng chính và bảng lookup:

- Tour:
  - `tours_by_id`
  - `tours_by_status`
  - `tours_by_destination`
  - `tours_by_category`
- Khuyến mãi:
  - `promotions_by_id`
  - `promotions_by_status`
  - `promotions_by_customer_tier`
- Lịch khởi hành:
  - `tour_schedules_by_tour`
- Lịch trình:
  - `tour_itinerary_items`

Do một số bảng lookup dùng clustering key dạng thời điểm, danh sách nội bộ đọc lookup để lấy candidate id, sau đó xác thực trạng thái hiện tại từ bảng chính. Cách này tránh hiển thị bản ghi projection cũ khi tour hoặc khuyến mãi đổi trạng thái.

## ✧ Operations And Statistics Projection

Role `operations_statistics_staff` dùng các bảng query-oriented riêng cho nghiệp vụ vận hành:

- `tour_operation_events_by_tour`: ghi nhận trạng thái vận hành tour như chuẩn bị, diễn ra, hoàn thành, hủy lịch và số lượng khách thực tế.
- `tour_update_notifications`: lưu thông báo cập nhật tour/lịch gửi cho khách theo partition `tour_id`.
- `customer_notifications_by_booking`: projection tra cứu thông báo theo `booking_id` khi thông báo gắn với booking cụ thể.
- `customer_visit_stats_by_period`: thống kê khách và địa điểm theo `period_type` gồm ngày, tuần, tháng, năm.
- `trend_analysis_snapshots`: lưu ảnh chụp phân tích xu hướng khách, hiệu quả địa điểm, dự đoán nhu cầu và khuyến mãi.
- `operation_reports_by_staff`: danh sách báo cáo do một staff tạo.
- `operation_reports_by_period`: danh sách báo cáo theo kỳ báo cáo để trang reports đọc không cần scan rộng.

Các mutation Operations ghi audit log qua `audit_log_by_actor` và `audit_log_by_entity`.

## ⟡ Public Tour Projection

Public tour feed phục vụ các trang không cần đăng nhập:

- `/`
- `/events`
- `/tours/domestic`
- `/tours/international`
- `/tours/[slug]`

Các projection chính:

- `public_tours_by_feed`: feed `all`, `domestic`, `international`, sắp xếp theo `published_at DESC`.
- `public_tours_by_country`: feed + `country_key`, dùng cho tab quốc gia ở trang tour nước ngoài.
- `public_tour_countries_by_feed`: danh sách quốc gia hiện có trong feed, lấy từ dữ liệu destination đã publish.
- `public_tour_projection_keys_by_tour`: lưu khóa projection để xóa/update chính xác khi tour đổi trạng thái, đổi destination hoặc bị archive.

Luồng sync:

- Khi staff tạo/cập nhật/publish/archive tour, route internal gọi `syncPublicTourProjection`.
- Khi đổi ảnh cover, lịch khởi hành hoặc lịch trình tour, projection public cũng được sync lại.
- Khi destination đổi country/tọa độ/trạng thái, các tour thuộc destination đó được sync lại qua `syncPublicToursForDestination`.
- Chỉ tour `published` + destination `published` được xuất hiện ở public projection.

Phân loại trong nước/nước ngoài dựa trên `destinations_by_id.country`:

- `Việt Nam`, `Vietnam`, `VN` -> `domestic`
- Các giá trị khác -> `international`

## ◇ Review Và Rating

Đánh giá tour dùng các bảng:

- `reviews_by_tour`: đọc danh sách review theo tour.
- `reviews_by_user`: lịch sử review theo customer.
- `tour_rating_summary`: tổng hợp số lượng review theo bucket 1-5 sao.

`POST /api/tours/[slugOrId]/reviews` yêu cầu customer session. Sau khi ghi review, hệ thống tính lại `average_rating` và `rating_count` cho tour, sau đó sync public projection để landing page nhận rating mới.

## ⬡ Booking Và Payment History

Các trang customer-authenticated:

- `/bookings`: đọc `bookings_by_user`, có tìm kiếm và phân trang bằng cursor.
- `/payments`: đọc `payments_by_user`, có tìm kiếm và phân trang bằng cursor.

Hai trang này không dùng infinite scroll. API trả `nextCursor` để UI lưu cursor theo từng trang và dùng `PaginationControl`.

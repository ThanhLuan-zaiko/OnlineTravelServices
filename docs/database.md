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
| Lịch trình | `tour_schedules_by_tour`, `tour_itinerary_items` |
| Khuyến mãi | `promotions_by_id`, `promotions_by_status`, `promotions_by_customer_tier` |
| Doanh thu | `revenue_stats_by_day`, `revenue_stats_by_month`, `tour_performance_by_month` |

## ⟡ Nguyên Tắc Khi Viết Data Access

- Query theo partition key đã thiết kế trong `schema.cql`.
- Không tạo relational join trong application code.
- Không scan bảng lớn rồi filter thủ công.
- Khi có bảng projection, ghi đồng bộ projection cần thiết trong cùng workflow mutation.
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

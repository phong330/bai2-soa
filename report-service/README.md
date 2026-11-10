# Bài Thực Hành 5 - Dịch Vụ Báo Cáo Thống Kê (Reporting Service - SOA)

Hệ thống dịch vụ báo cáo thống kê hoạt động độc lập theo kiến trúc Hướng dịch vụ (SOA - Service-Oriented Architecture), kết nối với Dịch vụ Quản lý Sản phẩm (Product Service), Dịch vụ Quản lý Đơn hàng (Order Service) và Dịch vụ Xác thực (Auth Service).

---

## 1. Thông Tin Kiến Trúc Hệ Thống (SOA 4 Dịch Vụ)

| Dịch vụ | Cổng | Cơ sở dữ liệu | Vai trò chính trong hệ thống SOA |
| :--- | :---: | :--- | :--- |
| **Auth Service** | `3000` | In-Memory / auth_db | Xác thực đăng nhập, cấp phát JWT Bearer Token |
| **Product Service** | `3001` | `ProductDB` (SQL Server) | Quản lý sản phẩm, giá bán, số lượng tồn kho |
| **Order Service** | `3002` | `OrderDB` (SQL Server) | Quản lý đơn hàng, kiểm tra & trừ/hoàn tồn kho qua Product Service |
| **Report Service** | `3003` | `ReportDB` (SQL Server) | **Thống kê hàng tồn, hàng bán được, doanh thu, chi phí, lợi nhuận theo sản phẩm & đơn hàng** |

---

## 2. Công Thức & Chỉ Số Nghiệp Vụ

1. **Hàng tồn kho (Inventory):** Tổng số lượng sản phẩm hiện còn trong kho (lấy realtime từ `Product Service`).
2. **Hàng bán được (Sold):** Tổng số lượng sản phẩm đã bán thành công từ các đơn hàng hợp lệ (loại trừ các đơn `CANCELLED`).
3. **Doanh thu (Revenue):** Tổng số tiền thu được từ các đơn hàng hợp lệ.
4. **Chi phí (Cost / COGS):** Tổng giá vốn của các sản phẩm đã bán được (`Số lượng bán x Giá vốn`). Giá vốn được quản lý độc lập tại `ReportDB` trong bảng `product_costs` (mặc định = 70% giá bán nếu chưa cấu hình).
5. **Lợi nhuận (Profit):** `Lợi nhuận = Doanh thu - Chi phí`.
6. **Tỷ suất lợi nhuận (Profit Margin):** `(Lợi nhuận / Doanh thu) x 100%`.

---

## 3. Danh Sách API Dịch Vụ Báo Cáo (`report-service`)

Base URL: `http://localhost:3003/reports`

Tất cả các endpoint đều yêu cầu Header:
```http
Authorization: Bearer <token>
```

| Phương thức | Đường dẫn | Chức năng chi tiết |
| :--- | :--- | :--- |
| `GET` | `/reports/overview` | Thống kê tổng quan: tổng tồn kho, tổng đã bán, doanh thu, chi phí, lợi nhuận |
| `GET` | `/reports/products` | **Báo cáo chi tiết theo sản phẩm**: tồn kho, số lượng đã bán, doanh thu, chi phí, lợi nhuận từng món |
| `GET` | `/reports/orders` | **Báo cáo chi tiết theo đơn hàng**: doanh thu, chi phí vốn, lợi nhuận từng đơn hàng (hỗ trợ lọc `?status=...`) |
| `POST` | `/reports/generate` | Tạo và lưu snapshot kỳ báo cáo vào CSDL `ReportDB` |
| `GET` | `/reports/history` | Xem lịch sử các kỳ báo cáo đã lưu trong `ReportDB` |
| `GET` | `/reports/history/:id` | Xem chi tiết 1 kỳ báo cáo lịch sử (kèm sản phẩm & đơn hàng) |
| `GET` | `/reports/costs` | Xem bảng giá vốn sản phẩm đang áp dụng |
| `PUT` | `/reports/costs/:productId` | Cập nhật giá vốn cho sản phẩm cụ thể |

---

## 4. Hướng Dẫn Khởi Chạy

### Bước 1: Khởi tạo CSDL ReportDB trên SQL Server
Thực thi file [`../database/ReportDB.sql`](../database/ReportDB.sql) bằng SQL Server Management Studio (SSMS) hoặc lệnh:
```powershell
sqlcmd -S localhost -U sa -P 123456 -C -i database\ReportDB.sql
```

### Bước 2: Khởi chạy Report Service (Cổng 3003)
```powershell
cd report-service
npm run start
```

### Bước 3: Hoặc dùng tiện ích khởi động 1-Click
Tại thư mục gốc `d:\JS\bai2`, nhấp đúp file [`start-all.bat`](../start-all.bat) để tự động bật cả 4 dịch vụ (`Auth:3000`, `Product:3001`, `Order:3002`, `Report:3003`).

---

## 5. Ví Dụ Request Mẫu

### 5.1. Xem thống kê tổng quan
```bash
curl -X GET http://localhost:3003/reports/overview \
  -H "Authorization: Bearer <token>"
```

### 5.2. Báo cáo theo sản phẩm
```bash
curl -X GET http://localhost:3003/reports/products \
  -H "Authorization: Bearer <token>"
```

### 5.3. Báo cáo theo đơn hàng
```bash
curl -X GET http://localhost:3003/reports/orders \
  -H "Authorization: Bearer <token>"
```

### 5.4. Lưu kỳ báo cáo vào CSDL ReportDB
```bash
curl -X POST http://localhost:3003/reports/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Báo cáo tài chính quý 4" }'
```


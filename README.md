# HỆ THỐNG KIẾN TRÚC HƯỚNG DỊCH VỤ (SOA)

## 1. Cấu Trúc Hệ Thống (4 Dịch Vụ)

| Dịch vụ | Cổng (Port) | Cơ sở dữ liệu | Chức năng chính |
| :--- | :---: | :--- | :--- |
| **Auth Service** | `3000` | In-Memory | Xác thực đăng nhập, cấp JWT Token (Bài 2) |
| **Product Service** | `3001` | `ProductDB` | Quản lý sản phẩm và tồn kho (Bài 3) |
| **Order Service** | `3002` | `OrderDB` | Quản lý đơn hàng, tự động trừ/hoàn tồn kho (Bài 4) |
| **Report Service** | `3003` | `ReportDB` | Thống kê tồn kho, hàng bán, doanh thu, chi phí, lợi nhuận (Bài 5) |

---

## 2. Cấu Trúc Thư Mục Dự Án

```text
bai2/
├── database/            # 3 script CSDL riêng biệt: ProductDB.sql, OrderDB.sql, ReportDB.sql
├── product-service/     # Dịch vụ Quản lý Sản phẩm (Port 3001)
├── order-service/       # Dịch vụ Quản lý Đơn hàng (Port 3002)
├── report-service/      # Dịch vụ Báo cáo Thống kê (Port 3003)
├── src/                 # Dịch vụ Xác thực Auth (Port 3000)
├── dashboard.html       # Giao diện Web thao tác cho cả 4 dịch vụ
└── start-all.bat        # File script hỗ trợ bật nhanh các dịch vụ
```

---

## 3. Cách Khởi Chạy

### Bước 1: Chạy Database
Mở SQL Server Management Studio (SSMS), mở và thực thi lần lượt 3 file trong thư mục `database/`:
* `database/ProductDB.sql`
* `database/OrderDB.sql`
* `database/ReportDB.sql`

### Bước 2: Khởi chạy 4 dịch vụ
Mở 4 cửa sổ Terminal riêng biệt tại thư mục dự án và chạy các lệnh sau:

* **Terminal 1 (Auth Service - Port 3000):**
  ```bash
  npm run start
  ```

* **Terminal 2 (Product Service - Port 3001):**
  ```bash
  cd product-service
  npm run start
  ```

* **Terminal 3 (Order Service - Port 3002):**
  ```bash
  cd order-service
  npm run start
  ```

* **Terminal 4 (Report Service - Port 3003):**
  ```bash
  cd report-service
  npm run start
  ```

### Bước 3: Sử dụng hệ thống
Mở file `dashboard.html` trên trình duyệt web hoặc gọi API trực tiếp theo các cổng tương ứng (`:3000`, `:3001`, `:3002`, `:3003`).

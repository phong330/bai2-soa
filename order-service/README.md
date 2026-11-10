# Bài Thực Hành 4 - Dịch Vụ Quản Lý Đơn Hàng (Order Management Service - SOA)

Hệ thống dịch vụ quản lý đơn hàng hoạt động độc lập theo kiến trúc Hướng dịch vụ (SOA - Service-Oriented Architecture), kết nối với Dịch vụ Quản lý Sản phẩm (Product Service) và Dịch vụ Xác thực (Auth Service).

---

## 1. Thông Tin Kiến Trúc Hệ Thống (SOA)

| Dịch vụ | Cổng | Cơ sở dữ liệu | Vai trò chính |
| :--- | :--- | :--- | :--- |
| **Auth Service** | `3000` | In-Memory / auth_db | Xác thực đăng nhập, cấp phát JWT Bearer Token |
| **Product Service** | `3001` | `ProductDB` (SQL Server) | Quản lý sản phẩm, thông tin giá và tồn kho |
| **Order Service** | `3002` | `OrderDB` (SQL Server) | Quản lý đơn hàng, kiểm tra & trừ/hoàn tồn kho qua Product Service |

---

## 2. Hướng Dẫn Cài Đặt & Khởi Chạy

### Bước 1: Khởi tạo Cơ sở dữ liệu SQL Server
Mở công cụ SQL Server Management Studio (SSMS) hoặc dùng `sqlcmd` thực thi 2 file kịch bản SQL theo thứ tự:
1. [`../database/ProductDB.sql`](../database/ProductDB.sql) (tạo CSDL `ProductDB` và 10 sản phẩm mẫu)
2. [`../database/OrderDB.sql`](../database/OrderDB.sql) (tạo CSDL `OrderDB`, bảng `orders`, `order_items`, trigger `trg_orders_updated_at` và 3 đơn hàng mẫu)

### Bước 2: Cấu hình kết nối SQL Server (nếu cần)
Kiểm tra file `local-config.json` tại thư mục gốc của từng dịch vụ:
```json
{
  "host": "localhost",
  "port": 1433,
  "username": "sa",
  "password": "your_password",
  "database": "OrderDB"
}
```

### Bước 3: Khởi chạy các dịch vụ (Mở 3 terminal riêng biệt)

**Terminal 1 - Khởi chạy Auth Service (Cổng 3000):**
```bash
# Tại thư mục gốc d:\JS\bai2
npm run start
```

**Terminal 2 - Khởi chạy Product Service (Cổng 3001):**
```bash
cd product-service
npm run start
```

**Terminal 3 - Khởi chạy Order Service (Cổng 3002):**
```bash
cd order-service
npm run start
```

---

## 3. Xác Thực (Authentication)

Tất cả các endpoint của `order-service` và `product-service` đều yêu cầu Bearer JWT Token ở Header:
```http
Authorization: Bearer <access_token>
```

### Lấy Token đăng nhập:
- **Phương thức:** `POST`
- **URL:** `http://localhost:3000/login`
- **Body:**
```json
{
  "userName": "admin",
  "password": "MTIzNDU2"
}
```
- **Response:**
```json
{
  "message": "Đăng nhập thành công",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 4. Danh Sách API Dịch Vụ Đơn Hàng (`order-service`)

Base URL: `http://localhost:3002/orders`

| Phương thức | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| `GET` | `/orders` | Lấy danh sách tất cả các đơn hàng (kèm sản phẩm) |
| `GET` | `/orders/:id` | Lấy thông tin chi tiết một đơn hàng theo ID |
| `POST` | `/orders` | Tạo mới đơn hàng (kiểm tra tồn kho & tự động trừ số lượng sản phẩm ở Product Service) |
| `PATCH` | `/orders/:id/status` | Cập nhật trạng thái đơn hàng (`PENDING`, `CONFIRMED`, `SHIPPED`, `COMPLETED`, `CANCELLED`) |
| `PUT` | `/orders/:id/status` | Cập nhật trạng thái đơn hàng (tương đương PATCH) |
| `PUT` | `/orders/:id` | Cập nhật toàn bộ thông tin đơn hàng (khách hàng, trạng thái, danh sách sản phẩm) |
| `DELETE` | `/orders/:id` | Xóa đơn hàng (tự động hoàn trả tồn kho về Product Service) |
| `POST` | `/orders/:id/items` | Thêm sản phẩm vào đơn hàng (kiểm tra & trừ tồn kho) |
| `PUT` | `/orders/:id/items/:itemId` | Cập nhật số lượng sản phẩm trong đơn hàng (đồng bộ tăng/giảm kho) |
| `DELETE` | `/orders/:id/items/:itemId` | Xóa một sản phẩm ra khỏi đơn hàng (hoàn lại kho) |

---

## 5. Chi Tiết Các Request Mẫu & Kịch Bản Kiểm Thử

### 5.1. Xem danh sách đơn hàng
```bash
curl -X GET http://localhost:3002/orders \
  -H "Authorization: Bearer <token>"
```

### 5.2. Xem chi tiết đơn hàng theo ID
```bash
curl -X GET http://localhost:3002/orders/1 \
  -H "Authorization: Bearer <token>"
```

### 5.3. Tạo đơn hàng mới
Khi tạo đơn hàng:
- `Order Service` tự động gửi HTTP Request sang `Product Service` để kiểm tra sự tồn tại của sản phẩm và đối soát số lượng tồn kho (`quantity`).
- Nếu số lượng yêu cầu vượt quá tồn kho, trả về lỗi `400 Bad Request` với thông báo tiếng Việt rõ ràng.
- Nếu đủ hàng, tự động lấy đơn giá hiện tại từ `Product Service`, lưu tên sản phẩm, trừ số lượng tồn kho tương ứng trong `Product Service`, tính `totalAmount` và lưu vào `OrderDB`.

```bash
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Nguyen Van A",
    "items": [
      { "productId": 1, "quantity": 1 },
      { "productId": 3, "quantity": 2 }
    ]
  }'
```

**Response thành công:**
```json
{
  "id": 4,
  "customerName": "Nguyen Van A",
  "status": "PENDING",
  "totalAmount": 15500000,
  "items": [
    {
      "id": 7,
      "productId": 1,
      "productName": "Laptop Dell",
      "quantity": 1,
      "unitPrice": 15000000
    },
    {
      "id": 8,
      "productId": 3,
      "productName": "Chuot Logitech",
      "quantity": 2,
      "unitPrice": 250000
    }
  ],
  "createdAt": "2026-11-09T14:30:00.000Z",
  "updatedAt": "2026-11-09T14:30:00.000Z"
}
```

### 5.4. Cập nhật trạng thái đơn hàng
Hỗ trợ các trạng thái: `PENDING`, `CONFIRMED`, `SHIPPED`, `COMPLETED`, `CANCELLED`.
Đặc biệt: Khi chuyển sang `CANCELLED`, hệ thống tự động hoàn lại số lượng sản phẩm vào kho của `Product Service`.
```bash
curl -X PATCH http://localhost:3002/orders/4/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

### 5.5. Thêm sản phẩm vào đơn hàng có sẵn
```bash
curl -X POST http://localhost:3002/orders/4/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 4,
    "quantity": 1
  }'
```

### 5.6. Cập nhật số lượng sản phẩm trong đơn hàng
```bash
curl -X PUT http://localhost:3002/orders/4/items/8 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

### 5.7. Xóa sản phẩm khỏi đơn hàng
```bash
curl -X DELETE http://localhost:3002/orders/4/items/8 \
  -H "Authorization: Bearer <token>"
```

### 5.8. Xóa đơn hàng
```bash
curl -X DELETE http://localhost:3002/orders/4 \
  -H "Authorization: Bearer <token>"
```

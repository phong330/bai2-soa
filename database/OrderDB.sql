-- =====================================================================
-- BÀI THỰC HÀNH SỐ 4: DỊCH VỤ QUẢN LÝ ĐƠN HÀNG (ORDER MANAGEMENT - SOA)
-- HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU: MICROSOFT SQL SERVER
-- NGUYÊN TẮC SOA: Dịch vụ hoạt động độc lập trên CSDL riêng (OrderDB)
-- =====================================================================

-- BƯỚC 1: TẠO CƠ SỞ DỮ LIỆU OrderDB (NẾU CHƯA CÓ)
IF DB_ID(N'OrderDB') IS NULL
BEGIN
    PRINT N'==> Đang khởi tạo CSDL OrderDB...';
    CREATE DATABASE OrderDB;
END
GO

-- BƯỚC 2: SỬ DỤNG CƠ SỞ DỮ LIỆU OrderDB
USE OrderDB;
GO

-- =====================================================================
-- BƯỚC 3: TẠO BẢNG orders (QUẢN LÝ THÔNG TIN CHUNG CỦA ĐƠN HÀNG)
-- Trạng thái đơn gồm: PENDING, CONFIRMED, SHIPPED, COMPLETED, CANCELLED
-- =====================================================================
IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.orders (
        id              INT IDENTITY(1,1) PRIMARY KEY,  -- Mã đơn hàng (tự tăng)
        customer_name   VARCHAR(255) NOT NULL,          -- Tên khách hàng
        status          VARCHAR(30) NOT NULL            -- Trạng thái đơn hàng
            DEFAULT 'PENDING'
            CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED')),
        total_amount    DECIMAL(12,2) NOT NULL          -- Tổng giá trị đơn hàng (VNĐ)
            DEFAULT 0
            CHECK (total_amount >= 0),
        created_at      DATETIME2 NOT NULL              -- Ngày giờ tạo đơn
            DEFAULT SYSDATETIME(),
        updated_at      DATETIME2 NOT NULL              -- Ngày giờ cập nhật cuối
            DEFAULT SYSDATETIME()
    );
    PRINT N'==> Đã tạo bảng dbo.orders thành công.';
END
GO

-- =====================================================================
-- BƯỚC 4: TẠO BẢNG order_items (CHI TIẾT CÁC MẶT HÀNG TRONG ĐƠN)
-- Khóa ngoại: order_id liên kết với bảng orders(id)
-- =====================================================================
IF OBJECT_ID(N'dbo.order_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.order_items (
        id              INT IDENTITY(1,1) PRIMARY KEY,  -- Mã dòng chi tiết (tự tăng)
        order_id        INT NOT NULL,                   -- Mã đơn hàng (Khóa ngoại)
        product_id      INT NOT NULL,                   -- Mã sản phẩm (tham chiếu Product Service)
        product_name    VARCHAR(255) NULL,              -- Tên sản phẩm tại thời điểm mua
        quantity        INT NOT NULL CHECK (quantity > 0),    -- Số lượng đặt mua (> 0)
        unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0), -- Đơn giá tại thời điểm mua
        CONSTRAINT FK_order_items_orders FOREIGN KEY (order_id)
            REFERENCES dbo.orders(id) ON DELETE CASCADE
    );
    PRINT N'==> Đã tạo bảng dbo.order_items thành công.';
END
ELSE
BEGIN
    -- Đảm bảo có cột product_name nếu bảng đã tồn tại từ phiên bản cũ
    IF COL_LENGTH('dbo.order_items', 'product_name') IS NULL
    BEGIN
        ALTER TABLE dbo.order_items ADD product_name VARCHAR(255) NULL;
        PRINT N'==> Đã bổ sung cột product_name vào bảng dbo.order_items.';
    END
END
GO

-- =====================================================================
-- BƯỚC 5: TRIGGER TỰ ĐỘNG CẬP NHẬT CỘT updated_at KHI SỬA ĐƠN HÀNG
-- =====================================================================
CREATE OR ALTER TRIGGER dbo.trg_orders_updated_at
ON dbo.orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE o
    SET updated_at = SYSDATETIME()
    FROM dbo.orders o
    INNER JOIN inserted i ON o.id = i.id;
END
GO

-- =====================================================================
-- BƯỚC 6: NẠP DỮ LIỆU ĐƠN HÀNG MẪU BAN ĐẦU
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.orders)
BEGIN
    -- Đơn hàng 1: Khách hàng Nguyen Van A (1 Laptop Dell + 1 Chuột Logitech)
    INSERT INTO dbo.orders (customer_name, status, total_amount)
    VALUES ('Nguyen Van A', 'CONFIRMED', 15250000.00);

    DECLARE @orderId1 INT = SCOPE_IDENTITY();
    INSERT INTO dbo.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES 
        (@orderId1, 1, 'Laptop Dell', 1, 15000000.00),
        (@orderId1, 3, 'Chuot Logitech', 1, 250000.00);

    -- Đơn hàng 2: Khách hàng Tran Thi B (2 Chuột Logitech + 1 Bàn phím Logitech)
    INSERT INTO dbo.orders (customer_name, status, total_amount)
    VALUES ('Tran Thi B', 'PENDING', 850000.00);

    DECLARE @orderId2 INT = SCOPE_IDENTITY();
    INSERT INTO dbo.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES 
        (@orderId2, 3, 'Chuot Logitech', 2, 250000.00),
        (@orderId2, 4, 'Ban phim Logitech', 1, 350000.00);

    -- Đơn hàng 3: Khách hàng Le Van C (1 Màn hình Samsung)
    INSERT INTO dbo.orders (customer_name, status, total_amount)
    VALUES ('Le Van C', 'COMPLETED', 3200000.00);

    DECLARE @orderId3 INT = SCOPE_IDENTITY();
    INSERT INTO dbo.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES 
        (@orderId3, 5, 'Man hinh Samsung', 1, 3200000.00);

    PRINT N'==> Đã nạp 3 đơn hàng mẫu vào CSDL OrderDB.';
END
GO

-- =====================================================================
-- BƯỚC 7: CÁC CÂU LỆNH TRUY VẤN KIỂM TRA DỮ LIỆU NHANH
-- =====================================================================
PRINT N'--- DANH SÁCH ĐƠN HÀNG VÀ CHI TIẾT SẢN PHẨM (OrderDB) ---';
SELECT 
    o.id AS [Mã Đơn],
    o.customer_name AS [Tên Khách Hàng],
    o.status AS [Trạng Thái],
    o.total_amount AS [Tổng Tiền (VNĐ)],
    oi.product_name AS [Tên Mặt Hàng],
    oi.quantity AS [SL Mua],
    oi.unit_price AS [Đơn Giá (VNĐ)],
    (oi.quantity * oi.unit_price) AS [Thành Tiền (VNĐ)],
    o.created_at AS [Ngày Tạo Đơn]
FROM dbo.orders o
LEFT JOIN dbo.order_items oi ON o.id = oi.order_id
ORDER BY o.id ASC, oi.id ASC;

PRINT N'--- THỐNG KÊ SỐ LƯỢNG ĐƠN THEO TRẠNG THÁI ---';
SELECT 
    status AS [Trạng Thái],
    COUNT(*) AS [Số Lượng Đơn],
    SUM(total_amount) AS [Tổng Doanh Thu Đơn]
FROM dbo.orders
GROUP BY status;
GO

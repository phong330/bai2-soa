-- =====================================================================
-- BÀI THỰC HÀNH SỐ 3: DỊCH VỤ QUẢN LÝ SẢN PHẨM (PRODUCT MANAGEMENT - SOA)
-- HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU: MICROSOFT SQL SERVER
-- NGUYÊN TẮC SOA: Dịch vụ hoạt động độc lập trên CSDL riêng (ProductDB)
-- =====================================================================

-- BƯỚC 1: TẠO CƠ SỞ DỮ LIỆU ProductDB (NẾU CHƯA CÓ)
IF DB_ID(N'ProductDB') IS NULL
BEGIN
    PRINT N'==> Đang khởi tạo CSDL ProductDB...';
    CREATE DATABASE ProductDB;
END
GO

-- BƯỚC 2: SỬ DỤNG CƠ SỞ DỮ LIỆU ProductDB
USE ProductDB;
GO

-- =====================================================================
-- BƯỚC 3: TẠO BẢNG products (QUẢN LÝ THÔNG TIN VÀ TỒN KHO SẢN PHẨM)
-- =====================================================================
IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.products (
        id          INT IDENTITY(1,1) PRIMARY KEY,      -- Mã sản phẩm (tự tăng)
        name        VARCHAR(255) NOT NULL,              -- Tên sản phẩm
        description VARCHAR(MAX) NULL,                  -- Mô tả chi tiết sản phẩm
        price       DECIMAL(10,2) NOT NULL              -- Đơn giá bán (>= 0)
            CHECK (price >= 0),
        quantity    INT NOT NULL                        -- Số lượng tồn kho (>= 0)
            CHECK (quantity >= 0),
        created_at  DATETIME2 NOT NULL                  -- Thời điểm tạo
            DEFAULT SYSDATETIME(),
        updated_at  DATETIME2 NOT NULL                  -- Thời điểm cập nhật cuối
            DEFAULT SYSDATETIME()
    );
    PRINT N'==> Đã tạo bảng dbo.products thành công.';
END
GO

-- =====================================================================
-- BƯỚC 4: TRIGGER TỰ ĐỘNG CẬP NHẬT CỘT updated_at KHI SỬA SẢN PHẨM
-- =====================================================================
CREATE OR ALTER TRIGGER dbo.trg_products_updated_at
ON dbo.products
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE p
    SET updated_at = SYSDATETIME()
    FROM dbo.products p
    INNER JOIN inserted i ON p.id = i.id;
END
GO

-- =====================================================================
-- BƯỚC 5: NẠP DỮ LIỆU MẪU BAN ĐẦU (10 SẢN PHẨM)
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.products)
BEGIN
    INSERT INTO dbo.products (name, description, price, quantity)
    VALUES
        ('Laptop Dell',        'Laptop Dell Core i5, RAM 16GB, SSD 512GB',     15000000, 10),
        ('Laptop ASUS',        'Laptop ASUS VivoBook 15 OLED, Ryzen 7',         13500000, 15),
        ('Chuot Logitech',     'Chuot khong day Logitech M331 Silent',            250000, 30),
        ('Ban phim Logitech',  'Ban phim co Logitech K380 ket noi Bluetooth',     350000, 25),
        ('Man hinh Samsung',   'Man hinh Samsung 24 inch Full HD 75Hz',          3200000, 12),
        ('Tai nghe Sony',      'Tai nghe Bluetooth Sony WH-CH520',               1200000, 20),
        ('USB Kingston',       'USB Kingston 64GB DataTraveler Exodia USB 3.2',   180000, 50),
        ('O cung SSD',         'SSD Kingston 512GB NVMe M.2 PCIe Gen 4',          950000, 18),
        ('Webcam Logitech',    'Webcam Logitech C920 HD Pro 1080p',               850000, 14),
        ('Loa Bluetooth',      'Loa Bluetooth JBL Go 3 chong nuoc IP67',         1750000, 22);
    PRINT N'==> Đã nạp 10 sản phẩm mẫu vào bảng products.';
END
GO

-- =====================================================================
-- BƯỚC 6: CÁC CÂU LỆNH TRUY VẤN KIỂM TRA DỮ LIỆU NHANH
-- =====================================================================
PRINT N'--- DANH SÁCH TẤT CẢ SẢN PHẨM TRONG KHO (ProductDB) ---';
SELECT 
    id AS [Mã SP],
    name AS [Tên sản phẩm],
    price AS [Giá bán],
    quantity AS [Số lượng tồn kho],
    created_at AS [Ngày tạo],
    updated_at AS [Cập nhật cuối]
FROM dbo.products
ORDER BY id ASC;

PRINT N'--- TỔNG HỢP NHANH SỐ LƯỢNG KHO ---';
SELECT 
    COUNT(*) AS [Tổng số loại SP],
    SUM(quantity) AS [Tổng số lượng tồn kho],
    AVG(price) AS [Giá bán trung bình]
FROM dbo.products;
GO

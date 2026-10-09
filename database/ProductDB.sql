-- ==========================================
-- BAI THUC HANH SO 3
-- PRODUCT MANAGEMENT - SOA
-- SQL SERVER
-- ==========================================

-- 1. TAO DATABASE
IF DB_ID(N'ProductDB') IS NULL
BEGIN
    CREATE DATABASE ProductDB;
END
GO

-- 2. SU DUNG DATABASE
USE ProductDB;
GO

-- 3. TAO BANG PRODUCTS
IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.products (
        id INT IDENTITY(1,1) PRIMARY KEY,

        name VARCHAR(255) NOT NULL,

        description VARCHAR(MAX) NULL,

        price DECIMAL(10,2) NOT NULL
            CHECK (price >= 0),

        quantity INT NOT NULL
            CHECK (quantity >= 0),

        created_at DATETIME2 NOT NULL
            DEFAULT SYSDATETIME(),

        updated_at DATETIME2 NOT NULL
            DEFAULT SYSDATETIME()
    );
END
GO

-- 4. TU DONG CAP NHAT updated_at KHI SUA
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

-- 5. THEM 10 SAN PHAM MAU
-- CHI THEM KHI BANG DANG TRONG

IF NOT EXISTS (
    SELECT 1 FROM dbo.products
)
BEGIN
    INSERT INTO dbo.products
        (name, description, price, quantity)
    VALUES
        ('Laptop Dell',
         'Laptop Dell Core i5',
         15000000, 10),

        ('Laptop ASUS',
         'Laptop ASUS VivoBook',
         13500000, 15),

        ('Chuot Logitech',
         'Chuot khong day Logitech',
         250000, 30),

        ('Ban phim Logitech',
         'Ban phim USB',
         350000, 25),

        ('Man hinh Samsung',
         'Man hinh Samsung 24 inch',
         3200000, 12),

        ('Tai nghe Sony',
         'Tai nghe Bluetooth Sony',
         1200000, 20),

        ('USB Kingston',
         'USB Kingston 64GB',
         180000, 50),

        ('O cung SSD',
         'SSD Kingston 512GB',
         950000, 18),

        ('Webcam Logitech',
         'Webcam Full HD 1080p',
         850000, 14),

        ('Loa Bluetooth',
         'Loa Bluetooth JBL',
         1750000, 16);
END
GO

-- 6. HIEN THI TAT CA SAN PHAM
SELECT * FROM dbo.products;
GO

-- 7. DEM SO LUONG SAN PHAM
SELECT COUNT(*) AS TongSanPham
FROM dbo.products;
GO

-- 8. KIEM TRA CAU TRUC BANG
EXEC sp_help 'dbo.products';
GO
-- =====================================================================
-- BÀI THỰC HÀNH SỐ 5: DỊCH VỤ BÁO CÁO THỐNG KÊ (REPORTING SERVICE - SOA)
-- HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU: MICROSOFT SQL SERVER
-- NGUYÊN TẮC SOA: Dịch vụ hoạt động độc lập trên CSDL riêng (ReportDB)
-- =====================================================================

-- BƯỚC 1: TẠO CƠ SỞ DỮ LIỆU REPORTDB (NẾU CHƯA CÓ)
IF DB_ID(N'ReportDB') IS NULL
BEGIN
    PRINT N'==> Đang khởi tạo CSDL ReportDB...';
    CREATE DATABASE ReportDB;
END
GO

-- BƯỚC 2: SỬ DỤNG CƠ SỞ DỮ LIỆU REPORTDB
USE ReportDB;
GO

-- =====================================================================
-- BƯỚC 3: TẠO BẢNG product_costs (QUẢN LÝ GIÁ VỐN / CHI PHÍ SẢN PHẨM)
-- Mục đích: Lưu giá vốn của từng sản phẩm để Report Service tính:
--   Chi phí = Số lượng bán * Giá vốn
--   Lợi nhuận = Doanh thu - Chi phí
-- =====================================================================
IF OBJECT_ID(N'dbo.product_costs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_costs (
        product_id      INT PRIMARY KEY,                -- Mã sản phẩm (tham chiếu từ Product Service)
        product_name    VARCHAR(255) NOT NULL,          -- Tên sản phẩm
        cost_price      DECIMAL(10,2) NOT NULL          -- Giá vốn sản phẩm
            CHECK (cost_price >= 0),
        updated_at      DATETIME2 NOT NULL              -- Thời gian cập nhật giá vốn
            DEFAULT SYSDATETIME()
    );
    PRINT N'==> Đã tạo bảng dbo.product_costs thành công.';
END
GO

-- =====================================================================
-- BƯỚC 4: TẠO BẢNG saved_reports (LƯU LỊCH SỬ CÁC KỲ BÁO CÁO KINH DOANH)
-- Mục đích: Lưu lại snapshot tổng hợp số liệu tại một thời điểm
-- =====================================================================
IF OBJECT_ID(N'dbo.saved_reports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.saved_reports (
        id              INT IDENTITY(1,1) PRIMARY KEY,  -- Mã kỳ báo cáo (tự tăng)
        title           VARCHAR(255) NOT NULL,          -- Tiêu đề kỳ báo cáo
        total_inventory INT NOT NULL DEFAULT 0,         -- Tổng số lượng hàng tồn kho
        total_sold      INT NOT NULL DEFAULT 0,         -- Tổng số lượng hàng bán được
        total_revenue   DECIMAL(14,2) NOT NULL DEFAULT 0,-- Tổng doanh thu bán hàng
        total_cost      DECIMAL(14,2) NOT NULL DEFAULT 0,-- Tổng chi phí (giá vốn hàng bán)
        total_profit    DECIMAL(14,2) NOT NULL DEFAULT 0,-- Tổng lợi nhuận gộp (Doanh thu - Chi phí)
        created_at      DATETIME2 NOT NULL              -- Thời điểm lưu báo cáo
            DEFAULT SYSDATETIME()
    );
    PRINT N'==> Đã tạo bảng dbo.saved_reports thành công.';
END
GO

-- =====================================================================
-- BƯỚC 5: TẠO BẢNG saved_report_items (CHI TIẾT TỪNG DÒNG CỦA BẢN BÁO CÁO)
-- Mục đích: Lưu chi tiết số liệu của từng sản phẩm và từng đơn hàng
-- =====================================================================
IF OBJECT_ID(N'dbo.saved_report_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.saved_report_items (
        id              INT IDENTITY(1,1) PRIMARY KEY,  -- Mã dòng chi tiết
        report_id       INT NOT NULL,                   -- Mã kỳ báo cáo (khóa ngoại)
        item_type       VARCHAR(20) NOT NULL            -- Loại mục: 'PRODUCT' hoặc 'ORDER'
            CHECK (item_type IN ('PRODUCT', 'ORDER')),
        ref_id          INT NOT NULL,                   -- ID tham chiếu (Mã sản phẩm hoặc Mã đơn)
        name            VARCHAR(255) NOT NULL,          -- Tên hiển thị (Tên sản phẩm hoặc Đơn hàng)
        quantity_stock  INT NOT NULL DEFAULT 0,         -- Số lượng tồn kho
        quantity_sold   INT NOT NULL DEFAULT 0,         -- Số lượng đã bán được
        revenue         DECIMAL(12,2) NOT NULL DEFAULT 0,-- Doanh thu của mục
        cost            DECIMAL(12,2) NOT NULL DEFAULT 0,-- Chi phí vốn của mục
        profit          DECIMAL(12,2) NOT NULL DEFAULT 0,-- Lợi nhuận của mục (Doanh thu - Chi phí)
        CONSTRAINT FK_report_items_reports FOREIGN KEY (report_id)
            REFERENCES dbo.saved_reports(id) ON DELETE CASCADE
    );
    PRINT N'==> Đã tạo bảng dbo.saved_report_items thành công.';
END
GO

-- =====================================================================
-- BƯỚC 6: NẠP GIÁ VỐN MẶC ĐỊNH CHO 10 SẢN PHẨM MẪU
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.product_costs)
BEGIN
    INSERT INTO dbo.product_costs (product_id, product_name, cost_price)
    VALUES
        (1,  'Laptop Dell',        11000000.00), -- Giá bán: 15tr   -> Giá vốn: 11tr   -> Lãi: 4tr/cái
        (2,  'Laptop ASUS',        10000000.00), -- Giá bán: 13.5tr -> Giá vốn: 10tr   -> Lãi: 3.5tr/cái
        (3,  'Chuot Logitech',       150000.00), -- Giá bán: 250k   -> Giá vốn: 150k   -> Lãi: 100k/cái
        (4,  'Ban phim Logitech',    220000.00), -- Giá bán: 350k   -> Giá vốn: 220k   -> Lãi: 130k/cái
        (5,  'Man hinh Samsung',    2300000.00), -- Giá bán: 3.2tr  -> Giá vốn: 2.3tr  -> Lãi: 900k/cái
        (6,  'Tai nghe Sony',        800000.00), -- Giá bán: 1.2tr  -> Giá vốn: 800k   -> Lãi: 400k/cái
        (7,  'USB Kingston',         100000.00), -- Giá bán: 180k   -> Giá vốn: 100k   -> Lãi: 80k/cái
        (8,  'O cung SSD',           650000.00), -- Giá bán: 950k   -> Giá vốn: 650k   -> Lãi: 300k/cái
        (9,  'Webcam Logitech',      550000.00), -- Giá bán: 850k   -> Giá vốn: 550k   -> Lãi: 300k/cái
        (10, 'Loa Bluetooth',       1200000.00); -- Giá bán: 1.75tr -> Giá vốn: 1.2tr  -> Lãi: 550k/cái
    PRINT N'==> Đã nạp bảng giá vốn mặc định cho 10 sản phẩm.';
END
GO

-- =====================================================================
-- BƯỚC 7: NẠP 1 BẢN BÁO CÁO MẪU KHỞI TẠO
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.saved_reports)
BEGIN
    INSERT INTO dbo.saved_reports (title, total_inventory, total_sold, total_revenue, total_cost, total_profit)
    VALUES ('Bao cao khoi tao he thong', 188, 5, 20500000.00, 14720000.00, 5780000.00);

    DECLARE @repId INT = SCOPE_IDENTITY();

    INSERT INTO dbo.saved_report_items (report_id, item_type, ref_id, name, quantity_stock, quantity_sold, revenue, cost, profit)
    VALUES
        (@repId, 'PRODUCT', 1, 'Laptop Dell',                9,  1, 15000000.00, 11000000.00, 4000000.00),
        (@repId, 'PRODUCT', 3, 'Chuot Logitech',            27,  3,   750000.00,   450000.00,  300000.00),
        (@repId, 'PRODUCT', 4, 'Ban phim Logitech',         24,  1,   350000.00,   220000.00,  130000.00),
        (@repId, 'ORDER',   1, 'Don hang #1 - Nguyen Van A', 0,  2, 15250000.00, 11150000.00, 4100000.00),
        (@repId, 'ORDER',   2, 'Don hang #2 - Tran Thi B',   0,  3,   850000.00,   520000.00,  330000.00);
    PRINT N'==> Đã nạp báo cáo mẫu khởi tạo.';
END
GO

-- =====================================================================
-- BƯỚC 8: CÁC CÂU LỆNH TRUY VẤN KIỂM TRA DỮ LIỆU
-- =====================================================================
PRINT N'--- BẢNG GIÁ VỐN SẢN PHẨM (product_costs) ---';
SELECT product_id, product_name, cost_price, updated_at FROM dbo.product_costs;

PRINT N'--- DANH SÁCH BÁO CÁO ĐÃ LƯU (saved_reports) ---';
SELECT id, title, total_inventory, total_sold, total_revenue, total_cost, total_profit, created_at FROM dbo.saved_reports;

PRINT N'--- CHI TIẾT TỪNG DÒNG BÁO CÁO (saved_report_items) ---';
SELECT id, report_id, item_type, ref_id, name, quantity_stock, quantity_sold, revenue, cost, profit FROM dbo.saved_report_items;
GO

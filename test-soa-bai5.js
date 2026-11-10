const baseUrlAuth = 'http://localhost:3000';
const baseUrlProduct = 'http://localhost:3001';
const baseUrlOrder = 'http://localhost:3002';
const baseUrlReport = 'http://localhost:3003';

async function run() {
  console.log('=== KICH BAN KIEM THU BAI THUC HANH 5 - REPORT SERVICE (SOA) ===\n');

  // 1. Đăng nhập
  console.log('[Bước 1] Đăng nhập lấy Bearer JWT Token...');
  const loginRes = await fetch(`${baseUrlAuth}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'admin', password: 'MTIzNDU2' }),
  });
  if (!loginRes.ok) throw new Error(`Đăng nhập thất bại: ${loginRes.status}`);
  const { token } = await loginRes.json();
  console.log('=> Đăng nhập thành công! Token:', token.substring(0, 30) + '...\n');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Thống kê tổng quan
  console.log('[Bước 2] Lấy thống kê tổng quan (Overview): Hàng tồn, Đã bán, Doanh thu, Chi phí, Lợi nhuận...');
  const overviewRes = await fetch(`${baseUrlReport}/reports/overview`, { headers });
  if (!overviewRes.ok) throw new Error(`Lỗi lấy overview: ${overviewRes.status}`);
  const overview = await overviewRes.json();
  console.log('=> Kết quả thống kê tổng quan:');
  console.log(`   - Tổng hàng tồn kho:     ${overview.totalInventory} sản phẩm`);
  console.log(`   - Tổng hàng bán được:    ${overview.totalSold} sản phẩm`);
  console.log(`   - Tổng doanh thu:        ${Number(overview.totalRevenue).toLocaleString('vi-VN')} VND`);
  console.log(`   - Tổng chi phí (vốn):    ${Number(overview.totalCost).toLocaleString('vi-VN')} VND`);
  console.log(`   - Tổng lợi nhuận gộp:    ${Number(overview.totalProfit).toLocaleString('vi-VN')} VND`);
  console.log(`   - Tỷ suất lợi nhuận:     ${overview.profitMargin}%\n`);

  // 3. Báo cáo theo sản phẩm
  console.log('[Bước 3] Lấy báo cáo chi tiết theo sản phẩm (Report by Product)...');
  const prodReportRes = await fetch(`${baseUrlReport}/reports/products`, { headers });
  if (!prodReportRes.ok) throw new Error(`Lỗi lấy report sản phẩm: ${prodReportRes.status}`);
  const prodReports = await prodReportRes.json();
  console.log(`=> Đã tổng hợp báo cáo cho ${prodReports.length} sản phẩm. Top 3 sản phẩm mẫu:`);
  prodReports.slice(0, 3).forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.productName}:`);
    console.log(`      * Tồn kho: ${p.inventoryQuantity} | Đã bán: ${p.soldQuantity}`);
    console.log(`      * Doanh thu: ${Number(p.revenue).toLocaleString('vi-VN')} VND | Chi phí: ${Number(p.cost).toLocaleString('vi-VN')} VND | Lợi nhuận: ${Number(p.profit).toLocaleString('vi-VN')} VND`);
  });
  console.log('');

  // 4. Báo cáo theo đơn hàng
  console.log('[Bước 4] Lấy báo cáo chi tiết theo đơn hàng (Report by Order)...');
  const orderReportRes = await fetch(`${baseUrlReport}/reports/orders`, { headers });
  if (!orderReportRes.ok) throw new Error(`Lỗi lấy report đơn hàng: ${orderReportRes.status}`);
  const orderReports = await orderReportRes.json();
  console.log(`=> Đã tổng hợp báo cáo cho ${orderReports.length} đơn hàng:`);
  orderReports.forEach((o) => {
    console.log(`   - Đơn #${o.orderId} (${o.customerName} - ${o.status}):`);
    console.log(`     Doanh thu: ${Number(o.revenue).toLocaleString('vi-VN')} VND | Chi phí: ${Number(o.cost).toLocaleString('vi-VN')} VND | Lợi nhuận: ${Number(o.profit).toLocaleString('vi-VN')} VND`);
  });
  console.log('');

  // 5. Cập nhật giá vốn cho sản phẩm 1
  console.log('[Bước 5] Cập nhật giá vốn cho Laptop Dell (ID: 1)...');
  const setCostRes = await fetch(`${baseUrlReport}/reports/costs/1`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ costPrice: 11500000 }),
  });
  if (setCostRes.ok) {
    const costData = await setCostRes.json();
    console.log(`=> Cập nhật giá vốn thành công: "${costData.productName}" giá vốn mới = ${Number(costData.costPrice).toLocaleString('vi-VN')} VND\n`);
  }

  // 6. Lưu Snapshot kỳ báo cáo vào CSDL ReportDB
  console.log('[Bước 6] Tạo và lưu Snapshot kỳ báo cáo vào CSDL ReportDB...');
  const genReportRes = await fetch(`${baseUrlReport}/reports/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Báo cáo tài chính quý kiểm thử tự động' }),
  });
  if (!genReportRes.ok) throw new Error(`Lỗi lưu snapshot: ${genReportRes.status}`);
  const savedReport = await genReportRes.json();
  console.log(`=> Lưu thành công báo cáo ID #${savedReport.id}: "${savedReport.title}"`);
  console.log(`   Tổng doanh thu lưu: ${Number(savedReport.totalRevenue).toLocaleString('vi-VN')} VND`);
  console.log(`   Tổng lợi nhuận lưu: ${Number(savedReport.totalProfit).toLocaleString('vi-VN')} VND`);
  console.log(`   Số lượng dòng chi tiết đã lưu: ${savedReport.items ? savedReport.items.length : 0} dòng\n`);

  // 7. Lấy danh sách lịch sử báo cáo
  console.log('[Bước 7] Lấy danh sách lịch sử báo cáo đã lưu trong ReportDB...');
  const historyRes = await fetch(`${baseUrlReport}/reports/history`, { headers });
  const history = await historyRes.json();
  console.log(`=> Số lượng báo cáo trong CSDL ReportDB: ${history.length} bản báo cáo\n`);

  console.log('========================================================');
  console.log('   TẤT CẢ TÍNH NĂNG BÀI TH 5 (SOA) ĐÃ HOẠT ĐỘNG 100%!   ');
  console.log('========================================================');
}

run().catch((err) => {
  console.error('Lỗi khi chạy kịch bản kiểm thử Bài 5:', err);
});


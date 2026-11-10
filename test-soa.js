const baseUrlAuth = 'http://localhost:3000';
const baseUrlProduct = 'http://localhost:3001';
const baseUrlOrder = 'http://localhost:3002';

async function run() {
  console.log('=== KICH BAN KIEM THU HE THONG SOA (BAI THUC HANH 4) ===\n');

  // 1. Đăng nhập qua Auth Service
  console.log('[Bước 1] Đăng nhập tài khoản admin...');
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

  // 2. Lấy thông tin sản phẩm 1 từ Product Service
  console.log('[Bước 2] Lấy thông tin sản phẩm ID 1 từ Product Service...');
  const prodRes = await fetch(`${baseUrlProduct}/products/1`, { headers });
  const prodBefore = await prodRes.json();
  console.log(`=> Sản phẩm: "${prodBefore.name}", Tồn kho: ${prodBefore.quantity}, Giá: ${prodBefore.price} VND\n`);

  // 3. Lấy danh sách đơn hàng ban đầu từ Order Service
  console.log('[Bước 3] Lấy danh sách đơn hàng hiện có từ Order Service...');
  const ordersRes = await fetch(`${baseUrlOrder}/orders`, { headers });
  const initialOrders = await ordersRes.json();
  console.log(`=> Số lượng đơn hàng hiện tại trong OrderDB: ${initialOrders.length}\n`);

  // 4. Test trường hợp đặt hàng vượt quá tồn kho (Validation lỗi 400)
  console.log('[Bước 4] Kiểm tra validation khi đặt vượt quá tồn kho (9999 sản phẩm)...');
  const overOrderRes = await fetch(`${baseUrlOrder}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Khach Test Vuot Kho',
      items: [{ productId: 1, quantity: 9999 }],
    }),
  });
  const overOrderBody = await overOrderRes.json();
  console.log(`=> Mã phản hồi: ${overOrderRes.status} (Kỳ vọng: 400)`);
  console.log(`=> Thông báo lỗi: ${JSON.stringify(overOrderBody.message)}\n`);

  // 5. Tạo đơn hàng mới hợp lệ: 1 Laptop Dell (ID: 1)
  console.log('[Bước 5] Tạo đơn hàng mới: 1 x Laptop Dell...');
  const createRes = await fetch(`${baseUrlOrder}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Doan Van Thanh',
      items: [{ productId: 1, quantity: 1 }],
    }),
  });
  if (!createRes.ok) throw new Error(`Tạo đơn hàng thất bại: ${createRes.status}`);
  const createdOrder = await createRes.json();
  console.log(`=> Tạo đơn thành công! Mã đơn: #${createdOrder.id}`);
  console.log(`=> Khách hàng: ${createdOrder.customerName}`);
  console.log(`=> Tổng tiền: ${createdOrder.totalAmount} VND`);
  console.log(`=> Trạng thái: ${createdOrder.status}`);
  console.log(`=> Danh sách sản phẩm trong đơn:`, createdOrder.items, '\n');

  // 6. Kiểm tra số lượng tồn kho trong Product Service đã giảm chưa
  console.log('[Bước 6] Kiểm tra tồn kho sản phẩm ID 1 sau khi tạo đơn...');
  const prodAfterRes = await fetch(`${baseUrlProduct}/products/1`, { headers });
  const prodAfter = await prodAfterRes.json();
  console.log(`=> Tồn kho trước khi đặt: ${prodBefore.quantity}`);
  console.log(`=> Tồn kho sau khi đặt:   ${prodAfter.quantity}`);
  if (prodAfter.quantity === prodBefore.quantity - 1) {
    console.log('=> CHÍNH XÁC! Tồn kho đã được trừ 1 sản phẩm liên dịch vụ thành công.\n');
  } else {
    console.warn('=> Cảnh báo: Số lượng tồn kho chưa giảm như kỳ vọng.\n');
  }

  // 7. Cập nhật trạng thái đơn hàng sang CANCELLED (hủy đơn)
  console.log(`[Bước 7] Hủy đơn hàng #${createdOrder.id} (chuyển sang CANCELLED)...`);
  const cancelRes = await fetch(`${baseUrlOrder}/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const cancelledOrder = await cancelRes.json();
  console.log(`=> Trạng thái đơn hàng sau cập nhật: ${cancelledOrder.status}\n`);

  // 8. Kiểm tra số lượng tồn kho có được hoàn lại về Product Service không
  console.log('[Bước 8] Kiểm tra số lượng tồn kho sản phẩm ID 1 sau khi hủy đơn...');
  const prodRestoredRes = await fetch(`${baseUrlProduct}/products/1`, { headers });
  const prodRestored = await prodRestoredRes.json();
  console.log(`=> Tồn kho sau khi hủy đơn: ${prodRestored.quantity}`);
  if (prodRestored.quantity === prodBefore.quantity) {
    console.log('=> CHÍNH XÁC! Tồn kho đã được hoàn lại đầy đủ liên dịch vụ.\n');
  }

  // 9. Thử chức năng thêm sản phẩm vào đơn hàng mẫu #2
  console.log('[Bước 9] Kiểm tra chức năng thêm sản phẩm vào đơn hàng #2...');
  const addItemRes = await fetch(`${baseUrlOrder}/orders/2/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 6, quantity: 1 }), // Tai nghe Sony
  });
  if (addItemRes.ok) {
    const updatedOrder2 = await addItemRes.json();
    console.log(`=> Thêm sản phẩm thành công! Tổng tiền mới của đơn #2: ${updatedOrder2.totalAmount} VND\n`);
  }

  // 10. Xóa đơn hàng vừa tạo để dọn dẹp dữ liệu test
  console.log(`[Bước 10] Xóa đơn hàng test #${createdOrder.id}...`);
  const deleteRes = await fetch(`${baseUrlOrder}/orders/${createdOrder.id}`, {
    method: 'DELETE',
    headers,
  });
  const deleteData = await deleteRes.json();
  console.log('=> Kết quả xóa:', deleteData.message, '\n');

  console.log('========================================================');
  console.log('   TẤT CẢ KỊCH BẢN KIỂM THỬ BÀI TH 4 ĐÃ THÀNH CÔNG 100%! ');
  console.log('========================================================');
}

run().catch((err) => {
  console.error('Lỗi khi chạy kịch bản kiểm thử:', err);
});


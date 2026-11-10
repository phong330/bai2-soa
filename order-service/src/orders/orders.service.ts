import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { productServiceUrl } from '../config';
import {
  AddOrderItemDto,
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderItemDto,
} from './order.dto';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';

/**
 * Kiểu dữ liệu sản phẩm nhận từ Product Service (Port 3001)
 */
export type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

/**
 * =====================================================================
 * SERVICE QUẢN LÝ ĐƠN HÀNG (ORDER SERVICE - PORT 3002)
 * Kiến trúc SOA: Dịch vụ hoạt động độc lập trên CSDL riêng (OrderDB).
 * Giao tiếp với Product Service hoàn toàn qua HTTP REST API để kiểm tra
 * tồn kho và cập nhật số lượng khi đặt hàng / hủy đơn.
 * =====================================================================
 */
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>, // Repository quản lý bảng orders trong OrderDB
    @InjectRepository(OrderItem)
    private readonly items: Repository<OrderItem>, // Repository quản lý bảng order_items
  ) {}

  /**
   * =====================================================================
   * HÀM 1: LẤY DANH SÁCH TẤT CẢ ĐƠN HÀNG
   * Kèm theo danh sách chi tiết các mặt hàng trong từng đơn (relations: ['items'])
   * =====================================================================
   */
  findAll() {
    return this.orders.find({
      order: { id: 'DESC' },
      relations: ['items'],
    });
  }

  /**
   * =====================================================================
   * HÀM 2: LẤY CHI TIẾT MỘT ĐƠN HÀNG THEO MÃ ID
   * @param id Mã đơn hàng
   * @returns Thông tin đơn hàng kèm danh sách chi tiết mặt hàng
   * =====================================================================
   */
  async findOne(id: number) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID: ${id}`);
    }
    return order;
  }

  /**
   * =====================================================================
   * HÀM 3: TẠO ĐƠN HÀNG MỚI (CHUẨN SOA)
   * Các bước xử lý:
   *   Bước 1: Gọi Product Service (:3001) kiểm tra tồn kho từng sản phẩm
   *   Bước 2: Trừ số lượng tồn kho trong Product Service (HTTP PUT)
   *   Bước 3: Tạo các dòng sản phẩm trong đơn hàng với giá bán hiện tại
   *   Bước 4: Tính tổng tiền và lưu đơn hàng vào CSDL OrderDB
   * =====================================================================
   */
  async create(dto: CreateOrderDto, authorization?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // Bước 1: Kiểm tra tồn tại và số lượng tồn kho của tất cả sản phẩm
    const productMap = new Map<number, Product>();
    for (const item of dto.items) {
      const product = await this.getProduct(item.productId, authorization);
      if (item.quantity > product.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" không đủ số lượng tồn kho (hiện còn ${product.quantity}, yêu cầu ${item.quantity})`,
        );
      }
      productMap.set(item.productId, product);
    }

    // Bước 2: Trừ số lượng tồn kho trong Product Service
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const newStock = product.quantity - item.quantity;
      await this.updateProductStock(product.id, newStock, authorization);
    }

    // Bước 3: Tạo các dòng sản phẩm trong đơn hàng
    const orderItems: OrderItem[] = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      return this.items.create({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
      });
    });

    // Bước 4: Tính tổng giá trị đơn và lưu vào OrderDB
    const totalAmount = this.calculateTotal(orderItems);
    const order = this.orders.create({
      customerName: dto.customerName,
      status: OrderStatus.PENDING,
      totalAmount,
      items: orderItems,
    });

    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM 4: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
   * (PENDING -> CONFIRMED -> SHIPPED -> COMPLETED hoặc CANCELLED)
   * - Nếu chuyển sang CANCELLED: tự động hoàn trả tồn kho về Product Service
   * - Nếu từ CANCELLED mở lại: kiểm tra và trừ lại tồn kho tương ứng
   * =====================================================================
   */
  async updateStatus(id: number, newStatus: OrderStatus, authorization?: string) {
    const order = await this.findOne(id);
    const oldStatus = order.status;

    if (oldStatus === newStatus) {
      return order;
    }

    // Trường hợp 1: Chuyển sang CANCELLED -> Hoàn trả tồn kho về Product Service
    if (oldStatus !== OrderStatus.CANCELLED && newStatus === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        try {
          const product = await this.getProduct(item.productId, authorization);
          await this.updateProductStock(
            product.id,
            product.quantity + item.quantity,
            authorization,
          );
        } catch (err) {
          console.warn(`Lỗi khi hoàn tồn kho sản phẩm ID ${item.productId}:`, err);
        }
      }
    }

    // Trường hợp 2: Từ CANCELLED khôi phục lại -> Kiểm tra & trừ tồn kho
    if (oldStatus === OrderStatus.CANCELLED && newStatus !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        const product = await this.getProduct(item.productId, authorization);
        if (item.quantity > product.quantity) {
          throw new BadRequestException(
            `Không thể khôi phục đơn hàng: Sản phẩm "${product.name}" không đủ số lượng (hiện còn ${product.quantity}, cần ${item.quantity})`,
          );
        }
      }
      for (const item of order.items) {
        const product = await this.getProduct(item.productId, authorization);
        await this.updateProductStock(
          product.id,
          product.quantity - item.quantity,
          authorization,
        );
      }
    }

    order.status = newStatus;
    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM 5: CẬP NHẬT THÔNG TIN ĐƠN HÀNG (Tên khách hàng, trạng thái, danh sách mặt hàng)
   * =====================================================================
   */
  async update(id: number, dto: UpdateOrderDto, authorization?: string) {
    const order = await this.findOne(id);

    // Cập nhật trạng thái (nếu có)
    if (dto.status && dto.status !== order.status) {
      await this.updateStatus(id, dto.status, authorization);
      const reloaded = await this.findOne(id);
      order.status = reloaded.status;
    }

    // Cập nhật tên khách hàng (nếu có)
    if (dto.customerName) {
      order.customerName = dto.customerName;
    }

    // Cập nhật lại toàn bộ danh sách sản phẩm trong đơn (nếu có)
    if (dto.items && dto.items.length > 0) {
      if (order.status !== OrderStatus.CANCELLED) {
        // Hoàn lại tồn kho của các sản phẩm cũ
        for (const oldItem of order.items) {
          try {
            const product = await this.getProduct(oldItem.productId, authorization);
            await this.updateProductStock(
              product.id,
              product.quantity + oldItem.quantity,
              authorization,
            );
          } catch (err) {
            console.warn(`Lỗi hoàn kho sản phẩm ${oldItem.productId}:`, err);
          }
        }

        // Kiểm tra tồn kho cho danh sách sản phẩm mới
        const productMap = new Map<number, Product>();
        for (const newItem of dto.items) {
          const product = await this.getProduct(newItem.productId, authorization);
          if (newItem.quantity > product.quantity) {
            throw new BadRequestException(
              `Sản phẩm "${product.name}" không đủ tồn kho (hiện còn ${product.quantity}, yêu cầu ${newItem.quantity})`,
            );
          }
          productMap.set(newItem.productId, product);
        }

        // Trừ tồn kho theo danh sách mới
        for (const newItem of dto.items) {
          const product = productMap.get(newItem.productId)!;
          await this.updateProductStock(
            product.id,
            product.quantity - newItem.quantity,
            authorization,
          );
        }

        // Lưu danh sách sản phẩm mới vào đơn hàng
        await this.items.remove(order.items);
        order.items = dto.items.map((item) => {
          const product = productMap.get(item.productId)!;
          return this.items.create({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: Number(product.price),
          });
        });
        order.totalAmount = this.calculateTotal(order.items);
      }
    }

    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM 6: XÓA ĐƠN HÀNG
   * Nếu đơn hàng chưa bị hủy thì hoàn trả lại số lượng tồn kho cho Product Service
   * =====================================================================
   */
  async remove(id: number, authorization?: string) {
    const order = await this.findOne(id);

    // Hoàn trả tồn kho nếu đơn đang hoạt động
    if (order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        try {
          const product = await this.getProduct(item.productId, authorization);
          await this.updateProductStock(
            product.id,
            product.quantity + item.quantity,
            authorization,
          );
        } catch (err) {
          console.warn(`Lỗi hoàn trả tồn kho sản phẩm ID ${item.productId}:`, err);
        }
      }
    }

    await this.orders.remove(order);
    return {
      message: 'Xóa đơn hàng thành công',
      deletedOrderId: id,
    };
  }

  /**
   * =====================================================================
   * HÀM 7: THÊM MỘT SẢN PHẨM VÀO ĐƠN HÀNG ĐÃ TỒN TẠI
   * =====================================================================
   */
  async addItem(orderId: number, dto: AddOrderItemDto, authorization?: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        `Không thể thêm sản phẩm vào đơn hàng có trạng thái ${order.status}`,
      );
    }

    // Kiểm tra tồn kho tại Product Service
    const product = await this.getProduct(dto.productId, authorization);
    if (dto.quantity > product.quantity) {
      throw new BadRequestException(
        `Sản phẩm "${product.name}" không đủ tồn kho (hiện còn ${product.quantity}, yêu cầu ${dto.quantity})`,
      );
    }

    // Trừ tồn kho tại Product Service
    await this.updateProductStock(
      product.id,
      product.quantity - dto.quantity,
      authorization,
    );

    // Thêm mới hoặc cộng dồn số lượng nếu đã có sản phẩm này trong đơn
    const existingItem = order.items.find((i) => i.productId === dto.productId);
    if (existingItem) {
      existingItem.quantity += dto.quantity;
      existingItem.unitPrice = Number(product.price);
      existingItem.productName = product.name;
    } else {
      const newItem = this.items.create({
        productId: product.id,
        productName: product.name,
        quantity: dto.quantity,
        unitPrice: Number(product.price),
      });
      order.items.push(newItem);
    }

    order.totalAmount = this.calculateTotal(order.items);
    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM 8: CẬP NHẬT SỐ LƯỢNG MỘT MẶT HÀNG TRONG ĐƠN
   * =====================================================================
   */
  async updateItem(
    orderId: number,
    itemId: number,
    dto: UpdateOrderItemDto,
    authorization?: string,
  ) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        `Không thể cập nhật sản phẩm trong đơn hàng có trạng thái ${order.status}`,
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Không tìm thấy sản phẩm mã ${itemId} trong đơn hàng`);
    }

    const diff = dto.quantity - item.quantity;
    if (diff > 0) {
      // Tăng số lượng -> kiểm tra tồn kho và trừ thêm
      const product = await this.getProduct(item.productId, authorization);
      if (diff > product.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" không đủ số lượng (cần thêm ${diff}, chỉ còn ${product.quantity})`,
        );
      }
      await this.updateProductStock(
        product.id,
        product.quantity - diff,
        authorization,
      );
    } else if (diff < 0) {
      // Giảm số lượng -> hoàn lại số lượng thừa vào Product Service
      const restoreQty = Math.abs(diff);
      const product = await this.getProduct(item.productId, authorization);
      await this.updateProductStock(
        product.id,
        product.quantity + restoreQty,
        authorization,
      );
    }

    item.quantity = dto.quantity;
    order.totalAmount = this.calculateTotal(order.items);
    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM 9: XÓA MỘT MẶT HÀNG RA KHỎI ĐƠN HÀNG
   * =====================================================================
   */
  async removeItem(orderId: number, itemId: number, authorization?: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        `Không thể xóa sản phẩm trong đơn hàng có trạng thái ${order.status}`,
      );
    }

    const itemIndex = order.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException(`Không tìm thấy sản phẩm mã ${itemId} trong đơn hàng`);
    }

    const item = order.items[itemIndex];

    // Hoàn lại số lượng tồn kho về Product Service
    try {
      const product = await this.getProduct(item.productId, authorization);
      await this.updateProductStock(
        product.id,
        product.quantity + item.quantity,
        authorization,
      );
    } catch (err) {
      console.warn(`Lỗi hoàn trả tồn kho sản phẩm ${item.productId}:`, err);
    }

    await this.items.remove(item);
    order.items.splice(itemIndex, 1);

    order.totalAmount = this.calculateTotal(order.items);
    return this.orders.save(order);
  }

  /**
   * =====================================================================
   * HÀM TIỆN ÍCH 1: TÍNH TỔNG TIỀN ĐƠN HÀNG
   * Tổng tiền = Tổng (Số lượng * Đơn giá) của từng mặt hàng
   * =====================================================================
   */
  private calculateTotal(items: OrderItem[]) {
    return items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
      0,
    );
  }

  /**
   * =====================================================================
   * HÀM TIỆN ÍCH 2: GỌI PRODUCT SERVICE QUA REST API ĐỂ LẤY THÔNG TIN SẢN PHẨM
   * Tuân theo kiến trúc SOA: Không chọc trực tiếp DB của nhau mà gọi qua API
   * =====================================================================
   */
  private async getProduct(id: number, authorization?: string): Promise<Product> {
    try {
      const response = await fetch(`${productServiceUrl}/products/${id}`, {
        headers: authorization ? { authorization } : {},
      });
      if (response.status === 404) {
        throw new BadRequestException(`Sản phẩm với ID ${id} không tồn tại trong hệ thống`);
      }
      if (!response.ok) {
        throw new BadGatewayException(
          `Product Service trả về lỗi HTTP ${response.status}`,
        );
      }
      return (await response.json()) as Product;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      throw new BadGatewayException(
        `Không thể kết nối đến Product Service tại ${productServiceUrl}`,
      );
    }
  }

  /**
   * =====================================================================
   * HÀM TIỆN ÍCH 3: GỌI PRODUCT SERVICE QUA REST API ĐỂ CẬP NHẬT TỒN KHO
   * Gửi request PUT /products/:id với body { quantity: newQuantity }
   * =====================================================================
   */
  private async updateProductStock(
    id: number,
    newQuantity: number,
    authorization?: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${productServiceUrl}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!response.ok) {
        throw new BadGatewayException(
          `Không thể cập nhật số lượng tồn kho sản phẩm ID ${id} (HTTP ${response.status})`,
        );
      }
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        `Lỗi kết nối khi cập nhật tồn kho tới Product Service`,
      );
    }
  }
}

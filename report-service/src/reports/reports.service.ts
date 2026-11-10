import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { orderServiceUrl, productServiceUrl } from '../config';
import { GenerateReportDto, SetCostPriceDto } from './report.dto';
import { ProductCost } from './product-cost.entity';
import { SavedReport } from './saved-report.entity';
import { SavedReportItem } from './saved-report-item.entity';

// Kiểu dữ liệu sản phẩm nhận từ Product Service
export type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

// Kiểu dữ liệu món hàng trong đơn nhận từ Order Service
export type OrderItem = {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
};

// Kiểu dữ liệu đơn hàng nhận từ Order Service
export type Order = {
  id: number;
  customerName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ProductCost)
    private readonly costRepo: Repository<ProductCost>, // Repository quản lý giá vốn sản phẩm
    @InjectRepository(SavedReport)
    private readonly reportRepo: Repository<SavedReport>, // Repository lưu các kỳ báo cáo
    @InjectRepository(SavedReportItem)
    private readonly itemRepo: Repository<SavedReportItem>, // Repository lưu chi tiết từng dòng báo cáo
  ) {}

  // =====================================================================
  // CHỨC NĂNG 1: THỐNG KÊ TỔNG QUAN (OVERVIEW)
  // Tính toán: Tổng tồn kho, Tổng hàng bán được, Doanh thu, Chi phí, Lợi nhuận
  // =====================================================================
  async getOverview(authorization?: string) {
    // Bước 1: Gọi Product Service (:3001) lấy danh sách sản phẩm
    const products = await this.fetchProducts(authorization);

    // Bước 2: Gọi Order Service (:3002) lấy danh sách đơn hàng
    const orders = await this.fetchOrders(authorization);

    // Bước 3: Nạp bảng giá vốn của các sản phẩm từ CSDL ReportDB
    const costMap = await this.getCostMap(products);

    // Chỉ số 1: HÀNG TỒN KHO = Tổng số lượng còn lại của toàn bộ sản phẩm
    const totalInventory = products.reduce(
      (sum, p) => sum + Number(p.quantity || 0),
      0,
    );

    // Chỉ số 2 & 3 & 4: Lọc các đơn hàng hợp lệ (loại trừ các đơn bị HỦY - CANCELLED)
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');

    let totalSold = 0;       // Tổng số lượng hàng bán được
    let totalRevenue = 0;    // Tổng doanh thu bán hàng
    let totalCost = 0;       // Tổng chi phí (giá vốn hàng bán - COGS)

    for (const order of validOrders) {
      totalRevenue += Number(order.totalAmount || 0);

      for (const item of order.items || []) {
        totalSold += Number(item.quantity || 0);

        // Lấy giá vốn của sản phẩm (nếu chưa cấu hình thì mặc định = 70% giá bán)
        const costPrice =
          costMap.get(item.productId) ?? Number(item.unitPrice) * 0.7;

        // Chi phí của món = Số lượng bán * Giá vốn
        totalCost += Number(item.quantity || 0) * costPrice;
      }
    }

    // Chỉ số 5: LỢI NHUẬN = Doanh thu - Chi phí
    const totalProfit = totalRevenue - totalCost;

    // Tỷ suất lợi nhuận (%) = (Lợi nhuận / Doanh thu) * 100
    const profitMargin =
      totalRevenue > 0
        ? Number(((totalProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      title: 'Báo cáo tổng quan thống kê kinh doanh',
      generatedAt: new Date(),
      totalInventory,      // Số lượng hàng tồn
      totalSold,           // Hàng bán được
      totalRevenue,        // Doanh thu
      totalCost,           // Chi phí (giá vốn)
      totalProfit,         // Lợi nhuận gộp
      profitMargin,        // Tỷ suất lợi nhuận (%)
      totalProductsCount: products.length,
      totalOrdersCount: orders.length,
      activeOrdersCount: validOrders.length,
      cancelledOrdersCount: orders.length - validOrders.length,
    };
  }

  // =====================================================================
  // CHỨC NĂNG 2: BÁO CÁO THỐNG KÊ THEO SẢN PHẨM (REPORT BY PRODUCT)
  // Với từng sản phẩm: Số lượng tồn, Số lượng bán, Doanh thu, Chi phí, Lợi nhuận
  // =====================================================================
  async getReportByProducts(authorization?: string) {
    const products = await this.fetchProducts(authorization);
    const orders = await this.fetchOrders(authorization);
    const costMap = await this.getCostMap(products);

    // Lọc các đơn hàng hợp lệ (không tính đơn hủy)
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');

    // Gom tổng số lượng đã bán của từng sản phẩm từ các đơn hàng
    const soldMap = new Map<number, number>();
    for (const order of validOrders) {
      for (const item of order.items || []) {
        const current = soldMap.get(item.productId) ?? 0;
        soldMap.set(item.productId, current + Number(item.quantity || 0));
      }
    }

    // Tổng hợp báo cáo chi tiết cho từng sản phẩm
    return products.map((product) => {
      const inventoryQuantity = Number(product.quantity || 0); // Hàng tồn kho hiện tại
      const soldQuantity = soldMap.get(product.id) ?? 0;       // Hàng bán được
      const sellingPrice = Number(product.price || 0);         // Giá bán
      const costPrice =
        costMap.get(product.id) ?? Math.round(sellingPrice * 0.7); // Giá vốn

      const revenue = soldQuantity * sellingPrice;             // Doanh thu từ sản phẩm này
      const cost = soldQuantity * costPrice;                   // Chi phí vốn của sản phẩm này
      const profit = revenue - cost;                           // Lợi nhuận từ sản phẩm này
      const profitMargin =
        revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0;

      return {
        productId: product.id,
        productName: product.name,
        sellingPrice,
        costPrice,
        inventoryQuantity, // Số lượng hàng tồn
        soldQuantity,      // Hàng bán được
        revenue,           // Doanh thu
        cost,              // Chi phí
        profit,            // Lợi nhuận
        profitMargin,      // Tỷ suất lợi nhuận (%)
      };
    });
  }

  // =====================================================================
  // CHỨC NĂNG 3: BÁO CÁO THỐNG KÊ THEO ĐƠN HÀNG (REPORT BY ORDER)
  // Với từng đơn hàng: Khách hàng, Trạng thái, Doanh thu, Chi phí vốn, Lợi nhuận
  // =====================================================================
  async getReportByOrders(authorization?: string, statusFilter?: string) {
    const products = await this.fetchProducts(authorization);
    const orders = await this.fetchOrders(authorization);
    const costMap = await this.getCostMap(products);

    let filtered = orders;
    if (statusFilter) {
      filtered = filtered.filter(
        (o) => o.status.toUpperCase() === statusFilter.toUpperCase(),
      );
    }

    return filtered.map((order) => {
      const isCancelled = order.status === 'CANCELLED';
      const revenue = isCancelled ? 0 : Number(order.totalAmount || 0); // Doanh thu đơn hàng

      let totalQuantity = 0;
      let cost = 0; // Tổng chi phí vốn của đơn hàng

      // Chi tiết từng sản phẩm trong đơn hàng
      const itemsDetail = (order.items || []).map((item) => {
        totalQuantity += Number(item.quantity || 0);
        const costPrice =
          costMap.get(item.productId) ?? Number(item.unitPrice) * 0.7;

        const lineRevenue = isCancelled
          ? 0
          : Number(item.quantity) * Number(item.unitPrice);
        const lineCost = isCancelled ? 0 : Number(item.quantity) * costPrice;
        const lineProfit = lineRevenue - lineCost;

        if (!isCancelled) {
          cost += lineCost;
        }

        return {
          productId: item.productId,
          productName: item.productName || `Sản phẩm #${item.productId}`,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          costPrice,
          lineRevenue,
          lineCost,
          lineProfit,
        };
      });

      const profit = revenue - cost; // Lợi nhuận của đơn hàng

      return {
        orderId: order.id,
        customerName: order.customerName,
        status: order.status,
        createdAt: order.createdAt,
        totalQuantity, // Tổng số lượng sản phẩm trong đơn
        revenue,       // Doanh thu đơn hàng
        cost,          // Chi phí vốn đơn hàng
        profit,        // Lợi nhuận đơn hàng
        items: itemsDetail,
      };
    });
  }

  // =====================================================================
  // CHỨC NĂNG 4: LƯU BÁO CÁO VÀO CƠ SỞ DỮ LIỆU REPORTDB (SNAPSHOT)
  // Lưu giữ số liệu kinh doanh tại thời điểm báo cáo để phục vụ lưu trữ lịch sử
  // =====================================================================
  async generateAndSaveReport(
    dto: GenerateReportDto,
    authorization?: string,
  ) {
    const overview = await this.getOverview(authorization);
    const productReports = await this.getReportByProducts(authorization);
    const orderReports = await this.getReportByOrders(authorization);

    const title =
      dto.title ||
      `Báo cáo thống kê SOA - ${new Date().toLocaleString('vi-VN')}`;

    // Tạo bản ghi tổng quan trong bảng saved_reports
    const report = this.reportRepo.create({
      title,
      totalInventory: overview.totalInventory,
      totalSold: overview.totalSold,
      totalRevenue: overview.totalRevenue,
      totalCost: overview.totalCost,
      totalProfit: overview.totalProfit,
    });

    const savedReport = await this.reportRepo.save(report);

    // Lưu chi tiết từng sản phẩm vào bảng saved_report_items
    const items: SavedReportItem[] = [];
    for (const p of productReports) {
      items.push(
        this.itemRepo.create({
          report: savedReport,
          itemType: 'PRODUCT',
          refId: p.productId,
          name: p.productName,
          quantityStock: p.inventoryQuantity,
          quantitySold: p.soldQuantity,
          revenue: p.revenue,
          cost: p.cost,
          profit: p.profit,
        }),
      );
    }

    // Lưu chi tiết từng đơn hàng vào bảng saved_report_items
    for (const o of orderReports) {
      items.push(
        this.itemRepo.create({
          report: savedReport,
          itemType: 'ORDER',
          refId: o.orderId,
          name: `Đơn #${o.orderId} - ${o.customerName} (${o.status})`,
          quantityStock: 0,
          quantitySold: o.totalQuantity,
          revenue: o.revenue,
          cost: o.cost,
          profit: o.profit,
        }),
      );
    }

    await this.itemRepo.save(items);
    return this.getHistoryById(savedReport.id);
  }

  // =====================================================================
  // CHỨC NĂNG 5: XEM LỊCH SỬ CÁC BÁO CÁO ĐÃ LƯU TRONG REPORTDB
  // =====================================================================
  getHistory() {
    return this.reportRepo.find({
      order: { id: 'DESC' },
    });
  }

  // Xem chi tiết một bản báo cáo lịch sử theo ID
  async getHistoryById(id: number) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo ID: ${id}`);
    }
    return report;
  }

  // =====================================================================
  // CHỨC NĂNG 6: QUẢN LÝ BẢNG GIÁ VỐN SẢN PHẨM (product_costs)
  // Cho phép xem và tùy chỉnh giá vốn của từng sản phẩm để tính lợi nhuận
  // =====================================================================
  getCosts() {
    return this.costRepo.find({ order: { productId: 'ASC' } });
  }

  async setCost(
    productId: number,
    dto: SetCostPriceDto,
    authorization?: string,
  ) {
    const products = await this.fetchProducts(authorization);
    const prod = products.find((p) => p.id === productId);
    const productName = prod ? prod.name : `Sản phẩm #${productId}`;

    let cost = await this.costRepo.findOneBy({ productId });
    if (!cost) {
      cost = this.costRepo.create({
        productId,
        productName,
        costPrice: dto.costPrice,
      });
    } else {
      cost.costPrice = dto.costPrice;
      cost.productName = productName;
    }

    return this.costRepo.save(cost);
  }

  // =====================================================================
  // CÁC HÀM PHỤ TRỢ (HELPER METHODS) - GIAO TIẾP LIÊN DỊCH VỤ HTTP SOA
  // =====================================================================

  // Lấy ánh xạ bảng giá vốn từ CSDL ReportDB
  private async getCostMap(products: Product[]): Promise<Map<number, number>> {
    const costs = await this.costRepo.find();
    const map = new Map<number, number>();
    for (const c of costs) {
      map.set(c.productId, Number(c.costPrice));
    }
    // Với sản phẩm chưa cấu hình giá vốn: mặc định giá vốn = 70% giá bán
    for (const p of products) {
      if (!map.has(p.id)) {
        map.set(p.id, Math.round(Number(p.price) * 0.7));
      }
    }
    return map;
  }

  // Gọi HTTP GET sang Product Service (:3001) để lấy danh sách sản phẩm và tồn kho
  private async fetchProducts(authorization?: string): Promise<Product[]> {
    try {
      const res = await fetch(`${productServiceUrl}/products`, {
        headers: authorization ? { authorization } : {},
      });
      if (!res.ok) {
        throw new BadGatewayException(
          `Product Service trả về lỗi HTTP ${res.status}`,
        );
      }
      return (await res.json()) as Product[];
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException(
        `Không thể kết nối Product Service tại ${productServiceUrl}`,
      );
    }
  }

  // Gọi HTTP GET sang Order Service (:3002) để lấy danh sách đơn hàng và số lượng bán
  private async fetchOrders(authorization?: string): Promise<Order[]> {
    try {
      const res = await fetch(`${orderServiceUrl}/orders`, {
        headers: authorization ? { authorization } : {},
      });
      if (!res.ok) {
        throw new BadGatewayException(
          `Order Service trả về lỗi HTTP ${res.status}`,
        );
      }
      return (await res.json()) as Order[];
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException(
        `Không thể kết nối Order Service tại ${orderServiceUrl}`,
      );
    }
  }
}

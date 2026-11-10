import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateReportDto, SetCostPriceDto } from './report.dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * [GET] /reports/overview
   * Chức năng: Thống kê tổng quan toàn hệ thống
   * Trả về: Tổng tồn kho, Tổng hàng bán được, Doanh thu, Chi phí, Lợi nhuận, Tỷ suất lợi nhuận
   */
  @Get('overview')
  getOverview(@Headers('authorization') authorization?: string) {
    return this.reportsService.getOverview(authorization);
  }

  /**
   * [GET] /reports/products
   * Chức năng: Báo cáo chi tiết theo sản phẩm
   * Trả về: Danh sách sản phẩm với số lượng tồn kho, số lượng đã bán, doanh thu, chi phí, lợi nhuận từng món
   */
  @Get('products')
  getReportByProducts(@Headers('authorization') authorization?: string) {
    return this.reportsService.getReportByProducts(authorization);
  }

  /**
   * [GET] /reports/orders
   * Chức năng: Báo cáo chi tiết theo đơn hàng
   * Hỗ trợ lọc theo trạng thái: ?status=CONFIRMED, ?status=COMPLETED, v.v.
   * Trả về: Doanh thu, chi phí vốn, lợi nhuận của từng đơn hàng
   */
  @Get('orders')
  getReportByOrders(
    @Query('status') status?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.reportsService.getReportByOrders(authorization, status);
  }

  /**
   * [POST] /reports/generate
   * Chức năng: Tạo và lưu snapshot kỳ báo cáo vào CSDL ReportDB
   * Body: { "title": "Báo cáo tài chính tháng 11" }
   */
  @Post('generate')
  generateAndSaveReport(
    @Body() dto: GenerateReportDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.reportsService.generateAndSaveReport(dto, authorization);
  }

  /**
   * [GET] /reports/history
   * Chức năng: Xem lịch sử các kỳ báo cáo đã lưu trong CSDL ReportDB
   */
  @Get('history')
  getHistory() {
    return this.reportsService.getHistory();
  }

  /**
   * [GET] /reports/history/:id
   * Chức năng: Xem chi tiết 1 kỳ báo cáo lịch sử theo mã ID
   */
  @Get('history/:id')
  getHistoryById(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.getHistoryById(id);
  }

  /**
   * [GET] /reports/costs
   * Chức năng: Xem bảng cấu hình giá vốn của các sản phẩm
   */
  @Get('costs')
  getCosts() {
    return this.reportsService.getCosts();
  }

  /**
   * [PUT] /reports/costs/:productId
   * Chức năng: Cập nhật giá vốn cho một sản phẩm cụ thể
   * Body: { "costPrice": 11500000 }
   */
  @Put('costs/:productId')
  setCost(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SetCostPriceDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.reportsService.setCost(productId, dto, authorization);
  }
}

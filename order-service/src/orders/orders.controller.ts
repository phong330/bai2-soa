import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AddOrderItemDto,
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderItemDto,
  UpdateOrderStatusDto,
} from './order.dto';
import { OrdersService } from './orders.service';

/**
 * =====================================================================
 * CONTROLLER ĐIỀU HƯỚNG CÁC API ĐƠN HÀNG (ORDER SERVICE - PORT 3002)
 * Bảo vệ bởi JwtAuthGuard - Yêu cầu Bearer JWT Token từ Auth Service
 * =====================================================================
 */
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * [GET] /orders
   * Lấy danh sách toàn bộ đơn hàng kèm chi tiết sản phẩm
   */
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  /**
   * [GET] /orders/:id
   * Lấy thông tin chi tiết một đơn hàng theo ID
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  /**
   * [POST] /orders
   * Tạo một đơn hàng mới (tự động kiểm tra và trừ tồn kho từ Product Service)
   */
  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.create(dto, authorization);
  }

  /**
   * [PATCH] /orders/:id/status
   * Cập nhật trạng thái đơn hàng (CONFIRMED, SHIPPED, COMPLETED, CANCELLED)
   */
  @Patch(':id/status')
  updateStatusPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, authorization);
  }

  /**
   * [PUT] /orders/:id/status
   * Cập nhật trạng thái đơn hàng (tương đương PATCH)
   */
  @Put(':id/status')
  updateStatusPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, authorization);
  }

  /**
   * [PUT] /orders/:id
   * Cập nhật toàn bộ thông tin đơn hàng (tên khách hàng, trạng thái, danh sách mặt hàng)
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.update(id, dto, authorization);
  }

  /**
   * [DELETE] /orders/:id
   * Xóa đơn hàng (tự động hoàn lại tồn kho về Product Service nếu đơn chưa bị hủy)
   */
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.remove(id, authorization);
  }

  /**
   * [POST] /orders/:id/items
   * Thêm một sản phẩm vào đơn hàng hiện có
   */
  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderItemDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.addItem(id, dto, authorization);
  }

  /**
   * [PUT] /orders/:id/items/:itemId
   * Cập nhật số lượng của một mặt hàng trong đơn
   */
  @Put(':id/items/:itemId')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.updateItem(id, itemId, dto, authorization);
  }

  /**
   * [DELETE] /orders/:id/items/:itemId
   * Xóa một mặt hàng khỏi đơn hàng và hoàn lại tồn kho
   */
  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.removeItem(id, itemId, authorization);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { ProductsService } from './products.service';

/**
 * =====================================================================
 * CONTROLLER ĐIỀU HƯỚNG CÁC API SẢN PHẨM (PORT 3001)
 * Bảo vệ bởi JwtAuthGuard - Yêu cầu Bearer JWT Token từ Auth Service
 * =====================================================================
 */
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /**
   * [GET] /products
   * Lấy danh sách tất cả sản phẩm
   */
  @Get()
  findAll() {
    return this.products.findAll();
  }

  /**
   * [GET] /products/:id
   * Lấy thông tin chi tiết một sản phẩm theo ID
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }

  /**
   * [POST] /products
   * Thêm mới một sản phẩm
   */
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  /**
   * [PUT] /products/:id
   * Cập nhật thông tin hoặc số lượng tồn kho của sản phẩm
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto);
  }

  /**
   * [DELETE] /products/:id
   * Xóa một sản phẩm
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.products.remove(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto } from './product.dto';

/**
 * =====================================================================
 * SERVICE QUẢN LÝ SẢN PHẨM (PRODUCT SERVICE - PORT 3001)
 * Kiến trúc SOA: Dịch vụ độc lập phụ trách toàn bộ nghiệp vụ sản phẩm,
 * quản lý kho hàng và lưu trữ trong CSDL riêng biệt (ProductDB).
 * =====================================================================
 */
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  /**
   * Lấy danh sách tất cả sản phẩm trong kho
   * @returns Danh sách sản phẩm sắp xếp theo ID tăng dần
   */
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  /**
   * Tìm thông tin chi tiết một sản phẩm theo mã ID
   * @param id Mã sản phẩm
   * @returns Đối tượng sản phẩm hoặc ném ngoại lệ NotFoundException nếu không tìm thấy
   */
  async findOne(id: number) {
    const product = await this.repo.findOneBy({ id });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với mã ID: ${id}`);
    }
    return product;
  }

  /**
   * Thêm sản phẩm mới vào kho hàng
   * @param dto Dữ liệu tạo sản phẩm (name, description, price, quantity)
   * @returns Sản phẩm mới vừa được lưu vào CSDL ProductDB
   */
  create(dto: CreateProductDto) {
    return this.repo.save(this.repo.create(dto));
  }

  /**
   * Cập nhật thông tin hoặc số lượng tồn kho của sản phẩm
   * Dịch vụ Order Service gọi hàm này qua REST API khi đặt hàng hoặc hủy đơn
   * @param id Mã sản phẩm cần cập nhật
   * @param dto Dữ liệu cập nhật
   * @returns Sản phẩm sau khi cập nhật thành công
   */
  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  /**
   * Xóa một sản phẩm khỏi danh mục
   * @param id Mã sản phẩm cần xóa
   * @returns Thông báo xóa thành công kèm ID sản phẩm
   */
  async remove(id: number) {
    const product = await this.findOne(id);
    await this.repo.remove(product);
    return { message: 'Xóa sản phẩm thành công', id };
  }
}

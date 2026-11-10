import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from './order.entity';

export class OrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1, { message: 'productId phải lớn hơn hoặc bằng 1' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải lớn hơn hoặc bằng 1' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsString({ message: 'customerName phải là chuỗi ký tự' })
  @Length(1, 255, { message: 'customerName phải từ 1 đến 255 ký tự' })
  customerName!: string;

  @IsArray({ message: 'items phải là mảng danh sách sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString({ message: 'customerName phải là chuỗi ký tự' })
  @Length(1, 255, { message: 'customerName phải từ 1 đến 255 ký tự' })
  customerName?: string;

  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'status phải là một trong: PENDING, CONFIRMED, SHIPPED, COMPLETED, CANCELLED',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsArray({ message: 'items phải là mảng danh sách sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'status phải là một trong: PENDING, CONFIRMED, SHIPPED, COMPLETED, CANCELLED',
  })
  status!: OrderStatus;
}

export class AddOrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1, { message: 'productId phải lớn hơn hoặc bằng 1' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải lớn hơn hoặc bằng 1' })
  quantity!: number;
}

export class UpdateOrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải lớn hơn hoặc bằng 1' })
  quantity!: number;
}

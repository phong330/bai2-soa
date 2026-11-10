import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class SetCostPriceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'costPrice phải là số hợp lệ' })
  @Min(0, { message: 'costPrice không được âm' })
  costPrice!: number;
}

export class GenerateReportDto {
  @IsOptional()
  @IsString({ message: 'title phải là chuỗi' })
  @Length(1, 255, { message: 'title từ 1 đến 255 ký tự' })
  title?: string;
}


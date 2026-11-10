import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('product_costs')
export class ProductCost {
  @PrimaryColumn({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2 })
  costPrice!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;
}


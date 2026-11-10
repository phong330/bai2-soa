import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SavedReportItem } from './saved-report-item.entity';

@Entity('saved_reports')
export class SavedReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'total_inventory', type: 'int', default: 0 })
  totalInventory!: number;

  @Column({ name: 'total_sold', type: 'int', default: 0 })
  totalSold!: number;

  @Column({
    name: 'total_revenue',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalRevenue!: number;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalCost!: number;

  @Column({
    name: 'total_profit',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalProfit!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;

  @OneToMany(() => SavedReportItem, (item) => item.report, {
    cascade: true,
    eager: true,
  })
  items!: SavedReportItem[];
}


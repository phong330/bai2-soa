import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SavedReport } from './saved-report.entity';

@Entity('saved_report_items')
export class SavedReportItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'item_type', type: 'varchar', length: 20 })
  itemType!: 'PRODUCT' | 'ORDER';

  @Column({ name: 'ref_id', type: 'int' })
  refId!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'quantity_stock', type: 'int', default: 0 })
  quantityStock!: number;

  @Column({ name: 'quantity_sold', type: 'int', default: 0 })
  quantitySold!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  revenue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  profit!: number;

  @ManyToOne(() => SavedReport, (report) => report.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report!: SavedReport;
}


import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Supplier } from './supplier.entity';
import { BoxType } from './box-type.entity';
import { ScanRecord } from './scan-record.entity';

@Entity('code_strings')
export class CodeString {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 22 })
  code: string;

  @Column({ name: 'supplier_id' })
  supplier_id: string;

  @ManyToOne(() => Supplier, (s) => s.code_strings)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'box_type_id' })
  box_type_id: string;

  @ManyToOne(() => BoxType, (bt) => bt.code_strings)
  @JoinColumn({ name: 'box_type_id' })
  box_type: BoxType;

  @Column({ default: 0 })
  scan_count: number;

  @Column({ default: false })
  is_deleted: boolean;

  @OneToMany(() => ScanRecord, (sr) => sr.code_string)
  scan_records: ScanRecord[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

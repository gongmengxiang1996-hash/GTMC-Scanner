import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CodeString } from './code-string.entity';
import { Supplier } from './supplier.entity';

@Entity('scan_records')
export class ScanRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code_string_id' })
  code_string_id: string;

  @ManyToOne(() => CodeString, (cs) => cs.scan_records)
  @JoinColumn({ name: 'code_string_id' })
  code_string: CodeString;

  @Column({ name: 'supplier_id' })
  supplier_id: string;

  @ManyToOne(() => Supplier, (s) => s.scan_records)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  device_id: string;

  @Column({ default: false })
  is_over_limit: boolean;

  @CreateDateColumn({ name: 'scanned_at' })
  scanned_at: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CodeString } from './code-string.entity';
import { ScanRecord } from './scan-record.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 5 })
  code: string;

  @Column()
  password_hash: string;

  @Column({ type: 'varchar', nullable: true })
  device_id: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => CodeString, (cs) => cs.supplier)
  code_strings: CodeString[];

  @OneToMany(() => ScanRecord, (sr) => sr.supplier)
  scan_records: ScanRecord[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

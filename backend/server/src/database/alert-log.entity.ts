import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Supplier } from './supplier.entity';
import { CodeString } from './code-string.entity';

@Entity('alert_logs')
export class AlertLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplier_id: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'code_string_id' })
  code_string_id: string;

  @ManyToOne(() => CodeString)
  @JoinColumn({ name: 'code_string_id' })
  code_string: CodeString;

  @Column()
  message: string;

  @Column({ default: false })
  is_reset: boolean;

  @CreateDateColumn()
  created_at: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity('unregistered_attempts')
export class UnregisteredAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 22 })
  code_string: string;

  @Column({ name: 'supplier_id' })
  supplier_id: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  device_id: string;

  @CreateDateColumn({ name: 'attempted_at' })
  attempted_at: Date;
}

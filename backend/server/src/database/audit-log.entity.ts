import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserType {
  SUPPLIER = 'supplier',
  ADMIN = 'admin',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserType })
  user_type: UserType;

  @Column()
  user_id: string;

  @Column()
  action: string;

  @Column({ type: 'varchar', nullable: true })
  detail: string;

  @CreateDateColumn()
  created_at: Date;
}

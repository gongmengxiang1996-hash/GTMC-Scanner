import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CodeString } from './code-string.entity';

@Entity('box_types')
export class BoxType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  max_scan_count: number;

  @OneToMany(() => CodeString, (cs) => cs.box_type)
  code_strings: CodeString[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

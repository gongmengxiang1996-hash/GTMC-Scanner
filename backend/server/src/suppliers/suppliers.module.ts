import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { Supplier } from '../database/supplier.entity';
import { AuditLog } from '../database/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, AuditLog])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}

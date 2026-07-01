import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { AlertLog } from '../database/alert-log.entity';
import { UnregisteredAttempt } from '../database/unregistered-attempt.entity';
import { AuditLog } from '../database/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertLog, UnregisteredAttempt, AuditLog])],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}

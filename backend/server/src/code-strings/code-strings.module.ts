import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeStringsController } from './code-strings.controller';
import { CodeStringsService } from './code-strings.service';
import { CodeString } from '../database/code-string.entity';
import { BoxType } from '../database/box-type.entity';
import { ScanRecord } from '../database/scan-record.entity';
import { AuditLog } from '../database/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CodeString, BoxType, ScanRecord, AuditLog])],
  controllers: [CodeStringsController],
  providers: [CodeStringsService],
  exports: [CodeStringsService],
})
export class CodeStringsModule {}

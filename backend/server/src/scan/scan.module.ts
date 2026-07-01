import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { CodeString } from '../database/code-string.entity';
import { BoxType } from '../database/box-type.entity';
import { ScanRecord } from '../database/scan-record.entity';
import { AlertLog } from '../database/alert-log.entity';
import { UnregisteredAttempt } from '../database/unregistered-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CodeString, BoxType, ScanRecord, AlertLog, UnregisteredAttempt])],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}

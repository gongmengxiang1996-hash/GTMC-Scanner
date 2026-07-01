import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxTypesController } from './box-types.controller';
import { BoxTypesService } from './box-types.service';
import { BoxType } from '../database/box-type.entity';
import { AuditLog } from '../database/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoxType, AuditLog])],
  controllers: [BoxTypesController],
  providers: [BoxTypesService],
  exports: [BoxTypesService],
})
export class BoxTypesModule {}

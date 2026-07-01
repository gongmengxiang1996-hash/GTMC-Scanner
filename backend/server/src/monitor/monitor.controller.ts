import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MonitorService } from './monitor.service';

@Controller('admin/monitor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MonitorController {
  constructor(private monitorService: MonitorService) {}

  @Get('alert-logs')
  getAlertLogs(@Query() query: any) {
    return this.monitorService.getAlertLogs(query);
  }

  @Get('unregistered-attempts')
  getUnregisteredAttempts(@Query() query: any) {
    return this.monitorService.getUnregisteredAttempts(query);
  }

  @Get('audit-logs')
  getAuditLogs(@Query() query: any) {
    return this.monitorService.getAuditLogs(query);
  }

  @Put('alert-logs/:id/reset')
  resetAlertLog(@Param('id') id: string) {
    return this.monitorService.resetAlertLog(id);
  }
}

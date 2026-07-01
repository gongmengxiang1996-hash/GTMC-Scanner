import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ScanService } from './scan.service';

@Controller('scan')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supplier')
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Post()
  scan(@Req() req: any, @Body() body: { code: string; device_id: string }) {
    return this.scanService.scan(req.user.sub, body.device_id, body.code);
  }
}

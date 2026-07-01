import { Controller, Get, Post, Delete, Put, Body, Param, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CodeStringsService } from './code-strings.service';
import { CreateCodeStringDto } from './dto/create-code-string.dto';

@Controller('supplier/codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supplier')
export class CodeStringsController {
  constructor(private codeStringsService: CodeStringsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.codeStringsService.findAll(req.user.sub, query);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCodeStringDto) {
    return this.codeStringsService.create(req.user.sub, req.user.code, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCSV(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('请上传CSV文件');
    return this.codeStringsService.importCSV(req.user.sub, req.user.code, file);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.codeStringsService.remove(req.user.sub, id);
  }

  @Put(':id/reset-scan-count')
  resetScanCount(@Req() req: any, @Param('id') id: string) {
    return this.codeStringsService.resetScanCount(req.user.sub, id);
  }

  @Get(':id/scan-records')
  getScanRecords(@Req() req: any, @Param('id') id: string, @Query() query: any) {
    return this.codeStringsService.getScanRecords(req.user.sub, id, query);
  }
}

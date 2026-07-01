import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

@Controller('admin/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('请上传CSV文件');
    return this.suppliersService.importCSV(file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  @Post(':id/unbind-device')
  unbindDevice(@Param('id') id: string) {
    return this.suppliersService.unbindDevice(id);
  }

  @Get(':id/password-raw')
  getPasswordRaw(@Param('id') id: string) {
    return this.suppliersService.getPasswordRaw(id);
  }

  @Put(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.suppliersService.resetPassword(id);
  }
}

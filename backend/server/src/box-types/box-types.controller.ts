import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BoxTypesService } from './box-types.service';
import { CreateBoxTypeDto } from './dto/create-box-type.dto';

@Controller('admin/box-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class BoxTypesController {
  constructor(private boxTypesService: BoxTypesService) {}

  @Get()
  @Roles('supplier', 'admin')
  findAll() {
    return this.boxTypesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBoxTypeDto) {
    return this.boxTypesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateBoxTypeDto) {
    return this.boxTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boxTypesService.remove(id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('请上传CSV文件');
    return this.boxTypesService.importCSV(file);
  }
}

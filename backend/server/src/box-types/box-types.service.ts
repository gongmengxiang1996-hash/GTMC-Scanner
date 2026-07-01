import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { BoxType } from '../database/box-type.entity';
import { AuditLog, UserType } from '../database/audit-log.entity';
import { CreateBoxTypeDto } from './dto/create-box-type.dto';

@Injectable()
export class BoxTypesService {
  constructor(
    @InjectRepository(BoxType)
    private boxTypeRepo: Repository<BoxType>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async findAll() {
    return this.boxTypeRepo.find({ order: { created_at: 'DESC' } });
  }

  async create(dto: CreateBoxTypeDto) {
    const exists = await this.boxTypeRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('该箱种已存在');

    const boxType = this.boxTypeRepo.create(dto);
    await this.boxTypeRepo.save(boxType);

    await this.logAudit('CREATE_BOX_TYPE', `创建箱种 ${dto.name}, 扫描次数限制 ${dto.max_scan_count}`);
    return boxType;
  }

  async update(id: string, dto: CreateBoxTypeDto) {
    const boxType = await this.boxTypeRepo.findOne({ where: { id } });
    if (!boxType) throw new NotFoundException('箱种不存在');

    boxType.name = dto.name;
    boxType.max_scan_count = dto.max_scan_count;
    await this.boxTypeRepo.save(boxType);

    await this.logAudit('UPDATE_BOX_TYPE', `更新箱种 ${dto.name}`);
    return boxType;
  }

  async remove(id: string) {
    const boxType = await this.boxTypeRepo.findOne({ where: { id } });
    if (!boxType) throw new NotFoundException('箱种不存在');
    await this.boxTypeRepo.remove(boxType);

    await this.logAudit('DELETE_BOX_TYPE', `删除箱种 ${boxType.name}`);
    return { message: '已删除' };
  }

  async importCSV(file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');
    const records: string[][] = parse(content, { skip_empty_lines: true });

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < records.length; i++) {
      const name = records[i][0]?.trim();
      const countStr = records[i][1]?.trim();

      if (!name) {
        results.errors.push(`第${i + 1}行: 箱种名称为空`);
        results.skipped++;
        continue;
      }

      const max_scan_count = parseInt(countStr, 10);
      if (!countStr || isNaN(max_scan_count) || max_scan_count < 1) {
        results.errors.push(`第${i + 1}行: 扫描次数上限 "${countStr}" 无效（应为正整数）`);
        results.skipped++;
        continue;
      }

      const exists = await this.boxTypeRepo.findOne({ where: { name } });
      if (exists) {
        results.skipped++;
        continue;
      }

      await this.boxTypeRepo.save(this.boxTypeRepo.create({ name, max_scan_count }));
      results.created++;
    }

    await this.logAudit('IMPORT_BOX_TYPES', `CSV批量导入: 成功${results.created}, 跳过${results.skipped}`);
    return results;
  }

  private async logAudit(action: string, detail: string) {
    await this.auditLogRepo.save({
      user_type: UserType.ADMIN,
      user_id: 'admin',
      action,
      detail,
    });
  }
}

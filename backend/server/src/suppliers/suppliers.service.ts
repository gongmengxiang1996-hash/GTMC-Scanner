import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { Supplier } from '../database/supplier.entity';
import { AuditLog, UserType } from '../database/audit-log.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

const INITIAL_PASSWORD = '123456';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async findAll(query: QuerySupplierDto) {
    const { search, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (search) {
      where.code = Like(`%${search}%`);
    }

    const [items, total] = await this.supplierRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    // 密码脱敏
    const list = items.map((s) => ({
      id: s.id,
      code: s.code,
      password_masked: '******',
      device_id: s.device_id,
      is_active: s.is_active,
      created_at: s.created_at,
    }));

    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    const s = await this.supplierRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('供应商不存在');

    return {
      id: s.id,
      code: s.code,
      password_masked: '******',
      password_raw: s.password_hash, // 供复制用（前端自行 copy 明文需走特殊接口）
      device_id: s.device_id,
      is_active: s.is_active,
      created_at: s.created_at,
    };
  }

  async create(dto: CreateSupplierDto) {
    const exists = await this.supplierRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new BadRequestException('该供应商代码已存在');
    }
    const password_hash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    const supplier = this.supplierRepo.create({ code: dto.code, password_hash });
    await this.supplierRepo.save(supplier);

    await this.logAudit(supplier.id, 'CREATE_SUPPLIER', `创建供应商 ${dto.code}`);
    return { id: supplier.id, code: supplier.code };
  }

  async importCSV(file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');
    const delimiter = content.includes('\t') && !content.includes(',') ? '\t' : ',';
    const records: string[][] = parse(content, { skip_empty_lines: true, delimiter });

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < records.length; i++) {
      const code = records[i][0]?.trim();
      if (!code) {
        results.errors.push(`第${i + 1}行: 空代码`);
        results.skipped++;
        continue;
      }
      if (!/^[A-Z0-9]{5}$/.test(code)) {
        results.errors.push(`第${i + 1}行: 代码 "${code}" 格式不正确（需5位数字+大写字母）`);
        results.skipped++;
        continue;
      }

      const exists = await this.supplierRepo.findOne({ where: { code } });
      if (exists) {
        results.skipped++;
        continue;
      }

      const password_hash = await bcrypt.hash(INITIAL_PASSWORD, 10);
      await this.supplierRepo.save(this.supplierRepo.create({ code, password_hash }));
      results.created++;
    }

    await this.logAudit('batch', 'IMPORT_SUPPLIERS', `CSV批量导入: 成功${results.created}, 跳过${results.skipped}`);
    return results;
  }

  async remove(id: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    supplier.is_active = false;
    await this.supplierRepo.save(supplier);

    await this.logAudit(id, 'DELETE_SUPPLIER', `停用供应商 ${supplier.code}`);
    return { message: '已停用' };
  }

  async unbindDevice(id: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    supplier.device_id = '';
    await this.supplierRepo.save(supplier);

    await this.logAudit(id, 'UNBIND_DEVICE', `解除设备绑定 ${supplier.code}`);
    return { message: '设备已解绑' };
  }

  async getPasswordRaw(id: string): Promise<string> {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    return INITIAL_PASSWORD;
  }

  async resetPassword(id: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    supplier.password_hash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    await this.supplierRepo.save(supplier);

    await this.logAudit(id, 'RESET_PASSWORD', `重置密码 ${supplier.code}`);
    return { message: '密码已重置', code: supplier.code, new_password: INITIAL_PASSWORD };
  }

  private async logAudit(userId: string, action: string, detail: string) {
    await this.auditLogRepo.save({
      user_type: UserType.ADMIN,
      user_id: userId,
      action,
      detail,
    });
  }
}

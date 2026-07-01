import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { CodeString } from '../database/code-string.entity';
import { BoxType } from '../database/box-type.entity';
import { ScanRecord } from '../database/scan-record.entity';
import { AuditLog, UserType } from '../database/audit-log.entity';
import { CreateCodeStringDto } from './dto/create-code-string.dto';

/**
 * 校验 22 位编码字符串是否符合 5 条规则。纯校验，不编码。
 * @returns null 表示通过，否则返回中文错误信息
 */
function validateCodeString(
  code: string,
  supplierCode: string,
  boxTypeName: string,
): string | null {
  // 规则①：第1位必须为 A/W/R
  const first = code[0];
  if (first !== 'A' && first !== 'W' && first !== 'R') {
    return `第1位字符必须为 A、W、R 之一，当前为 "${first}"`;
  }

  // 规则②：第2-6位（0-indexed: 1-5）与供应商代码一致
  if (code.substring(1, 6) !== supplierCode) {
    return `第2-6位必须与供应商代码 ${supplierCode} 一致，当前为 "${code.substring(1, 6)}"`;
  }

  // 规则③：第7-10位为年份后两位+月份（≤当前月）
  const now = new Date();
  const currentYear2 = String(now.getFullYear()).slice(-2);
  const currentMonth = now.getMonth() + 1;
  const yearPart = code.substring(6, 8);
  const monthPart = code.substring(8, 10);
  if (!/^\d{2}$/.test(yearPart) || !/^\d{2}$/.test(monthPart)) {
    return `第7-10位必须为4位数字（年份后两位+月份），当前为 "${code.substring(6, 10)}"`;
  }
  if (yearPart !== currentYear2) {
    return `第7-8位年份必须为 ${currentYear2}（当前年份后两位），当前为 "${yearPart}"`;
  }
  const monthNum = parseInt(monthPart, 10);
  if (monthNum < 1 || monthNum > 12) {
    return `第9-10位月份无效 "${monthPart}"（必须为 01-12）`;
  }
  if (monthNum > currentMonth) {
    return `第9-10位月份 ${monthPart} 超过当前月份（${String(currentMonth).padStart(2, '0')}）`;
  }

  // 规则④：第11-19位（0-indexed: 10-18）= 箱种代码左对齐，右侧补0到9位
  const expectedBoxPart = boxTypeName.padEnd(9, '0');
  const actualBoxPart = code.substring(10, 19);
  if (actualBoxPart !== expectedBoxPart) {
    return `第11-19位箱种代码错误，期望 "${expectedBoxPart}"（${boxTypeName} 左对齐补0），当前为 "${actualBoxPart}"`;
  }

  // 规则⑤：第20-22位（0-indexed: 19-21）必须为三位数字
  const serialPart = code.substring(19, 22);
  if (!/^\d{3}$/.test(serialPart)) {
    return `第20-22位必须为3位数字（000-999），当前为 "${serialPart}"`;
  }

  return null;
}

@Injectable()
export class CodeStringsService {
  constructor(
    @InjectRepository(CodeString)
    private codeStringRepo: Repository<CodeString>,
    @InjectRepository(BoxType)
    private boxTypeRepo: Repository<BoxType>,
    @InjectRepository(ScanRecord)
    private scanRecordRepo: Repository<ScanRecord>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async findAll(supplierId: string, query: { search?: string; box_type_id?: string; page?: number; pageSize?: number }) {
    const { search, box_type_id, page = 1, pageSize = 20 } = query;
    const where: any = { supplier_id: supplierId, is_deleted: false };

    if (search) {
      where.code = Like(`%${search}%`);
    }
    if (box_type_id) {
      where.box_type_id = box_type_id;
    }

    const [items, total] = await this.codeStringRepo.findAndCount({
      where,
      relations: ['box_type'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    const list = items.map((cs) => ({
      id: cs.id,
      code: cs.code,
      scan_count: cs.scan_count,
      box_type_name: cs.box_type?.name || '',
      box_type_id: cs.box_type_id,
      created_at: cs.created_at,
    }));

    return { list, total, page, pageSize };
  }

  async create(supplierId: string, supplierCode: string, dto: CreateCodeStringDto) {
    // 基本格式校验
    if (dto.code.length !== 22) {
      throw new BadRequestException('编码必须为22位');
    }

    // 先查箱种获取名称用于校验
    const boxType = await this.boxTypeRepo.findOne({ where: { id: dto.box_type_id } });
    if (!boxType) throw new BadRequestException('箱种不存在');

    // 5 规则校验
    const validationError = validateCodeString(dto.code, supplierCode, boxType.name);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    const exists = await this.codeStringRepo.findOne({ where: { code: dto.code, is_deleted: false } });
    if (exists) throw new BadRequestException('该编码字符串已存在（可能由其他供应商注册）');

    // 如果存在软删除的同码记录，恢复并重置
    const deleted = await this.codeStringRepo.findOne({ where: { code: dto.code, is_deleted: true } });
    if (deleted) {
      deleted.is_deleted = false;
      deleted.scan_count = 0;
      deleted.supplier_id = supplierId;
      deleted.box_type_id = dto.box_type_id;
      await this.codeStringRepo.save(deleted);
      await this.logAudit(supplierId, 'RESTORE_CODE', `恢复编码字符串 ${dto.code}`);
      return { id: deleted.id, code: deleted.code };
    }

    const cs = this.codeStringRepo.create({
      code: dto.code,
      supplier_id: supplierId,
      box_type_id: dto.box_type_id,
    });
    await this.codeStringRepo.save(cs);

    await this.logAudit(supplierId, 'CREATE_CODE', `新增编码字符串 ${dto.code}`);
    return { id: cs.id, code: cs.code };
  }

  async importCSV(supplierId: string, supplierCode: string, file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');
    // 自动检测分隔符：Tab 或 逗号
    const delimiter = content.includes('\t') && !content.includes(',') ? '\t' : ',';
    const records: string[][] = parse(content, { skip_empty_lines: true, delimiter });
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // 预加载所有箱种
    const boxTypes = await this.boxTypeRepo.find();
    const boxTypeMap = new Map(boxTypes.map(bt => [bt.name, bt.id]));

    for (let i = 0; i < records.length; i++) {
      const [code, boxTypeName] = records[i].map(c => c?.trim());
      if (!code || !boxTypeName) {
        results.errors.push(`第${i + 1}行: 缺少编码或箱种`);
        results.skipped++;
        continue;
      }
      if (code.length !== 22) {
        results.errors.push(`第${i + 1}行: 编码 "${code}" 长度不正确（需22位）`);
        results.skipped++;
        continue;
      }

      const boxTypeId = boxTypeMap.get(boxTypeName);
      if (!boxTypeId) {
        results.errors.push(`第${i + 1}行: 箱种 "${boxTypeName}" 未注册`);
        results.skipped++;
        continue;
      }

      const validationError = validateCodeString(code, supplierCode, boxTypeName);
      if (validationError) {
        results.errors.push(`第${i + 1}行: ${validationError}`);
        results.skipped++;
        continue;
      }

      const exists = await this.codeStringRepo.findOne({ where: { code, is_deleted: false } });
      if (exists) { results.skipped++; continue; }

      const deleted = await this.codeStringRepo.findOne({ where: { code, is_deleted: true } });
      if (deleted) {
        deleted.is_deleted = false;
        deleted.scan_count = 0;
        deleted.supplier_id = supplierId;
        deleted.box_type_id = boxTypeId;
        await this.codeStringRepo.save(deleted);
        results.created++;
        continue;
      }

      await this.codeStringRepo.save(this.codeStringRepo.create({
        code, supplier_id: supplierId, box_type_id: boxTypeId,
      }));
      results.created++;
    }

    await this.logAudit(supplierId, 'IMPORT_CODES', `CSV批量导入: 成功${results.created}, 跳过${results.skipped}`);
    return results;
  }

  async remove(supplierId: string, id: string) {
    const cs = await this.codeStringRepo.findOne({ where: { id, supplier_id: supplierId } });
    if (!cs) throw new NotFoundException('编码字符串不存在');
    cs.is_deleted = true;
    await this.codeStringRepo.save(cs);

    await this.logAudit(supplierId, 'DELETE_CODE', `逻辑删除编码字符串 ${cs.code}`);
    return { message: '已删除' };
  }

  async resetScanCount(supplierId: string, id: string) {
    const cs = await this.codeStringRepo.findOne({ where: { id, supplier_id: supplierId, is_deleted: false } });
    if (!cs) throw new NotFoundException('编码字符串不存在');
    cs.scan_count = 0;
    await this.codeStringRepo.save(cs);

    await this.logAudit(supplierId, 'RESET_SCAN_COUNT', `重置扫描次数: ${cs.code}`);
    return { message: '扫描次数已重置', code: cs.code, scan_count: 0 };
  }

  async getScanRecords(supplierId: string, codeStringId: string, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [items, total] = await this.scanRecordRepo.findAndCount({
      where: { code_string_id: codeStringId, supplier_id: supplierId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { scanned_at: 'DESC' },
    });
    return { list: items, total, page, pageSize };
  }

  private async logAudit(supplierId: string, action: string, detail: string) {
    await this.auditLogRepo.save({
      user_type: UserType.SUPPLIER,
      user_id: supplierId,
      action,
      detail,
    });
  }
}

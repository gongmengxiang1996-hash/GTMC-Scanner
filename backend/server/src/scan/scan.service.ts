import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CodeString } from '../database/code-string.entity';
import { BoxType } from '../database/box-type.entity';
import { ScanRecord } from '../database/scan-record.entity';
import { AlertLog } from '../database/alert-log.entity';
import { UnregisteredAttempt } from '../database/unregistered-attempt.entity';

@Injectable()
export class ScanService {
  constructor(
    @InjectRepository(CodeString)
    private codeStringRepo: Repository<CodeString>,
    @InjectRepository(BoxType)
    private boxTypeRepo: Repository<BoxType>,
    @InjectRepository(ScanRecord)
    private scanRecordRepo: Repository<ScanRecord>,
    @InjectRepository(AlertLog)
    private alertLogRepo: Repository<AlertLog>,
    @InjectRepository(UnregisteredAttempt)
    private unregisteredRepo: Repository<UnregisteredAttempt>,
  ) {}

  async scan(supplierId: string, deviceId: string, code: string) {
    // 1. 查找编码字符串
    const cs = await this.codeStringRepo.findOne({
      where: { code, is_deleted: false },
      relations: ['box_type'],
    });

    // 2. 未注册 → 记录并报错
    if (!cs) {
      await this.unregisteredRepo.save({
        code_string: code,
        supplier_id: supplierId,
        device_id: deviceId,
        attempted_at: new Date(),
      });
      return { success: false, error_code: 'UNREGISTERED', message: '该标签未注册，请检查' };
    }

    // 3. 检查次数限制
    const boxType = cs.box_type;
    const isOverLimit = cs.scan_count >= boxType.max_scan_count;

    // 4. 记录扫描
    await this.scanRecordRepo.save({
      code_string_id: cs.id,
      supplier_id: supplierId,
      device_id: deviceId,
      is_over_limit: isOverLimit,
    });

    // 5. 更新扫描次数
    cs.scan_count += 1;
    await this.codeStringRepo.save(cs);

    // 6. 超限告警（仅记录首次超限，未重置前不重复记录）
    if (isOverLimit) {
      const existingAlert = await this.alertLogRepo.findOne({
        where: { code_string_id: cs.id, is_reset: false },
      });
      if (!existingAlert) {
        await this.alertLogRepo.save({
          supplier_id: supplierId,
          code_string_id: cs.id,
          message: `箱标签重复扫描，请检查 (编码: ${cs.code}, 箱种: ${boxType.name}, 已扫描 ${cs.scan_count} 次, 上限 ${boxType.max_scan_count})`,
        });
      }
      return {
        success: false,
        error_code: 'OVER_LIMIT',
        message: '箱标签重复扫描，请检查',
        code: cs.code,
        scan_count: cs.scan_count,
        max_scan_count: boxType.max_scan_count,
      };
    }

    // 7. 扫描成功
    return {
      success: true,
      message: '扫描成功',
      code: cs.code,
      scan_count: cs.scan_count,
      max_scan_count: boxType.max_scan_count,
      box_type: boxType.name,
    };
  }
}

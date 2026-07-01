import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Like } from 'typeorm';
import { AlertLog } from '../database/alert-log.entity';
import { UnregisteredAttempt } from '../database/unregistered-attempt.entity';
import { AuditLog, UserType } from '../database/audit-log.entity';

@Injectable()
export class MonitorService {
  constructor(
    @InjectRepository(AlertLog)
    private alertLogRepo: Repository<AlertLog>,
    @InjectRepository(UnregisteredAttempt)
    private unregisteredRepo: Repository<UnregisteredAttempt>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async getAlertLogs(query: { page?: number; pageSize?: number; search?: string }) {
    const { page = 1, pageSize = 20, search } = query;

    const qb = this.alertLogRepo
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.supplier', 'supplier')
      .leftJoinAndSelect('alert.code_string', 'code_string');

    if (search) {
      qb.andWhere('code_string.code LIKE :search', { search: `%${search}%` });
    }

    qb.skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('alert.created_at', 'DESC');

    const [items, total] = await qb.getManyAndCount();

    const list = items.map((l) => ({
      id: l.id,
      supplier_code: (l.supplier as any)?.code || '',
      code_string: (l.code_string as any)?.code || '',
      message: l.message,
      is_reset: l.is_reset,
      created_at: l.created_at,
    }));

    return { list, total, page, pageSize };
  }

  async resetAlertLog(id: string) {
    const alert = await this.alertLogRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('告警记录不存在');
    alert.is_reset = true;
    await this.alertLogRepo.save(alert);
    return { message: '已重置', id: alert.id };
  }

  async getUnregisteredAttempts(query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [items, total] = await this.unregisteredRepo.findAndCount({
      relations: ['supplier'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { attempted_at: 'DESC' },
    });

    const list = items.map((a) => ({
      id: a.id,
      supplier_code: (a.supplier as any)?.code || '',
      code_string: a.code_string,
      device_id: a.device_id,
      attempted_at: a.attempted_at,
    }));

    return { list, total, page, pageSize };
  }

  async getAuditLogs(query: { page?: number; pageSize?: number; user_type?: string }) {
    const { page = 1, pageSize = 20, user_type } = query;
    const where: any = {};
    if (user_type) {
      where.user_type = user_type;
    }

    // 清理90天前的日志
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.auditLogRepo.delete({ created_at: LessThan(ninetyDaysAgo) });

    const [items, total] = await this.auditLogRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    return { list: items, total, page, pageSize };
  }
}

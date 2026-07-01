import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Supplier } from '../database/supplier.entity';
import { Admin } from '../database/admin.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditLog, UserType } from '../database/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    if (dto.role === 'supplier') {
      return this.supplierLogin(dto);
    } else {
      return this.adminLogin(dto);
    }
  }

  private async supplierLogin(dto: LoginDto) {
    const supplier = await this.supplierRepo.findOne({ where: { code: dto.account } });
    if (!supplier || !supplier.is_active) {
      throw new UnauthorizedException('账号不存在或已禁用');
    }

    const valid = await bcrypt.compare(dto.password, supplier.password_hash);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }

    // 设备绑定：正确登录后自动绑定/更新设备
    if (dto.device_id && supplier.device_id !== dto.device_id) {
      supplier.device_id = dto.device_id;
      await this.supplierRepo.save(supplier);
    }

    const payload = { sub: supplier.id, code: supplier.code, role: 'supplier' };
    return {
      access_token: this.jwtService.sign(payload),
      supplier_code: supplier.code,
    };
  }

  private async adminLogin(dto: LoginDto) {
    const admin = await this.adminRepo.findOne({ where: { username: dto.account } });
    if (!admin) {
      throw new UnauthorizedException('账号不存在');
    }

    const valid = await bcrypt.compare(dto.password, admin.password_hash);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }

    const payload = { sub: admin.id, username: admin.username, role: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      username: admin.username,
    };
  }

  async changePassword(userId: string, role: string, dto: ChangePasswordDto) {
    if (role === 'supplier') {
      const supplier = await this.supplierRepo.findOne({ where: { id: userId } });
      if (!supplier) throw new BadRequestException('用户不存在');
      const valid = await bcrypt.compare(dto.old_password, supplier.password_hash);
      if (!valid) throw new BadRequestException('原密码错误');
      supplier.password_hash = await bcrypt.hash(dto.new_password, 10);
      await this.supplierRepo.save(supplier);
    } else {
      const admin = await this.adminRepo.findOne({ where: { id: userId } });
      if (!admin) throw new BadRequestException('用户不存在');
      const valid = await bcrypt.compare(dto.old_password, admin.password_hash);
      if (!valid) throw new BadRequestException('原密码错误');
      admin.password_hash = await bcrypt.hash(dto.new_password, 10);
      await this.adminRepo.save(admin);
    }

    await this.auditLogRepo.save({
      user_type: role as UserType,
      user_id: userId,
      action: 'CHANGE_PASSWORD',
      detail: `${role} 修改密码`,
    });

    return { message: '密码修改成功' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

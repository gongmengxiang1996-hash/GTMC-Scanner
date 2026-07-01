import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { Supplier } from '../database/supplier.entity';
import { Admin } from '../database/admin.entity';
import { AuditLog } from '../database/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, Admin, AuditLog]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supplier-platform-secret-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

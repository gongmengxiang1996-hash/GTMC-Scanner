import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Admin } from './admin.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminRepo = app.get<Repository<Admin>>(getRepositoryToken(Admin));

  const existing = await adminRepo.findOne({ where: { username: 'shengguan_guanliyuan' } });
  if (existing) {
    console.log('管理员账号已存在，跳过初始化');
  } else {
    const password_hash = await bcrypt.hash('654321', 10);
    await adminRepo.save(adminRepo.create({ username: 'shengguan_guanliyuan', password_hash }));
    console.log('管理员账号已创建: shengguan_guanliyuan / 654321');
  }

  await app.close();
}

seed().catch(console.error);

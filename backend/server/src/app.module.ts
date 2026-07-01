import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { BoxTypesModule } from './box-types/box-types.module';
import { CodeStringsModule } from './code-strings/code-strings.module';
import { ScanModule } from './scan/scan.module';
import { MonitorModule } from './monitor/monitor.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'supplier_platform',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // 开发环境自动同步，生产环境改用 migration
    }),
    AuthModule,
    SuppliersModule,
    BoxTypesModule,
    CodeStringsModule,
    ScanModule,
    MonitorModule,
  ],
})
export class AppModule {}

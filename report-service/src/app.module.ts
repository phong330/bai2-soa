import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ProductCost } from './reports/product-cost.entity';
import { SavedReport } from './reports/saved-report.entity';
import { SavedReportItem } from './reports/saved-report-item.entity';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: [ProductCost, SavedReport, SavedReportItem],
      synchronize: false,
      options: { encrypt: false, trustServerCertificate: true },
    }),
    TypeOrmModule.forFeature([ProductCost, SavedReport, SavedReportItem]),
    JwtModule.register({ secret: 'baitap2_secret_key' }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, JwtAuthGuard],
})
export class AppModule {}


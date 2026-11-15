import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { RegistrationModule } from '../registration/registration.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [FinanceModule, RegistrationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

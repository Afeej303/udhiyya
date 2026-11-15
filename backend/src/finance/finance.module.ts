import { Module } from '@nestjs/common';
import { RegistrationModule } from '../registration/registration.module.js';
import {
  FinanceController,
  ParticipantFinanceController,
} from './finance.controller.js';
import { FinanceService } from './finance.service.js';

@Module({
  imports: [RegistrationModule],
  controllers: [FinanceController, ParticipantFinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}

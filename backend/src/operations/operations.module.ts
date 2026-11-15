import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { RegistrationModule } from '../registration/registration.module.js';
import {
  CommitteeOperationsController,
  VolunteerOperationsController,
} from './operations.controller.js';
import { OperationsService } from './operations.service.js';

@Module({
  imports: [RegistrationModule, FinanceModule, EmailModule],
  controllers: [CommitteeOperationsController, VolunteerOperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}

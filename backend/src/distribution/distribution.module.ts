import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { OperationsModule } from '../operations/operations.module.js';
import { RegistrationModule } from '../registration/registration.module.js';
import {
  CommitteeDistributionController,
  PublicDistributionController,
  RecipientDistributionController,
} from './distribution.controller.js';
import { DistributionService } from './distribution.service.js';

@Module({
  imports: [RegistrationModule, OperationsModule, EmailModule],
  controllers: [
    CommitteeDistributionController,
    PublicDistributionController,
    RecipientDistributionController,
  ],
  providers: [DistributionService],
})
export class DistributionModule {}

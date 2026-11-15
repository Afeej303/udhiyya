import { Module } from '@nestjs/common';
import {
  ApplicantRegistrationController,
  CommitteeRegistrationController,
} from './registration.controller.js';
import { RegistrationService } from './registration.service.js';

@Module({
  controllers: [
    ApplicantRegistrationController,
    CommitteeRegistrationController,
  ],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}

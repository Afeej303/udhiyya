import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { RegistrationModule } from '../registration/registration.module.js';
import {
  CommitteeCommunicationsController,
  InboxController,
  PublicCommunicationsController,
} from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';
import { NotificationEmailWorker } from './notification-email.worker.js';

@Module({
  imports: [RegistrationModule, EmailModule],
  controllers: [
    CommitteeCommunicationsController,
    InboxController,
    PublicCommunicationsController,
  ],
  providers: [CommunicationsService, NotificationEmailWorker],
})
export class CommunicationsModule {}

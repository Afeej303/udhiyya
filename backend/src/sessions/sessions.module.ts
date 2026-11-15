import { Module } from '@nestjs/common';
import { SessionPolicy } from './session.policy.js';
import { SessionsService } from './sessions.service.js';

@Module({
  providers: [SessionsService, SessionPolicy],
  exports: [SessionsService],
})
export class SessionsModule {}

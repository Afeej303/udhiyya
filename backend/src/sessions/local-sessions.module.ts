import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller.js';
import { SessionsModule } from './sessions.module.js';

@Module({
  imports: [SessionsModule],
  controllers: [SessionsController],
})
export class LocalSessionsModule {}

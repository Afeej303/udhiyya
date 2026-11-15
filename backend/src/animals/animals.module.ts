import { Module } from '@nestjs/common';
import { RegistrationModule } from '../registration/registration.module.js';
import { AnimalsController } from './animals.controller.js';
import { AnimalsService } from './animals.service.js';

@Module({
  imports: [RegistrationModule],
  controllers: [AnimalsController],
  providers: [AnimalsService],
})
export class AnimalsModule {}

import { Module } from '@nestjs/common';
import {
  ProgrammesController,
  PublicProgrammesController,
} from './programmes.controller.js';
import { ProgrammesService } from './programmes.service.js';

@Module({
  controllers: [ProgrammesController, PublicProgrammesController],
  providers: [ProgrammesService],
})
export class ProgrammesModule {}

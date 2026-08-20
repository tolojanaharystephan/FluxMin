import { Module } from '@nestjs/common';
import { CourrierController } from './courrier.controller';
import { CourrierService } from './courrier.service';
import { ArchiveModule } from '../archive/archive.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ArchiveModule, AiModule],
  controllers: [CourrierController],
  providers: [CourrierService],
  exports: [CourrierService],
})
export class CourrierModule {}

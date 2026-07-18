import { Module } from '@nestjs/common';
import { GouvernementController } from './gouvernement.controller';
import { GouvernementService } from './gouvernement.service';

@Module({
  controllers: [GouvernementController],
  providers: [GouvernementService],
  exports: [GouvernementService],
})
export class GouvernementModule {}

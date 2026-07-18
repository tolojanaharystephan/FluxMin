import { Global, Module } from '@nestjs/common';
import { TemporalService } from './temporal.service';
import { TemporalWorkerHost } from './temporal.worker';
import { CourrierSuiviActivitiesService } from './activities/courrier-suivi.activities';

@Global()
@Module({
  providers: [TemporalService, TemporalWorkerHost, CourrierSuiviActivitiesService],
  exports: [TemporalService],
})
export class TemporalModule {}

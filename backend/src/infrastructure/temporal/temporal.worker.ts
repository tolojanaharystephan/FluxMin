import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NativeConnection, Worker } from '@temporalio/worker';
import { join } from 'path';
import { CourrierSuiviActivitiesService } from './activities/courrier-suivi.activities';
import { TEMPORAL_TASK_QUEUE } from './temporal.service';

@Injectable()
export class TemporalWorkerHost implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalWorkerHost.name);
  private worker: Worker | null = null;
  private connection: NativeConnection | null = null;
  private runPromise: Promise<void> | null = null;

  constructor(private readonly activitiesService: CourrierSuiviActivitiesService) {}

  async onModuleInit() {
    if (process.env.TEMPORAL_DISABLED === 'true') return;
    if (process.env.TEMPORAL_WORKER_DISABLED === 'true') {
      this.logger.warn('Worker Temporal désactivé (TEMPORAL_WORKER_DISABLED=true)');
      return;
    }

    const address = process.env.TEMPORAL_HOST || 'localhost:7233';
    try {
      this.connection = await NativeConnection.connect({ address });
      // En runtime Nest (dist/), workflows sont à côté de ce fichier compilé
      const workflowsPath = join(__dirname, 'workflows');
      this.worker = await Worker.create({
        connection: this.connection,
        namespace: 'default',
        taskQueue: TEMPORAL_TASK_QUEUE,
        workflowsPath,
        activities: this.activitiesService.asActivities(),
      });

      this.runPromise = this.worker.run().catch((err) => {
        this.logger.error(`Worker Temporal arrêté: ${err?.message || err}`);
      });
      this.logger.log(`Worker Temporal OK → queue=${TEMPORAL_TASK_QUEUE}`);
    } catch (err: any) {
      this.logger.warn(`Worker Temporal non démarré (${err?.message || err})`);
    }
  }

  async onModuleDestroy() {
    this.worker?.shutdown();
    if (this.runPromise) {
      try {
        await this.runPromise;
      } catch {
        /* ignore */
      }
    }
    await this.connection?.close();
  }
}

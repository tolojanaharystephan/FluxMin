import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, Connection, WorkflowIdReusePolicy } from '@temporalio/client';

export const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'fluxmin';

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalService.name);
  private client: Client | null = null;
  private connection: Connection | null = null;
  private enabled = false;

  async onModuleInit() {
    if (process.env.TEMPORAL_DISABLED === 'true') {
      this.logger.warn('Temporal désactivé (TEMPORAL_DISABLED=true)');
      return;
    }

    const address = process.env.TEMPORAL_HOST || 'localhost:7233';
    try {
      this.connection = await Connection.connect({ address });
      this.client = new Client({ connection: this.connection });
      this.enabled = true;
      this.logger.log(`Temporal client OK → ${address}`);
    } catch (err: any) {
      this.enabled = false;
      this.logger.warn(`Temporal indisponible (${err?.message || err}) — workflows ignorés`);
    }
  }

  async onModuleDestroy() {
    await this.connection?.close();
  }

  isEnabled() {
    return this.enabled;
  }

  workflowId(courrierId: number) {
    return `courrier-suivi-${courrierId}`;
  }

  private delays() {
    return {
      relanceDelay: process.env.TEMPORAL_RELANCES_DELAY || '3 days',
      escaladeDelay: process.env.TEMPORAL_ESCALADE_DELAY || '2 days',
    };
  }

  /** Démarre (ou remplace) le suivi relance/escalade pour un courrier. */
  async startCourrierSuivi(courrierId: number, objet: string) {
    if (!this.enabled || !this.client) return;

    const { relanceDelay, escaladeDelay } = this.delays();
    const workflowId = this.workflowId(courrierId);

    try {
      await this.cancelCourrierSuivi(courrierId);
      await this.client.workflow.start('courrierSuiviWorkflow', {
        taskQueue: TEMPORAL_TASK_QUEUE,
        workflowId,
        args: [{ courrierId, objet, relanceDelay, escaladeDelay }],
        workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE,
      });
      this.logger.log(
        `Workflow démarré ${workflowId} (relance=${relanceDelay}, escalade=${escaladeDelay})`,
      );
    } catch (err: any) {
      this.logger.warn(`startCourrierSuivi #${courrierId}: ${err?.message || err}`);
    }
  }

  async cancelCourrierSuivi(courrierId: number) {
    if (!this.enabled || !this.client) return;
    try {
      const handle = this.client.workflow.getHandle(this.workflowId(courrierId));
      await handle.cancel();
      this.logger.log(`Workflow annulé ${this.workflowId(courrierId)}`);
    } catch {
      /* pas de workflow actif */
    }
  }
}

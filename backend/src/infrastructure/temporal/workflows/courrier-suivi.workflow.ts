import { proxyActivities, sleep } from '@temporalio/workflow';
import type { CourrierSuiviActivities } from '../courrier-suivi.types';

const activities = proxyActivities<CourrierSuiviActivities>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 3 },
});

export interface CourrierSuiviInput {
  courrierId: number;
  objet: string;
  /** Délai avant relance (ex. "3 days", "5 minutes") */
  relanceDelay: string;
  /** Délai après relance avant escalade */
  escaladeDelay: string;
}

/** Relance puis escalade si le courrier reste sans clôture (AR / archivage). */
export async function courrierSuiviWorkflow(input: CourrierSuiviInput): Promise<string> {
  await sleep(input.relanceDelay as any);

  const pendingAfterRelance = await activities.isCourrierPending(input.courrierId);
  if (!pendingAfterRelance) {
    return 'cancelled_before_relance';
  }

  await activities.sendRelance(input.courrierId, input.objet);

  await sleep(input.escaladeDelay as any);

  const pendingAfterEscalade = await activities.isCourrierPending(input.courrierId);
  if (!pendingAfterEscalade) {
    return 'cancelled_before_escalade';
  }

  await activities.sendEscalade(input.courrierId, input.objet);
  return 'escalade_sent';
}

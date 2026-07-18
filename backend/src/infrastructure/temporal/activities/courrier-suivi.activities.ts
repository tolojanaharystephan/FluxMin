import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import type { DrizzleDB } from '../../database/database.provider';
import {
  courriers,
  utilisateurs,
  directions,
} from '../../database/schema';
import { NotificationService } from '../../../modules/notification/notification.service';
import { StatutCourrier } from '../../../modules/courrier/dto/courrier.dto';
import { UserRole } from '../../../common/types/roles';
import type { CourrierSuiviActivities } from '../courrier-suivi.types';

const PENDING_STATUTS = [
  StatutCourrier.ENVOYE,
  StatutCourrier.RECU,
  StatutCourrier.EN_TRAITEMENT,
];

@Injectable()
export class CourrierSuiviActivitiesService implements CourrierSuiviActivities {
  private readonly logger = new Logger(CourrierSuiviActivitiesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private notificationService: NotificationService,
  ) {}

  async isCourrierPending(courrierId: number): Promise<boolean> {
    const [c] = await this.db
      .select({ statut: courriers.statut, destinataireDirectionId: courriers.destinataireDirectionId })
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);
    if (!c) return false;
    return PENDING_STATUTS.includes(c.statut as StatutCourrier);
  }

  async sendRelance(courrierId: number, objet: string): Promise<void> {
    const [c] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);
    if (!c?.destinataireDirectionId) return;

    this.logger.log(`Relance Temporal courrier #${courrierId}`);
    await this.notificationService.createForDirection(c.destinataireDirectionId, {
      type: 'courrier_relance',
      titre: 'Relance — courrier en attente',
      message: `Aucune action récente sur « ${objet} ». Merci de traiter ou transmettre.`,
      courrierId,
    });
  }

  async sendEscalade(courrierId: number, objet: string): Promise<void> {
    const [c] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);
    if (!c?.destinataireDirectionId) return;

    const [dir] = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, c.destinataireDirectionId))
      .limit(1);

    this.logger.log(`Escalade Temporal courrier #${courrierId}`);

    // Responsables de la direction détentrice
    const responsables = await this.db
      .select({ id: utilisateurs.id })
      .from(utilisateurs)
      .where(
        and(
          eq(utilisateurs.directionId, c.destinataireDirectionId),
          inArray(utilisateurs.role, [
            UserRole.RESPONSABLE,
            UserRole.RESPONSABLE_DIRECTION,
            'responsable',
            'responsable_direction',
          ]),
        ),
      );

    for (const u of responsables) {
      await this.notificationService.create({
        utilisateurId: u.id,
        type: 'courrier_escalade',
        titre: 'Escalade — courrier sans traitement',
        message: `Le courrier « ${objet} » dépasse le délai de traitement.`,
        courrierId,
      });
    }

    // Directeur du ministère
    if (dir?.ministereId) {
      const directeurs = await this.db
        .select({ id: utilisateurs.id })
        .from(utilisateurs)
        .where(
          and(
            eq(utilisateurs.ministereId, dir.ministereId),
            inArray(utilisateurs.role, [
              UserRole.DIRECTEUR_MINISTERE,
              'directeur_ministere',
              'admin_ministere',
            ]),
          ),
        );

      for (const u of directeurs) {
        await this.notificationService.create({
          utilisateurId: u.id,
          type: 'courrier_escalade',
          titre: 'Escalade ministère — courrier bloqué',
          message: `Escalade : « ${objet} » toujours en attente dans ${dir.nom}.`,
          courrierId,
        });
      }
    }
  }

  /** Objet plat pour Worker.create({ activities }) */
  asActivities(): CourrierSuiviActivities {
    return {
      isCourrierPending: (id) => this.isCourrierPending(id),
      sendRelance: (id, objet) => this.sendRelance(id, objet),
      sendEscalade: (id, objet) => this.sendEscalade(id, objet),
    };
  }
}

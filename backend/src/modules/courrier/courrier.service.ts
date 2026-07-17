import { Injectable, NotFoundException, ForbiddenException, Inject, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  courriers,
  utilisateurs,
  directions,
  ministeres,
  fluxEtapes,
  piecesJointes,
  archives,
} from '../../infrastructure/database/schema';
import { eq, and, like, sql, desc, count, or, not, inArray } from 'drizzle-orm';
import {
  CreateCourrierDto,
  UpdateCourrierDto,
  TransmettreCourrierDto,
  QueryCourrierDto,
  StatutCourrier,
} from './dto/courrier.dto';
import { NotificationService } from '../notification/notification.service';
import {
  resolveStoredFilePath,
  UPLOADS_ROOT,
  safeUnlink,
} from '../../common/files/storage.util';

@Injectable()
export class CourrierService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateCourrierDto, emetteurId: number) {
    const emetteur = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, emetteurId))
      .limit(1);

    if (!emetteur.length) throw new NotFoundException('Utilisateur émetteur introuvable');

    const user = emetteur[0];
    const directionEmetteurId = user.directionId;

    let directionCourrierId: number | undefined;

    if (directionEmetteurId) {
      const [userDirection] = await this.db
        .select()
        .from(directions)
        .where(eq(directions.id, directionEmetteurId))
        .limit(1);

      if (userDirection?.ministereId) {
        const [dirCourrier] = await this.db
          .select()
          .from(directions)
          .where(and(
            eq(directions.ministereId, userDirection.ministereId),
            eq(directions.type, 'courrier')
          ))
          .limit(1);

        directionCourrierId = dirCourrier?.id;
      }
    }

    const reference = await this.generateReference();

    const [courrier] = await this.db
      .insert(courriers)
      .values({
        reference,
        objet: dto.objet,
        corps: dto.corps,
        typeCourrier: dto.typeCourrier,
        statut: StatutCourrier.BROUILLON,
        emetteurId,
        directionEmetteurId: directionEmetteurId || undefined,
        directionCourrierEmetteurId: directionCourrierId,
        destinataireDirectionId: dto.destinataireDirectionId,
        ministereDestinataireId: dto.ministereDestinataireId,
        metadata: dto.metadata,
      })
      .returning();

    await this.db.insert(fluxEtapes).values({
      courrierId: courrier.id,
      directionId: directionEmetteurId || 0,
      action: 'creation',
      utilisateurId: emetteurId,
      commentaire: 'Courrier créé',
    });

    return courrier;
  }

  async findAll(userId: number, query: QueryCourrierDto) {
    const user = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user.length) throw new NotFoundException('Utilisateur introuvable');

    const { search, statut, typeCourrier, scope, dateDebut, dateFin, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (scope === 'sent') {
      conditions.push(eq(courriers.emetteurId, userId));
    } else if (scope === 'drafts') {
      conditions.push(eq(courriers.emetteurId, userId));
      conditions.push(eq(courriers.statut, StatutCourrier.BROUILLON));
    } else if (scope === 'accessible') {
      // Recherche étendue : tout ce que l'utilisateur peut légitimement voir
      const role = user[0].role;
      if (role === 'super_admin' || role === 'auditeur') {
        // Pas de filtre supplémentaire — vue globale
      } else if (role === 'admin_ministere' && user[0].directionId) {
        const [userDir] = await this.db
          .select({ ministereId: directions.ministereId })
          .from(directions)
          .where(eq(directions.id, user[0].directionId))
          .limit(1);
        if (userDir?.ministereId) {
          const dirs = await this.db
            .select({ id: directions.id })
            .from(directions)
            .where(eq(directions.ministereId, userDir.ministereId));
          const dirIds = dirs.map((d) => d.id);
          if (dirIds.length > 0) {
            conditions.push(
              or(
                inArray(courriers.destinataireDirectionId, dirIds),
                inArray(courriers.directionEmetteurId, dirIds),
              )!,
            );
          } else {
            conditions.push(sql`1 = 0`);
          }
        } else {
          conditions.push(sql`1 = 0`);
        }
      } else if (user[0].directionId) {
        conditions.push(
          or(
            eq(courriers.destinataireDirectionId, user[0].directionId),
            eq(courriers.emetteurId, userId),
          )!,
        );
      } else {
        conditions.push(eq(courriers.emetteurId, userId));
      }
    } else {
      if (user[0].directionId) {
        conditions.push(eq(courriers.destinataireDirectionId, user[0].directionId));
        conditions.push(not(eq(courriers.statut, StatutCourrier.BROUILLON)));
      } else if (user[0].role === 'super_admin' || user[0].role === 'auditeur') {
        // Inbox globale pour les rôles sans direction ciblée
        conditions.push(not(eq(courriers.statut, StatutCourrier.BROUILLON)));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }

    let whereClause = and(...conditions);

    if (scope !== 'drafts' && statut) {
      whereClause = and(whereClause, eq(courriers.statut, statut));
    }

    if (typeCourrier) {
      whereClause = and(whereClause, eq(courriers.typeCourrier, typeCourrier));
    }

    if (search) {
      whereClause = and(whereClause, or(
        like(courriers.reference, `%${search}%`),
        like(courriers.objet, `%${search}%`),
        like(courriers.corps, `%${search}%`),
      ));
    }

    if (dateDebut) {
      whereClause = and(whereClause, sql`${courriers.createdAt} >= ${new Date(dateDebut)}`);
    }

    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      whereClause = and(whereClause, sql`${courriers.createdAt} <= ${endDate}`);
    }

    const results = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        typeCourrier: courriers.typeCourrier,
        statut: courriers.statut,
        dateEnvoi: courriers.dateEnvoi,
        dateReception: courriers.dateReception,
        createdAt: courriers.createdAt,
        emetteurNom: sql`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), 'Inconnu')`,
        directionEmetteurNom: sql`COALESCE(${directions.nom}, 'Inconnue')`,
      })
      .from(courriers)
      .leftJoin(utilisateurs, eq(courriers.emetteurId, utilisateurs.id))
      .leftJoin(directions, eq(courriers.directionEmetteurId, directions.id))
      .where(whereClause)
      .orderBy(desc(courriers.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(whereClause);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit),
      },
    };
  }

  async findById(id: number, userId: number) {
    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!courrier) throw new NotFoundException(`Courrier #${id} introuvable`);

    const [emetteur, directionEmetteur, destinataire, ministereDestinataire, historique, pieces] = await Promise.all([
      this.db
        .select({
          id: utilisateurs.id,
          nom: utilisateurs.nom,
          prenom: utilisateurs.prenom,
          email: utilisateurs.email,
        })
        .from(utilisateurs)
        .where(eq(utilisateurs.id, courrier.emetteurId || 0))
        .limit(1),
      this.db
        .select()
        .from(directions)
        .where(eq(directions.id, courrier.directionEmetteurId || 0))
        .limit(1),
      this.db
        .select()
        .from(directions)
        .where(eq(directions.id, courrier.destinataireDirectionId || 0))
        .limit(1),
      courrier.ministereDestinataireId
        ? this.db.select().from(ministeres).where(eq(ministeres.id, courrier.ministereDestinataireId)).limit(1)
        : Promise.resolve([]),
      this.db
        .select()
        .from(fluxEtapes)
        .where(eq(fluxEtapes.courrierId, id))
        .orderBy(fluxEtapes.dateAction),
      this.db
        .select()
        .from(piecesJointes)
        .where(eq(piecesJointes.courrierId, id)),
    ]);

    let archive: {
      id: number;
      dateArchivage: Date | null;
      dureeConservation: number | null;
      emplacement: string | null;
    } | null = null;

    if (courrier.statut === StatutCourrier.ARCHIVE) {
      const [arch] = await this.db
        .select({
          id: archives.id,
          dateArchivage: archives.dateArchivage,
          dureeConservation: archives.dureeConservation,
          emplacement: archives.emplacement,
        })
        .from(archives)
        .where(eq(archives.courrierId, id))
        .limit(1);
      archive = arch || null;
    }

    return {
      ...courrier,
      emetteur: emetteur[0] || null,
      directionEmetteur: directionEmetteur[0] || null,
      destinataireDirection: destinataire[0] || null,
      ministereDestinataire: ministereDestinataire[0] || null,
      historique,
      piecesJointes: pieces,
      archive,
    };
  }

  async update(id: number, dto: UpdateCourrierDto, userId: number) {
    const [existing] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Courrier #${id} introuvable`);

    if (existing.emetteurId !== userId) {
      throw new ForbiddenException('Seul l\'émetteur peut modifier ce courrier');
    }

    const [updated] = await this.db
      .update(courriers)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(courriers.id, id))
      .returning();

    return updated;
  }

  async envoyer(id: number, userId: number) {
    const [existing] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Courrier #${id} introuvable`);

    if (existing.emetteurId !== userId) {
      throw new ForbiddenException('Seul l\'émetteur peut envoyer ce courrier');
    }

    if (existing.statut !== StatutCourrier.BROUILLON) {
      throw new ForbiddenException('Seuls les brouillons peuvent être envoyés');
    }

    const [updated] = await this.db
      .update(courriers)
      .set({
        statut: StatutCourrier.ENVOYE,
        dateEnvoi: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courriers.id, id))
      .returning();

    await this.db.insert(fluxEtapes).values({
      courrierId: id,
      directionId: existing.directionEmetteurId || 0,
      action: 'envoi',
      utilisateurId: userId,
      commentaire: 'Courrier envoyé',
    });

    if (existing.destinataireDirectionId) {
      const emetteur = await this.db.select().from(utilisateurs).where(eq(utilisateurs.id, userId)).limit(1);
      const emetteurNom = emetteur[0] ? `${emetteur[0].prenom} ${emetteur[0].nom}` : 'Un agent';
      await this.notificationService.createForDirection(existing.destinataireDirectionId, {
        type: 'courrier_recu',
        titre: 'Nouveau courrier reçu',
        message: `${emetteurNom} vous a envoyé le courrier "${existing.objet}"`,
        courrierId: id,
      });
    }

    return updated;
  }

  async transmettre(id: number, dto: TransmettreCourrierDto, userId: number) {
    const [existing] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Courrier #${id} introuvable`);

    if (existing.statut === StatutCourrier.BROUILLON || existing.statut === StatutCourrier.ARCHIVE) {
      throw new ForbiddenException('Ce courrier ne peut pas être transmis dans son état actuel');
    }

    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user?.directionId) {
      throw new ForbiddenException('Vous devez être rattaché à une direction pour transmettre');
    }

    // Seule la direction actuellement détentrice (destinataire) peut transmettre
    if (existing.destinataireDirectionId !== user.directionId) {
      throw new ForbiddenException(
        'Seule la direction destinataire actuelle peut transmettre ce courrier',
      );
    }

    if (dto.destinataireDirectionId === user.directionId) {
      throw new BadRequestException('Choisissez une autre direction que la vôtre');
    }

    const [userDir] = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, user.directionId))
      .limit(1);

    const [targetDir] = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, dto.destinataireDirectionId))
      .limit(1);

    if (!targetDir) {
      throw new NotFoundException('Direction destinataire introuvable');
    }

    // Transmission limitée au même ministère (flux interne)
    if (!userDir?.ministereId || userDir.ministereId !== targetDir.ministereId) {
      throw new ForbiddenException(
        'La transmission n\'est autorisée qu\'entre directions du même ministère',
      );
    }

    const [updated] = await this.db
      .update(courriers)
      .set({
        destinataireDirectionId: dto.destinataireDirectionId,
        statut: StatutCourrier.EN_TRAITEMENT,
        updatedAt: new Date(),
      })
      .where(eq(courriers.id, id))
      .returning();

    await this.db.insert(fluxEtapes).values({
      courrierId: id,
      directionId: user.directionId,
      action: 'transmission',
      utilisateurId: userId,
      commentaire: dto.commentaire || `Transmis à ${targetDir.nom}`,
    });

    const emetteurNom = user ? `${user.prenom} ${user.nom}` : 'Un agent';
    await this.notificationService.createForDirection(dto.destinataireDirectionId, {
      type: 'courrier_transmis',
      titre: 'Courrier transmis',
      message: `${emetteurNom} (${userDir.nom}) vous a transmis le courrier "${existing.objet}"`,
      courrierId: id,
    });

    return updated;
  }

  async recevoir(id: number, userId: number) {
    const [existing] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Courrier #${id} introuvable`);

    const [updated] = await this.db
      .update(courriers)
      .set({
        statut: StatutCourrier.RECU,
        dateReception: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courriers.id, id))
      .returning();

    await this.db.insert(fluxEtapes).values({
      courrierId: id,
      directionId: existing.destinataireDirectionId || 0,
      action: 'reception',
      utilisateurId: userId,
      commentaire: 'Courrier reçu',
    });

    if (existing.emetteurId) {
      await this.notificationService.create({
        utilisateurId: existing.emetteurId,
        type: 'courrier_acuse',
        titre: 'Accusé de réception',
        message: `Votre courrier "${existing.objet}" a été accusé réception`,
        courrierId: id,
      });
    }

    return updated;
  }

  async addPieceJointe(
    courrierId: number,
    userId: number,
    file: { nomFichier: string; typeMime: string; tailleBytes: number; cheminMinio: string },
  ) {
    await this.findById(courrierId, userId);

    const [pj] = await this.db
      .insert(piecesJointes)
      .values({
        courrierId,
        nomFichier: file.nomFichier,
        cheminMinio: file.cheminMinio,
        typeMime: file.typeMime,
        tailleBytes: file.tailleBytes,
      })
      .returning();

    return pj;
  }

  async getPieceJointe(courrierId: number, pjId: number, userId: number) {
    await this.findById(courrierId, userId);

    const [pj] = await this.db
      .select()
      .from(piecesJointes)
      .where(and(eq(piecesJointes.id, pjId), eq(piecesJointes.courrierId, courrierId)))
      .limit(1);

    if (!pj) throw new NotFoundException(`Pièce jointe #${pjId} introuvable pour le courrier #${courrierId}`);

    return pj;
  }

  async deletePieceJointe(courrierId: number, pjId: number, userId: number) {
    const courrier = await this.findById(courrierId, userId);

    if (courrier.emetteur?.id !== userId) {
      throw new ForbiddenException('Seul l\'émetteur peut supprimer une pièce jointe');
    }

    const [pj] = await this.db
      .select()
      .from(piecesJointes)
      .where(and(eq(piecesJointes.id, pjId), eq(piecesJointes.courrierId, courrierId)))
      .limit(1);

    if (!pj) throw new NotFoundException(`Pièce jointe #${pjId} introuvable`);

    safeUnlink(resolveStoredFilePath(pj.cheminMinio, UPLOADS_ROOT));

    await this.db
      .delete(piecesJointes)
      .where(and(eq(piecesJointes.id, pjId), eq(piecesJointes.courrierId, courrierId)));

    return { deleted: true };
  }

  async delete(id: number, userId: number) {
    const [existing] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`Courrier #${id} introuvable`);

    if (existing.emetteurId !== userId) {
      throw new ForbiddenException('Seul l\'émetteur peut supprimer ce courrier');
    }

    if (existing.statut !== StatutCourrier.BROUILLON) {
      throw new ForbiddenException('Seuls les brouillons peuvent être supprimés');
    }

    await this.db.delete(fluxEtapes).where(eq(fluxEtapes.courrierId, id));
    await this.db.delete(piecesJointes).where(eq(piecesJointes.courrierId, id));
    await this.db.delete(courriers).where(eq(courriers.id, id));

    return { deleted: true };
  }

  private async generateReference(): Promise<string> {
    const [lastCourrier] = await this.db
      .select({ reference: courriers.reference })
      .from(courriers)
      .orderBy(desc(courriers.id))
      .limit(1);

    const year = new Date().getFullYear();
    let nextNum = 1;

    if (lastCourrier?.reference) {
      const match = lastCourrier.reference.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `FLUX-${year}-${String(nextNum).padStart(6, '0')}`;
  }
}

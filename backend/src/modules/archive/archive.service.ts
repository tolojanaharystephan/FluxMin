import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  archives,
  courriers,
  utilisateurs,
  directions,
  ministeres,
  fluxEtapes,
  piecesJointes,
} from '../../infrastructure/database/schema';
import { eq, and, like, sql, desc, count, or, inArray } from 'drizzle-orm';
import { StatutCourrier } from '../courrier/dto/courrier.dto';
import { ArchiveCourrierDto, QueryArchiveDto } from './dto/archive.dto';
import { NotificationService } from '../notification/notification.service';

const EXPIRE_SOON_DAYS = 90;

function retentionMeta(dateArchivage: Date | null, dureeConservation: number | null) {
  if (!dateArchivage || !dureeConservation || dureeConservation <= 0) {
    return {
      dateExpiration: null as string | null,
      joursRestants: null as number | null,
      retentionStatus: 'unknown' as const,
    };
  }

  const exp = new Date(dateArchivage);
  exp.setFullYear(exp.getFullYear() + dureeConservation);
  const joursRestants = Math.ceil((exp.getTime() - Date.now()) / 86_400_000);

  let retentionStatus: 'ok' | 'expire_soon' | 'expired' = 'ok';
  if (joursRestants <= 0) retentionStatus = 'expired';
  else if (joursRestants <= EXPIRE_SOON_DAYS) retentionStatus = 'expire_soon';

  return {
    dateExpiration: exp.toISOString(),
    joursRestants,
    retentionStatus,
  };
}

@Injectable()
export class ArchiveService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private notificationService: NotificationService,
  ) {}

  private async getUserScope(userId: number) {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    let ministereId: number | null = null;
    let directionIdsInMinistere: number[] = [];

    if (user.directionId) {
      const [dir] = await this.db
        .select()
        .from(directions)
        .where(eq(directions.id, user.directionId))
        .limit(1);
      ministereId = dir?.ministereId ?? null;
    }

    if (ministereId) {
      const dirs = await this.db
        .select({ id: directions.id })
        .from(directions)
        .where(eq(directions.ministereId, ministereId));
      directionIdsInMinistere = dirs.map((d) => d.id);
    }

    return {
      user,
      role: user.role,
      directionId: user.directionId,
      ministereId,
      directionIdsInMinistere,
    };
  }

  /** Visible si émetteur, destinataire, admin ministère, auditeur ou super admin */
  private canAccessCourrier(
    scope: Awaited<ReturnType<ArchiveService['getUserScope']>>,
    courrier: {
      directionEmetteurId: number | null;
      destinataireDirectionId: number | null;
    },
  ) {
    if (scope.role === 'super_admin' || scope.role === 'auditeur') return true;

    if (scope.role === 'admin_ministere' && scope.directionIdsInMinistere.length > 0) {
      return (
        (courrier.directionEmetteurId != null &&
          scope.directionIdsInMinistere.includes(courrier.directionEmetteurId)) ||
        (courrier.destinataireDirectionId != null &&
          scope.directionIdsInMinistere.includes(courrier.destinataireDirectionId))
      );
    }

    if (!scope.directionId) return false;

    return (
      courrier.directionEmetteurId === scope.directionId ||
      courrier.destinataireDirectionId === scope.directionId
    );
  }

  async archiver(courrierId: number, dto: ArchiveCourrierDto, userId: number) {
    const scope = await this.getUserScope(userId);

    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);

    if (!courrier) throw new NotFoundException(`Courrier #${courrierId} introuvable`);

    if (courrier.statut === StatutCourrier.BROUILLON) {
      throw new ForbiddenException("Impossible d'archiver un brouillon");
    }

    if (courrier.statut === StatutCourrier.ARCHIVE) {
      throw new ForbiddenException('Ce courrier est déjà archivé');
    }

    if (!this.canAccessCourrier(scope, courrier)) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à archiver ce courrier");
    }

    if (!dto.dureeConservation || dto.dureeConservation < 1) {
      throw new ForbiddenException('La durée de conservation doit être d\'au moins 1 an');
    }

    const existing = await this.db
      .select()
      .from(archives)
      .where(eq(archives.courrierId, courrierId))
      .limit(1);

    if (existing.length) {
      throw new ForbiddenException('Ce courrier est déjà archivé');
    }

    const [archive] = await this.db
      .insert(archives)
      .values({
        courrierId,
        dateArchivage: new Date(),
        dureeConservation: dto.dureeConservation,
        emplacement: dto.emplacement?.trim() || null,
      })
      .returning();

    await this.db
      .update(courriers)
      .set({ statut: StatutCourrier.ARCHIVE, updatedAt: new Date() })
      .where(eq(courriers.id, courrierId));

    await this.db.insert(fluxEtapes).values({
      courrierId,
      directionId: scope.directionId || courrier.directionEmetteurId || 0,
      action: 'archivage',
      utilisateurId: userId,
      commentaire: `Archivé pour ${dto.dureeConservation} ans${dto.emplacement ? ` — ${dto.emplacement}` : ''}`,
    });

    if (courrier.emetteurId && courrier.emetteurId !== userId) {
      await this.notificationService.create({
        utilisateurId: courrier.emetteurId,
        type: 'courrier_archive',
        titre: 'Courrier archivé',
        message: `Votre courrier "${courrier.objet}" a été archivé pour ${dto.dureeConservation} ans`,
        courrierId,
      });
    }

    return {
      ...archive,
      ...retentionMeta(archive.dateArchivage, archive.dureeConservation),
    };
  }

  async findAll(userId: number, query: QueryArchiveDto) {
    const scope = await this.getUserScope(userId);
    const { search, type, retention, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(courriers.statut, StatutCourrier.ARCHIVE)];

    if (scope.role === 'super_admin' || scope.role === 'auditeur') {
      // pas de filtre direction
    } else if (scope.role === 'admin_ministere' && scope.directionIdsInMinistere.length > 0) {
      conditions.push(
        or(
          inArray(courriers.directionEmetteurId, scope.directionIdsInMinistere),
          inArray(courriers.destinataireDirectionId, scope.directionIdsInMinistere),
        ),
      );
    } else if (scope.directionId) {
      conditions.push(
        or(
          eq(courriers.directionEmetteurId, scope.directionId),
          eq(courriers.destinataireDirectionId, scope.directionId),
        ),
      );
    } else {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    if (search) {
      conditions.push(
        or(
          like(courriers.reference, `%${search}%`),
          like(courriers.objet, `%${search}%`),
        ),
      );
    }

    if (type) {
      conditions.push(eq(courriers.typeCourrier, type));
    }

    const whereClause = and(...conditions);

    const results = await this.db
      .select({
        id: archives.id,
        courrierId: archives.courrierId,
        dateArchivage: archives.dateArchivage,
        dureeConservation: archives.dureeConservation,
        emplacement: archives.emplacement,
        reference: courriers.reference,
        objet: courriers.objet,
        typeCourrier: courriers.typeCourrier,
        createdAt: courriers.createdAt,
        emetteurNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), 'Inconnu')`,
        directionEmetteurNom: sql<string>`COALESCE(${directions.nom}, 'Inconnue')`,
      })
      .from(archives)
      .innerJoin(courriers, eq(archives.courrierId, courriers.id))
      .leftJoin(utilisateurs, eq(courriers.emetteurId, utilisateurs.id))
      .leftJoin(directions, eq(courriers.directionEmetteurId, directions.id))
      .where(whereClause)
      .orderBy(desc(archives.dateArchivage))
      .limit(limit)
      .offset(offset);

    const enriched = results.map((row) => ({
      ...row,
      ...retentionMeta(row.dateArchivage, row.dureeConservation),
    }));

    const filtered =
      retention && retention !== 'all'
        ? enriched.filter((r) => r.retentionStatus === retention)
        : enriched;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(archives)
      .innerJoin(courriers, eq(archives.courrierId, courriers.id))
      .where(whereClause);

    // Si filtre rétention côté app, total approximatif = filtered length sur page ;
    // pour simplicité on recalcule en filtrant tout si retention demandé
    let total = totalResult.value;
    let data = filtered;

    if (retention && retention !== 'all') {
      const allRows = await this.db
        .select({
          id: archives.id,
          courrierId: archives.courrierId,
          dateArchivage: archives.dateArchivage,
          dureeConservation: archives.dureeConservation,
          emplacement: archives.emplacement,
          reference: courriers.reference,
          objet: courriers.objet,
          typeCourrier: courriers.typeCourrier,
          createdAt: courriers.createdAt,
          emetteurNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), 'Inconnu')`,
          directionEmetteurNom: sql<string>`COALESCE(${directions.nom}, 'Inconnue')`,
        })
        .from(archives)
        .innerJoin(courriers, eq(archives.courrierId, courriers.id))
        .leftJoin(utilisateurs, eq(courriers.emetteurId, utilisateurs.id))
        .leftJoin(directions, eq(courriers.directionEmetteurId, directions.id))
        .where(whereClause)
        .orderBy(desc(archives.dateArchivage));

      const allEnriched = allRows
        .map((row) => ({
          ...row,
          ...retentionMeta(row.dateArchivage, row.dureeConservation),
        }))
        .filter((r) => r.retentionStatus === retention);

      total = allEnriched.length;
      data = allEnriched.slice(offset, offset + limit);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findById(id: number, userId: number) {
    const scope = await this.getUserScope(userId);

    const [archive] = await this.db
      .select()
      .from(archives)
      .where(eq(archives.id, id))
      .limit(1);

    if (!archive) throw new NotFoundException(`Archive #${id} introuvable`);
    if (!archive.courrierId) throw new NotFoundException('Archive sans courrier associé');

    const courrierId = archive.courrierId;

    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);

    if (!courrier || !this.canAccessCourrier(scope, courrier)) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette archive");
    }

    const emetteur = await this.db
      .select({
        id: utilisateurs.id,
        nom: utilisateurs.nom,
        prenom: utilisateurs.prenom,
        email: utilisateurs.email,
      })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, courrier?.emetteurId || 0))
      .limit(1);

    const directionEmetteur = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, courrier?.directionEmetteurId || 0))
      .limit(1);

    const destinataire = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, courrier?.destinataireDirectionId || 0))
      .limit(1);

    let ministereDestinataire: any = null;
    if (courrier?.ministereDestinataireId) {
      const [md] = await this.db
        .select()
        .from(ministeres)
        .where(eq(ministeres.id, courrier.ministereDestinataireId))
        .limit(1);
      ministereDestinataire = md;
    }

    const historique = await this.db
      .select()
      .from(fluxEtapes)
      .where(eq(fluxEtapes.courrierId, courrierId))
      .orderBy(fluxEtapes.dateAction);

    const pieces = await this.db
      .select()
      .from(piecesJointes)
      .where(eq(piecesJointes.courrierId, courrierId));

    return {
      ...archive,
      ...retentionMeta(archive.dateArchivage, archive.dureeConservation),
      courrier: {
        ...courrier,
        emetteur: emetteur[0] || null,
        directionEmetteur: directionEmetteur[0] || null,
        destinataireDirection: destinataire[0] || null,
        ministereDestinataire,
      },
      historique,
      piecesJointes: pieces,
    };
  }

  async findByCourrierId(courrierId: number, userId: number) {
    const [archive] = await this.db
      .select()
      .from(archives)
      .where(eq(archives.courrierId, courrierId))
      .limit(1);

    if (!archive) return null;

    return this.findById(archive.id, userId);
  }

  async desarchiver(id: number, userId: number) {
    const scope = await this.getUserScope(userId);

    const [archive] = await this.db
      .select()
      .from(archives)
      .where(eq(archives.id, id))
      .limit(1);

    if (!archive) throw new NotFoundException(`Archive #${id} introuvable`);
    if (!archive.courrierId) throw new NotFoundException('Archive sans courrier associé');

    const courrierId = archive.courrierId;

    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);

    if (!courrier || !this.canAccessCourrier(scope, courrier)) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à désarchiver ce courrier");
    }

    await this.db
      .update(courriers)
      .set({ statut: StatutCourrier.RECU, updatedAt: new Date() })
      .where(eq(courriers.id, courrierId));

    await this.db.insert(fluxEtapes).values({
      courrierId,
      directionId: scope.directionId || courrier.destinataireDirectionId || courrier.directionEmetteurId || 0,
      action: 'desarchivage',
      utilisateurId: userId,
      commentaire: 'Courrier désarchivé',
    });

    await this.db.delete(archives).where(eq(archives.id, id));

    return { desarchived: true, courrierId };
  }
}

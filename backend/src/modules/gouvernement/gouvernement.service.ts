import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  publicationsGouvernement,
  publicationPiecesJointes,
  publicationAccuses,
  publicationMessages,
  publicationLectures,
  utilisateurs,
  directions,
  ministeres,
} from '../../infrastructure/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service';
import { normalizeRole, UserRole } from '../../common/types/roles';
import {
  AccuseReceptionDto,
  CreatePublicationDto,
  PublicationMessageDto,
  UpdatePublicationDto,
} from './dto/gouvernement.dto';
import { relativeUploadPath } from '../../common/files/storage.util';

@Injectable()
export class GouvernementService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private notificationService: NotificationService,
  ) {}

  private async getUserContext(userId: number) {
    const [row] = await this.db
      .select({
        id: utilisateurs.id,
        role: utilisateurs.role,
        directionId: utilisateurs.directionId,
        ministereDirect: utilisateurs.ministereId,
        ministereViaDirection: directions.ministereId,
        nom: utilisateurs.nom,
        prenom: utilisateurs.prenom,
      })
      .from(utilisateurs)
      .leftJoin(directions, eq(utilisateurs.directionId, directions.id))
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!row) throw new ForbiddenException('Utilisateur introuvable');
    return {
      id: row.id,
      role: normalizeRole(row.role),
      directionId: row.directionId,
      ministereId: row.ministereDirect ?? row.ministereViaDirection ?? null,
      nom: row.nom,
      prenom: row.prenom,
    };
  }

  private assertGouvernement(role: string) {
    if (role !== UserRole.GOUVERNEMENT) {
      throw new ForbiddenException('Réservé au compte Gouvernement');
    }
  }

  private canReadPublication(
    pub: { portee: string; ministereId: number | null; statut: string },
    ctx: { role: string; ministereId: number | null },
  ) {
    if (pub.statut === 'brouillon') {
      return ctx.role === UserRole.GOUVERNEMENT;
    }
    if (ctx.role === UserRole.GOUVERNEMENT || ctx.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    if (pub.portee === 'public') return true;
    return pub.ministereId != null && pub.ministereId === ctx.ministereId;
  }

  async list(userId: number, filters?: { portee?: string; statut?: string }) {
    const ctx = await this.getUserContext(userId);
    const rows = await this.db
      .select({
        publication: publicationsGouvernement,
        ministereNom: ministeres.nom,
        auteurNom: utilisateurs.nom,
        auteurPrenom: utilisateurs.prenom,
      })
      .from(publicationsGouvernement)
      .leftJoin(ministeres, eq(publicationsGouvernement.ministereId, ministeres.id))
      .leftJoin(utilisateurs, eq(publicationsGouvernement.auteurId, utilisateurs.id))
      .orderBy(desc(publicationsGouvernement.createdAt));

    const data: Record<string, unknown>[] = [];
    for (const r of rows) {
      const p = r.publication;
      if (filters?.portee && p.portee !== filters.portee) continue;
      if (filters?.statut && p.statut !== filters.statut) continue;
      if (!this.canReadPublication(p, ctx)) continue;

      // Vue ministère : uniquement ciblés de mon ministère (sauf gouv qui voit tout)
      if (
        filters?.portee === 'ministere' &&
        ctx.role !== UserRole.GOUVERNEMENT &&
        p.ministereId !== ctx.ministereId
      ) {
        continue;
      }

      const [lecture] = await this.db
        .select()
        .from(publicationLectures)
        .where(
          and(
            eq(publicationLectures.publicationId, p.id),
            eq(publicationLectures.utilisateurId, userId),
          ),
        )
        .limit(1);

      data.push({
        ...p,
        ministereNom: r.ministereNom,
        auteurNom: r.auteurNom,
        auteurPrenom: r.auteurPrenom,
        lu: Boolean(lecture),
      });
    }

    return { data };
  }

  async getOne(id: number, userId: number) {
    const ctx = await this.getUserContext(userId);
    const [row] = await this.db
      .select({
        publication: publicationsGouvernement,
        ministereNom: ministeres.nom,
        auteurNom: utilisateurs.nom,
        auteurPrenom: utilisateurs.prenom,
      })
      .from(publicationsGouvernement)
      .leftJoin(ministeres, eq(publicationsGouvernement.ministereId, ministeres.id))
      .leftJoin(utilisateurs, eq(publicationsGouvernement.auteurId, utilisateurs.id))
      .where(eq(publicationsGouvernement.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Publication introuvable');
    if (!this.canReadPublication(row.publication, ctx)) {
      throw new ForbiddenException('Accès non autorisé à cette publication');
    }

    const pieces = await this.db
      .select()
      .from(publicationPiecesJointes)
      .where(eq(publicationPiecesJointes.publicationId, id));

    const accuses = await this.db
      .select({
        id: publicationAccuses.id,
        ministereId: publicationAccuses.ministereId,
        utilisateurId: publicationAccuses.utilisateurId,
        commentaire: publicationAccuses.commentaire,
        dateAr: publicationAccuses.dateAr,
        utilisateurNom: utilisateurs.nom,
        utilisateurPrenom: utilisateurs.prenom,
        ministereNom: ministeres.nom,
      })
      .from(publicationAccuses)
      .leftJoin(utilisateurs, eq(publicationAccuses.utilisateurId, utilisateurs.id))
      .leftJoin(ministeres, eq(publicationAccuses.ministereId, ministeres.id))
      .where(eq(publicationAccuses.publicationId, id));

    let messages: any[] = [];
    if (row.publication.portee === 'ministere') {
      messages = await this.db
        .select({
          id: publicationMessages.id,
          contenu: publicationMessages.contenu,
          createdAt: publicationMessages.createdAt,
          utilisateurId: publicationMessages.utilisateurId,
          utilisateurNom: utilisateurs.nom,
          utilisateurPrenom: utilisateurs.prenom,
          role: utilisateurs.role,
        })
        .from(publicationMessages)
        .leftJoin(utilisateurs, eq(publicationMessages.utilisateurId, utilisateurs.id))
        .where(eq(publicationMessages.publicationId, id))
        .orderBy(publicationMessages.createdAt);
    }

    await this.markRead(id, userId);

    const canReply =
      row.publication.portee === 'ministere' &&
      row.publication.statut === 'publie' &&
      ctx.role === UserRole.DIRECTEUR_MINISTERE &&
      ctx.ministereId === row.publication.ministereId;

    const hasAr = accuses.some((a) => a.ministereId === ctx.ministereId);

    return {
      ...row.publication,
      ministereNom: row.ministereNom,
      auteurNom: row.auteurNom,
      auteurPrenom: row.auteurPrenom,
      piecesJointes: pieces,
      accuses,
      messages,
      canReply,
      hasAr,
      isDirecteurCible: canReply,
    };
  }

  async create(dto: CreatePublicationDto, userId: number) {
    const ctx = await this.getUserContext(userId);
    this.assertGouvernement(ctx.role);

    if (dto.portee === 'ministere' && !dto.ministereId) {
      throw new BadRequestException('ministereId requis pour une publication ciblée');
    }
    if (dto.portee === 'public' && dto.ministereId) {
      throw new BadRequestException('Une publication publique ne doit pas cibler un ministère');
    }

    const publier = Boolean(dto.publier);
    const [pub] = await this.db
      .insert(publicationsGouvernement)
      .values({
        titre: dto.titre,
        corps: dto.corps || null,
        typePublication: dto.typePublication,
        priorite: dto.priorite,
        portee: dto.portee,
        ministereId: dto.portee === 'ministere' ? dto.ministereId! : null,
        statut: publier ? 'publie' : 'brouillon',
        auteurId: userId,
        datePublication: publier ? new Date() : null,
      })
      .returning();

    if (publier) {
      await this.notifyPublication(pub);
    }
    return pub;
  }

  async update(id: number, dto: UpdatePublicationDto, userId: number) {
    const ctx = await this.getUserContext(userId);
    this.assertGouvernement(ctx.role);
    const [existing] = await this.db
      .select()
      .from(publicationsGouvernement)
      .where(eq(publicationsGouvernement.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Publication introuvable');
    if (existing.statut === 'archive') {
      throw new BadRequestException('Publication archivée');
    }

    const [updated] = await this.db
      .update(publicationsGouvernement)
      .set({
        ...(dto.titre !== undefined ? { titre: dto.titre } : {}),
        ...(dto.corps !== undefined ? { corps: dto.corps } : {}),
        ...(dto.typePublication !== undefined ? { typePublication: dto.typePublication } : {}),
        ...(dto.priorite !== undefined ? { priorite: dto.priorite } : {}),
        updatedAt: new Date(),
      })
      .where(eq(publicationsGouvernement.id, id))
      .returning();
    return updated;
  }

  async publish(id: number, userId: number) {
    const ctx = await this.getUserContext(userId);
    this.assertGouvernement(ctx.role);
    const [existing] = await this.db
      .select()
      .from(publicationsGouvernement)
      .where(eq(publicationsGouvernement.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Publication introuvable');
    if (existing.statut !== 'brouillon') {
      throw new BadRequestException('Seuls les brouillons peuvent être publiés');
    }

    const [updated] = await this.db
      .update(publicationsGouvernement)
      .set({ statut: 'publie', datePublication: new Date(), updatedAt: new Date() })
      .where(eq(publicationsGouvernement.id, id))
      .returning();

    await this.notifyPublication(updated);
    return updated;
  }

  async archive(id: number, userId: number) {
    const ctx = await this.getUserContext(userId);
    this.assertGouvernement(ctx.role);
    const [updated] = await this.db
      .update(publicationsGouvernement)
      .set({ statut: 'archive', dateArchivage: new Date(), updatedAt: new Date() })
      .where(eq(publicationsGouvernement.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Publication introuvable');
    return updated;
  }

  private async notifyPublication(pub: typeof publicationsGouvernement.$inferSelect) {
    const payload = {
      type: 'publication_gouv',
      titre: `Actualité gouvernement — ${pub.titre}`,
      message: pub.portee === 'public'
        ? 'Nouveau communiqué adressé à tous les ministères.'
        : 'Nouvelle communication adressée à votre ministère.',
      publicationId: pub.id,
    };
    if (pub.portee === 'public') {
      await this.notificationService.createForAllMinistereUsers(payload);
    } else if (pub.ministereId) {
      await this.notificationService.createForMinistere(pub.ministereId, payload);
    }
  }

  async addPieceJointe(publicationId: number, userId: number, file: Express.Multer.File) {
    const results = await this.addPiecesJointes(publicationId, userId, [file]);
    return results[0];
  }

  async addPiecesJointes(
    publicationId: number,
    userId: number,
    files: Express.Multer.File[],
  ) {
    const ctx = await this.getUserContext(userId);
    this.assertGouvernement(ctx.role);
    const [pub] = await this.db
      .select()
      .from(publicationsGouvernement)
      .where(eq(publicationsGouvernement.id, publicationId))
      .limit(1);
    if (!pub) throw new NotFoundException('Publication introuvable');
    if (pub.statut === 'archive') {
      throw new BadRequestException('Publication archivée : pièces jointes verrouillées');
    }

    const inserted = await this.db
      .insert(publicationPiecesJointes)
      .values(
        files.map((file) => ({
          publicationId,
          nomFichier: file.originalname,
          cheminFichier: relativeUploadPath(file.filename, 'publications'),
          typeMime: file.mimetype,
          tailleBytes: file.size,
        })),
      )
      .returning();
    return inserted;
  }

  async getPieceJointe(publicationId: number, pjId: number, userId: number) {
    await this.getOne(publicationId, userId);
    const [pj] = await this.db
      .select()
      .from(publicationPiecesJointes)
      .where(
        and(
          eq(publicationPiecesJointes.id, pjId),
          eq(publicationPiecesJointes.publicationId, publicationId),
        ),
      )
      .limit(1);
    if (!pj) throw new NotFoundException('Pièce jointe introuvable');
    return pj;
  }

  async accuseReception(publicationId: number, userId: number, dto: AccuseReceptionDto) {
    const ctx = await this.getUserContext(userId);
    const detail = await this.getOne(publicationId, userId);

    if (detail.portee !== 'ministere') {
      throw new BadRequestException('Accusé de réception réservé aux publications ciblées');
    }
    if (ctx.role !== UserRole.DIRECTEUR_MINISTERE || ctx.ministereId !== detail.ministereId) {
      throw new ForbiddenException(
        'Seul le directeur du ministère destinataire peut accuser réception',
      );
    }
    if (detail.hasAr) {
      throw new BadRequestException('Un accusé de réception existe déjà pour ce ministère');
    }

    const [ar] = await this.db
      .insert(publicationAccuses)
      .values({
        publicationId,
        ministereId: ctx.ministereId!,
        utilisateurId: userId,
        commentaire: dto.commentaire || null,
      })
      .returning();

    const label = [ctx.prenom, ctx.nom].filter(Boolean).join(' ') || 'Directeur';
    await this.notificationService.create({
      utilisateurId: detail.auteurId,
      type: 'publication_ar',
      titre: `AR reçu — ${detail.titre}`,
      message: `${label} a accusé réception.`,
      publicationId,
    });

    return ar;
  }

  async addMessage(publicationId: number, userId: number, dto: PublicationMessageDto) {
    const ctx = await this.getUserContext(userId);
    const detail = await this.getOne(publicationId, userId);

    if (detail.portee !== 'ministere' || detail.statut !== 'publie') {
      throw new BadRequestException('Fil de discussion indisponible pour cette publication');
    }

    const isGouv = ctx.role === UserRole.GOUVERNEMENT;
    const isDir =
      ctx.role === UserRole.DIRECTEUR_MINISTERE && ctx.ministereId === detail.ministereId;
    if (!isGouv && !isDir) {
      throw new ForbiddenException(
        'Seuls le Gouvernement et le directeur du ministère peuvent répondre',
      );
    }

    const [msg] = await this.db
      .insert(publicationMessages)
      .values({
        publicationId,
        utilisateurId: userId,
        contenu: dto.contenu.trim(),
      })
      .returning();

    const label = [ctx.prenom, ctx.nom].filter(Boolean).join(' ') || 'Interlocuteur';
    if (isDir) {
      await this.notificationService.create({
        utilisateurId: detail.auteurId,
        type: 'publication_message',
        titre: `Réponse ministère — ${detail.titre}`,
        message: `${label} : ${dto.contenu.trim().slice(0, 120)}`,
        publicationId,
      });
    } else if (detail.ministereId) {
      await this.notificationService.createForMinistere(detail.ministereId, {
        type: 'publication_message',
        titre: `Message gouvernement — ${detail.titre}`,
        message: dto.contenu.trim().slice(0, 120),
        publicationId,
        excludeUserId: userId,
      });
    }

    return {
      ...msg,
      utilisateurNom: ctx.nom,
      utilisateurPrenom: ctx.prenom,
      role: ctx.role,
    };
  }

  async markRead(publicationId: number, userId: number) {
    const [existing] = await this.db
      .select()
      .from(publicationLectures)
      .where(
        and(
          eq(publicationLectures.publicationId, publicationId),
          eq(publicationLectures.utilisateurId, userId),
        ),
      )
      .limit(1);
    if (existing) return existing;

    const [row] = await this.db
      .insert(publicationLectures)
      .values({ publicationId, utilisateurId: userId })
      .returning();
    return row;
  }
}

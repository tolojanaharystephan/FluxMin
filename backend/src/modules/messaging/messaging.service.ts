import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import { messages, messagePiecesJointes, courriers, utilisateurs } from '../../infrastructure/database/schema';
import { eq, and, or, desc, count } from 'drizzle-orm';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';
import { CreateMessageDto } from './dto/messaging.dto';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private gateway: NotificationGateway,
    private notificationService: NotificationService,
  ) {}

  private async verifyAccess(courrierId: number, userId: number) {
    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);

    if (!courrier) throw new NotFoundException('Courrier introuvable');

    if (courrier.emetteurId === userId) return courrier;

    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (user?.directionId && courrier.destinataireDirectionId === user.directionId) {
      return courrier;
    }

    throw new ForbiddenException('Accès non autorisé à cette conversation');
  }

  private async verifyMessageAccess(messageId: number, userId: number) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) throw new NotFoundException('Message introuvable');

    await this.verifyAccess(message.courrierId, userId);
    return message;
  }

  async create(courrierId: number, dto: CreateMessageDto, userId: number) {
    const courrier = await this.verifyAccess(courrierId, userId);

    const [message] = await this.db
      .insert(messages)
      .values({
        courrierId,
        utilisateurId: userId,
        contenu: dto.contenu,
      })
      .returning();

    const [author] = await this.db
      .select({ id: utilisateurs.id, nom: utilisateurs.nom, prenom: utilisateurs.prenom })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    const fullMessage = {
      ...message,
      utilisateurNom: author?.nom ?? null,
      utilisateurPrenom: author?.prenom ?? null,
      piecesJointes: [] as [],
    };

    const authorLabel =
      [author?.prenom, author?.nom].filter(Boolean).join(' ').trim() || 'Un agent';
    const preview =
      (dto.contenu || '').trim().slice(0, 120) || 'Pièce jointe envoyée';
    const ref = courrier.reference || `#${courrierId}`;

    const participantIds = await this.getParticipantIds(courrierId);

    // Temps réel pour tous les participants (discussion ouverte)
    for (const pid of participantIds) {
      if (pid !== userId) {
        this.gateway.emitToUser(pid, 'message:new', fullMessage);
      }
    }

    // Notifications persistantes : émetteur ↔ direction destinataire
    const notifPayload = {
      type: 'message_discussion',
      titre: `Nouveau message — ${ref}`,
      message: `${authorLabel} : ${preview}`,
      courrierId,
    };

    if (courrier.emetteurId === userId) {
      // L'émetteur écrit → prévenir la direction destinataire
      if (courrier.destinataireDirectionId) {
        await this.notificationService.createForDirection(courrier.destinataireDirectionId, {
          ...notifPayload,
          excludeUserId: userId,
        });
      }
    } else {
      // Un agent côté destinataire écrit → prévenir l'émetteur
      if (courrier.emetteurId && courrier.emetteurId !== userId) {
        await this.notificationService.create({
          utilisateurId: courrier.emetteurId,
          ...notifPayload,
        });
      }
    }

    return fullMessage;
  }

  async findByCourrier(courrierId: number, userId: number, page = 1, limit = 50) {
    await this.verifyAccess(courrierId, userId);

    const offset = (page - 1) * limit;

    const data = await this.db
      .select({
        id: messages.id,
        courrierId: messages.courrierId,
        utilisateurId: messages.utilisateurId,
        contenu: messages.contenu,
        createdAt: messages.createdAt,
        utilisateurNom: utilisateurs.nom,
        utilisateurPrenom: utilisateurs.prenom,
      })
      .from(messages)
      .innerJoin(utilisateurs, eq(messages.utilisateurId, utilisateurs.id))
      .where(eq(messages.courrierId, courrierId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const messageIds = data.map((m) => m.id);

    let attachments: any[] = [];
    if (messageIds.length > 0) {
      const conditions = messageIds.map((id) => eq(messagePiecesJointes.messageId, id));
      attachments = await this.db
        .select()
        .from(messagePiecesJointes)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions));
    }

    const dataWithAttachments = data.map((msg) => ({
      ...msg,
      piecesJointes: attachments.filter((a) => a.messageId === msg.id),
    }));

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(messages)
      .where(eq(messages.courrierId, courrierId));

    return {
      data: dataWithAttachments.reverse(),
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit),
      },
    };
  }

  async addPieceJointe(messageId: number, userId: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const message = await this.verifyMessageAccess(messageId, userId);

    // Store a cwd-relative path so download works on Windows/Linux (Multer's file.path is absolute).
    const relativePath = `uploads/messages/${file.filename}`;

    const [pj] = await this.db
      .insert(messagePiecesJointes)
      .values({
        messageId,
        nomFichier: file.originalname,
        cheminFichier: relativePath,
        typeMime: file.mimetype,
        tailleBytes: file.size,
      })
      .returning();

    const participantIds = await this.getParticipantIds(message.courrierId);
    for (const pid of participantIds) {
      if (pid !== userId) {
        this.gateway.emitToUser(pid, 'message:attachment', { messageId, attachment: pj });
      }
    }

    return pj;
  }

  async getPieceJointe(messageId: number, attachmentId: number, userId: number) {
    await this.verifyMessageAccess(messageId, userId);

    const [pj] = await this.db
      .select()
      .from(messagePiecesJointes)
      .where(
        and(
          eq(messagePiecesJointes.id, attachmentId),
          eq(messagePiecesJointes.messageId, messageId),
        )
      )
      .limit(1);

    if (!pj) throw new NotFoundException('Pièce jointe introuvable');
    return pj;
  }

  async getPresence(courrierId: number, userId: number) {
    await this.verifyAccess(courrierId, userId);
    const peerIds = (await this.getParticipantIds(courrierId)).filter((id) => id !== userId);
    const onlinePeerIds = this.gateway.getOnlineAmong(peerIds);
    return {
      peerIds,
      onlinePeerIds,
      anyPeerOnline: onlinePeerIds.length > 0,
    };
  }

  private async getParticipantIds(courrierId: number): Promise<number[]> {
    const [courrier] = await this.db
      .select({ emetteurId: courriers.emetteurId, destinataireDirectionId: courriers.destinataireDirectionId })
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);

    if (!courrier) return [];

    const ids = new Set<number>();
    if (courrier.emetteurId) ids.add(courrier.emetteurId);

    if (courrier.destinataireDirectionId) {
      const users = await this.db
        .select({ id: utilisateurs.id })
        .from(utilisateurs)
        .where(eq(utilisateurs.directionId, courrier.destinataireDirectionId));
      for (const u of users) ids.add(u.id);
    }

    return Array.from(ids);
  }
}

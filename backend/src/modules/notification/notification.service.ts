import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import { notifications, utilisateurs, directions } from '../../infrastructure/database/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private gateway: NotificationGateway,
  ) {}

  async create(data: {
    utilisateurId: number;
    type: string;
    titre: string;
    message?: string;
    courrierId?: number;
  }) {
    const [notification] = await this.db
      .insert(notifications)
      .values({
        utilisateurId: data.utilisateurId,
        type: data.type,
        titre: data.titre,
        message: data.message || null,
        courrierId: data.courrierId || null,
      })
      .returning();

    this.gateway.emitToUser(data.utilisateurId, 'notification', notification);

    return notification;
  }

  async createForDirection(directionId: number, data: {
    type: string;
    titre: string;
    message?: string;
    courrierId?: number;
    excludeUserId?: number;
  }) {
    const users = await this.db
      .select({ id: utilisateurs.id })
      .from(utilisateurs)
      .where(eq(utilisateurs.directionId, directionId));

    for (const user of users) {
      if (data.excludeUserId && user.id === data.excludeUserId) continue;
      await this.create({
        utilisateurId: user.id,
        ...data,
      });
    }
  }

  async findAll(
    userId: number,
    page = 1,
    limit = 20,
    filters?: { type?: string; unreadOnly?: boolean },
  ) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(notifications.utilisateurId, userId)];

    if (filters?.type && filters.type !== 'all') {
      conditions.push(eq(notifications.type, filters.type));
    }
    if (filters?.unreadOnly) {
      conditions.push(eq(notifications.lu, false));
    }

    const whereClause = and(...conditions);

    const results = await this.db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(whereClause);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit) || 0,
      },
    };
  }

  async getUnreadCount(userId: number) {
    const [result] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.utilisateurId, userId), eq(notifications.lu, false)));

    return { count: result.value };
  }

  async markAsRead(id: number, userId: number) {
    const [existing] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.utilisateurId, userId)))
      .limit(1);

    if (!existing) throw new NotFoundException(`Notification #${id} introuvable`);

    await this.db
      .update(notifications)
      .set({ lu: true })
      .where(eq(notifications.id, id));

    return { success: true };
  }

  async markAllAsRead(userId: number) {
    await this.db
      .update(notifications)
      .set({ lu: true })
      .where(and(eq(notifications.utilisateurId, userId), eq(notifications.lu, false)));

    return { success: true };
  }
}

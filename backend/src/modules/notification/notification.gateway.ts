import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<number, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const userId = await this.authenticate(client);
      if (!userId) {
        client.emit('error', { message: 'Authentification WebSocket requise' });
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      const wasOffline = !this.isUserOnline(userId);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Snapshot pour le client qui vient de se connecter
      client.emit('presence:snapshot', { online: this.getOnlineUserIds() });

      // Informer les autres si l'utilisateur passe hors → en ligne
      if (wasOffline) {
        this.server.emit('presence:update', { userId, online: true });
      }
    } catch (err) {
      this.logger.warn(`WS connection rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
        this.server.emit('presence:update', { userId, online: false });
      }
    }
  }

  /** JWT via auth.token, Authorization header — plus de userId en query. */
  private async authenticate(client: Socket): Promise<number | null> {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers?.authorization as string | undefined;
    const raw =
      fromAuth ||
      (fromHeader?.startsWith('Bearer ') ? fromHeader.slice(7) : undefined);

    if (!raw || typeof raw !== 'string') {
      return null;
    }

    const payload = await this.jwtService.verifyAsync<{ sub?: number | string }>(raw, {
      secret: process.env.JWT_SECRET || 'fluxmin-jwt-secret',
    });

    const userId = Number(payload.sub);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  isUserOnline(userId: number): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUserIds(): number[] {
    return Array.from(this.userSockets.keys());
  }

  getOnlineAmong(userIds: number[]): number[] {
    return userIds.filter((id) => this.isUserOnline(id));
  }

  @SubscribeMessage('presence:query')
  handlePresenceQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userIds?: number[] },
  ) {
    const ids = Array.isArray(body?.userIds)
      ? body.userIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const online = ids.length ? this.getOnlineAmong(ids) : this.getOnlineUserIds();
    client.emit('presence:snapshot', { online });
    return { online };
  }

  emitToUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  emitToDirection(
    directionId: number,
    event: string,
    data: any,
    userDirectionMap: Map<number, number>,
  ) {
    for (const [userId, dirId] of userDirectionMap) {
      if (dirId === directionId) {
        this.emitToUser(userId, event, data);
      }
    }
  }
}

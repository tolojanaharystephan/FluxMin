import { Injectable, Inject, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  securityLogs,
  ipBlocks,
  sessions,
  auditLogs,
  utilisateurs,
  directions,
  ministeres,
} from '../../infrastructure/database/schema';
import { and, eq, desc, count, gte, sql, ne, inArray } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service';
import { extractClientIp, geolocateIp, isPrivateIp, type GeoResult } from './geo.util';
import { randomUUID } from 'crypto';

const FAIL_WINDOW_MS = 10 * 60 * 1000;
const FAIL_ALERT_THRESHOLD = 3;
const FAIL_BLOCK_THRESHOLD = 5;
const BLOCK_MINUTES = 15;
const ALLOWED_COUNTRY = 'MG';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type LoginContext = {
  ip: string;
  userAgent: string;
};

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private revokedCache = new Map<string, number>();

  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private notifications: NotificationService,
  ) {}

  clientFromRequest(req: any): LoginContext {
    return {
      ip: extractClientIp(req),
      userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 500),
    };
  }

  newSessionId() {
    return randomUUID();
  }

  async assertIpNotBlocked(ip: string) {
    const [block] = await this.db
      .select()
      .from(ipBlocks)
      .where(and(eq(ipBlocks.ip, ip), gte(ipBlocks.until, new Date())))
      .orderBy(desc(ipBlocks.until))
      .limit(1);

    if (block) {
      throw new HttpException(
        `Trop de tentatives. Réessayez après ${block.until.toLocaleTimeString('fr-FR')}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertSessionActive(sessionId: string | null | undefined) {
    if (!sessionId) return;
    const cached = this.revokedCache.get(sessionId);
    if (cached && cached > Date.now()) {
      throw new HttpException('Session révoquée', HttpStatus.UNAUTHORIZED);
    }
    const [row] = await this.db
      .select({ revokedAt: sessions.revokedAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    if (!row) return;
    if (row.revokedAt) {
      this.revokedCache.set(sessionId, Date.now() + 60_000);
      throw new HttpException('Session révoquée', HttpStatus.UNAUTHORIZED);
    }
    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new HttpException('Session expirée', HttpStatus.UNAUTHORIZED);
    }
  }

  async recordLoginAttempt(params: {
    email: string;
    succes: boolean;
    ctx: LoginContext;
    sessionId?: string | null;
    user?: {
      id: number;
      role: string | null;
      directionId: number | null;
      ministereId: number | null;
    } | null;
  }) {
    const { email, succes, ctx, user } = params;
    const sessionId = succes ? params.sessionId || this.newSessionId() : null;
    const geo = await geolocateIp(ctx.ip);
    const ministry = user ? await this.resolveUserMinistry(user) : null;

    const horsMadagascar =
      !geo.local && !!geo.paysCode && geo.paysCode.toUpperCase() !== ALLOWED_COUNTRY;

    let ipAutreMinistere = false;
    let autreMinistereNom: string | null = null;
    if (succes && ministry && !isPrivateIp(ctx.ip)) {
      const other = await this.findOtherMinistryOnIp(ctx.ip, ministry.id);
      if (other) {
        ipAutreMinistere = true;
        autreMinistereNom = other.nom;
      }
    }

    let risque: 'faible' | 'moyen' | 'eleve' | 'critique' = 'faible';
    let motif = succes ? 'connexion_ok' : 'identifiants_invalides';

    if (!succes) {
      risque = 'moyen';
      motif = 'identifiants_invalides';
    }
    if (ipAutreMinistere) {
      risque = 'eleve';
      motif = 'ip_autre_ministere';
    }
    if (horsMadagascar) {
      risque = 'critique';
      motif = succes ? 'hors_madagascar' : 'tentative_hors_madagascar';
    }

    const [log] = await this.db
      .insert(securityLogs)
      .values({
        email: email?.slice(0, 255) || null,
        utilisateurId: user?.id || null,
        ministereId: ministry?.id || null,
        sessionId,
        succes,
        motif,
        risque,
        ip: ctx.ip,
        userAgent: ctx.userAgent || null,
        pays: geo.pays,
        paysCode: geo.paysCode,
        ville: geo.ville,
        region: geo.region,
        isp: geo.isp,
        latitude: geo.latitude,
        longitude: geo.longitude,
        horsMadagascar,
        horsZoneMinistere: ipAutreMinistere,
        ipAutreMinistere,
        details: {
          ministereNom: ministry?.nom || null,
          ministereCode: ministry?.code || null,
          autreMinistereNom,
          local: geo.local,
          geoProvider: geo.provider,
        },
      })
      .returning();

    if (succes && sessionId && user?.id) {
      await this.db.insert(sessions).values({
        id: sessionId,
        utilisateurId: user.id,
        securityLogId: log.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent || null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      });
    }

    if (!succes) {
      await this.handleFailures(ctx.ip, email, geo);
    }

    if (succes && (horsMadagascar || ipAutreMinistere)) {
      await this.alertAdmins({
        type: horsMadagascar ? 'securite_intrusion' : 'securite_suspect',
        titre: horsMadagascar
          ? `Connexion hors Madagascar (${geo.pays || 'pays inconnu'})`
          : `Connexion depuis l'enceinte d'un autre ministère (${autreMinistereNom})`,
        message: this.buildAlertMessage({
          email,
          ctx,
          geo,
          ministry,
          horsMadagascar,
          ipAutreMinistere,
          autreMinistereNom,
        }),
      });
    }

    return log;
  }

  async listLogs(query: {
    page?: number;
    limit?: number;
    risque?: string;
    succes?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (query.risque && query.risque !== 'all') {
      conditions.push(eq(securityLogs.risque, query.risque));
    }
    if (query.succes === 'true') conditions.push(eq(securityLogs.succes, true));
    if (query.succes === 'false') conditions.push(eq(securityLogs.succes, false));
    if (query.search) {
      const q = `%${query.search}%`;
      conditions.push(
        sql`(${securityLogs.email} ILIKE ${q} OR ${securityLogs.ip} ILIKE ${q} OR ${securityLogs.ville} ILIKE ${q} OR ${securityLogs.sessionId} ILIKE ${q})`,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const data = await this.db
      .select()
      .from(securityLogs)
      .where(where)
      .orderBy(desc(securityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const sessionIds = [...new Set(data.map((d) => d.sessionId).filter(Boolean))] as string[];
    const sessionRows =
      sessionIds.length > 0
        ? await this.db.select().from(sessions).where(inArray(sessions.id, sessionIds))
        : [];
    const sessionMap = new Map(sessionRows.map((s) => [s.id, s]));

    const enriched = data.map((row) => {
      const sess = row.sessionId ? sessionMap.get(row.sessionId) : null;
      return {
        ...row,
        sessionRevoked: !!sess?.revokedAt,
        sessionExpiresAt: sess?.expiresAt || null,
      };
    });

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(securityLogs)
      .where(where);

    const [critiques] = await this.db
      .select({ value: count() })
      .from(securityLogs)
      .where(eq(securityLogs.risque, 'critique'));
    const [suspects] = await this.db
      .select({ value: count() })
      .from(securityLogs)
      .where(eq(securityLogs.risque, 'eleve'));
    const [echecs] = await this.db
      .select({ value: count() })
      .from(securityLogs)
      .where(eq(securityLogs.succes, false));

    return {
      data: enriched,
      pagination: {
        page,
        limit,
        total: totalRow.value,
        totalPages: Math.ceil(totalRow.value / limit) || 0,
      },
      summary: {
        critiques: critiques.value,
        suspects: suspects.value,
        echecs: echecs.value,
      },
    };
  }

  async getLogDetail(id: number) {
    const [log] = await this.db
      .select()
      .from(securityLogs)
      .where(eq(securityLogs.id, id))
      .limit(1);
    if (!log) throw new NotFoundException('Log introuvable');

    let session = null;
    let activity: any[] = [];
    if (log.sessionId) {
      const [s] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, log.sessionId))
        .limit(1);
      session = s || null;
      activity = await this.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entiteType: auditLogs.entiteType,
          entiteId: auditLogs.entiteId,
          ip: auditLogs.ip,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.sessionId, log.sessionId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);
    }

    return { ...log, session, activity, sessionRevoked: !!session?.revokedAt };
  }

  async revokeSession(sessionId: string, reason?: string) {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    if (!row) throw new NotFoundException('Session introuvable');
    if (row.revokedAt) return { ok: true, alreadyRevoked: true };

    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));
    this.revokedCache.set(sessionId, Date.now() + 5 * 60_000);

    await this.alertAdmins({
      type: 'securite_session_revoquee',
      titre: `Session révoquée ${sessionId.slice(0, 8)}…`,
      message: `Session ${sessionId} révoquée. IP : ${row.ip || '—'}. Motif : ${reason || 'action admin'}.`,
    });

    return { ok: true, alreadyRevoked: false };
  }

  async blockIp(ip: string, minutes = 60, raison?: string) {
    if (!ip || ip === 'unknown') {
      throw new HttpException('IP invalide', HttpStatus.BAD_REQUEST);
    }
    const until = new Date(Date.now() + Math.max(1, minutes) * 60 * 1000);
    await this.db.insert(ipBlocks).values({
      ip,
      raison: raison || `Blocage manuel admin (${minutes} min)`,
      until,
    });
    await this.alertAdmins({
      type: 'securite_ip_bloquee',
      titre: `IP bloquée ${ip}`,
      message: `Blocage manuel jusqu'à ${until.toLocaleString('fr-FR')}. Motif : ${raison || 'action admin'}.`,
    });
    return { ok: true, ip, until };
  }

  private async resolveUserMinistry(user: {
    directionId: number | null;
    ministereId: number | null;
  }) {
    if (user.ministereId) {
      const [m] = await this.db
        .select()
        .from(ministeres)
        .where(eq(ministeres.id, user.ministereId))
        .limit(1);
      return m || null;
    }
    if (user.directionId) {
      const [dir] = await this.db
        .select()
        .from(directions)
        .where(eq(directions.id, user.directionId))
        .limit(1);
      if (!dir?.ministereId) return null;
      const [m] = await this.db
        .select()
        .from(ministeres)
        .where(eq(ministeres.id, dir.ministereId))
        .limit(1);
      return m || null;
    }
    return null;
  }

  private async findOtherMinistryOnIp(ip: string, currentMinistereId: number) {
    const rows = await this.db
      .select({
        ministereId: securityLogs.ministereId,
        nom: ministeres.nom,
        code: ministeres.code,
      })
      .from(securityLogs)
      .innerJoin(ministeres, eq(securityLogs.ministereId, ministeres.id))
      .where(
        and(
          eq(securityLogs.ip, ip),
          eq(securityLogs.succes, true),
          ne(securityLogs.ministereId, currentMinistereId),
        ),
      )
      .limit(1);
    return rows[0] || null;
  }

  private async handleFailures(ip: string, email: string, geo: GeoResult) {
    const since = new Date(Date.now() - FAIL_WINDOW_MS);
    const [agg] = await this.db
      .select({ value: count() })
      .from(securityLogs)
      .where(
        and(
          eq(securityLogs.ip, ip),
          eq(securityLogs.succes, false),
          gte(securityLogs.createdAt, since),
        ),
      );

    const fails = agg.value;
    const loc = [geo.ville, geo.pays].filter(Boolean).join(', ') || 'localisation inconnue';

    if (fails >= FAIL_ALERT_THRESHOLD) {
      await this.alertAdmins({
        type: 'securite_brute_force',
        titre: `${fails} tentatives échouées depuis ${ip}`,
        message: `IP ${ip} (${loc}) — dernier email saisi : ${email}. Possible attaque par force brute.`,
      });
    }

    if (fails >= FAIL_BLOCK_THRESHOLD && !isPrivateIp(ip)) {
      const until = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);
      await this.db.insert(ipBlocks).values({
        ip,
        raison: `${fails} échecs en 10 min`,
        until,
      });
      this.logger.warn(`IP bloquée ${ip} jusqu'à ${until.toISOString()}`);
      await this.alertAdmins({
        type: 'securite_ip_bloquee',
        titre: `IP bloquée ${ip}`,
        message: `Blocage automatique ${BLOCK_MINUTES} min après ${fails} échecs. Localisation : ${loc}.`,
      });
    }
  }

  private buildAlertMessage(p: {
    email: string;
    ctx: LoginContext;
    geo: GeoResult;
    ministry: { nom: string; code: string | null } | null;
    horsMadagascar: boolean;
    ipAutreMinistere: boolean;
    autreMinistereNom: string | null;
  }) {
    const loc = [p.geo.ville, p.geo.region, p.geo.pays].filter(Boolean).join(', ') || 'inconnue';
    const coords =
      p.geo.latitude && p.geo.longitude ? ` (${p.geo.latitude}, ${p.geo.longitude})` : '';
    const lines = [
      `Compte : ${p.email}`,
      `Ministère du compte : ${p.ministry ? `${p.ministry.nom} (${p.ministry.code || '—'})` : 'aucun'}`,
      `IP de la connexion : ${p.ctx.ip}`,
      `Localisation (lookup IP) : ${loc}${coords}`,
      p.geo.isp ? `FAI / réseau : ${p.geo.isp}` : '',
    ].filter(Boolean);
    if (p.horsMadagascar) {
      lines.push('Zone autorisée : Madagascar uniquement.');
    }
    if (p.ipAutreMinistere) {
      lines.push(
        `Cette IP a déjà servi à un compte du ministère « ${p.autreMinistereNom} ». ` +
          `Un agent ne doit se connecter que depuis le réseau de son propre ministère.`,
      );
    }
    return lines.join('\n');
  }

  private async alertAdmins(data: { type: string; titre: string; message: string }) {
    try {
      const admins = await this.db
        .select({ id: utilisateurs.id })
        .from(utilisateurs)
        .where(eq(utilisateurs.role, 'super_admin'));

      for (const admin of admins) {
        await this.notifications.create({
          utilisateurId: admin.id,
          type: data.type,
          titre: data.titre,
          message: data.message,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Alerte admin impossible : ${err?.message || err}`);
    }
  }
}

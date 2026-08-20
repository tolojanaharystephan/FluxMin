import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  courriers,
  utilisateurs,
  directions,
  ministeres,
  fluxEtapes,
} from '../../infrastructure/database/schema';
import { eq, and, sql, desc, asc, count, or, not, gte, lt, inArray } from 'drizzle-orm';
import { StatutCourrier } from '../courrier/dto/courrier.dto';

type ScopeContext = {
  userId: number;
  role: string;
  directionId: number | null;
  ministereId: number | null;
  directionIdsInMinistere: number[];
};

const ACTION_LABELS: Record<string, string> = {
  creation: 'Création',
  envoi: 'Envoi',
  reception: 'Réception',
  transmission: 'Transmission',
  validation: 'Validation',
  archivage: 'Archivage',
  desarchivage: 'Désarchivage',
};

@Injectable()
export class StatsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
  ) {}

  private async resolveScope(userId: number): Promise<ScopeContext> {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    let ministereId: number | null = user.ministereId ?? null;
    let directionIdsInMinistere: number[] = [];

    if (!ministereId && user.directionId) {
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
      userId,
      role: user.role || '',
      directionId: user.directionId,
      ministereId,
      directionIdsInMinistere,
    };
  }

  /** Filtre SQL sur les courriers visibles selon le rôle */
  private scopeCondition(scope: ScopeContext) {
    if (scope.role === 'super_admin' || scope.role === 'auditeur') {
      return sql`1 = 1`;
    }
    if (scope.role === 'directeur_ministere' && scope.directionIdsInMinistere.length > 0) {
      return or(
        inArray(courriers.destinataireDirectionId, scope.directionIdsInMinistere),
        inArray(courriers.directionEmetteurId, scope.directionIdsInMinistere),
      )!;
    }
    if (scope.directionId) {
      return or(
        eq(courriers.destinataireDirectionId, scope.directionId),
        eq(courriers.emetteurId, scope.userId),
      )!;
    }
    return eq(courriers.emetteurId, scope.userId);
  }

  private async countWhere(condition: any) {
    const [row] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(condition);
    return Number(row?.value ?? 0);
  }

  private async countByStatut(scopeCond: any, statut: string) {
    return this.countWhere(and(scopeCond, eq(courriers.statut, statut)));
  }

  private formatChange(current: number, previous: number): { changePct: number | null; trend: 'up' | 'down' | 'flat' } {
    if (previous === 0) {
      return { changePct: current > 0 ? 100 : null, trend: current > 0 ? 'up' : 'flat' };
    }
    const pct = Math.round(((current - previous) / previous) * 1000) / 10;
    return {
      changePct: pct,
      trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    };
  }

  async getDashboard(userId: number) {
    const scope = await this.resolveScope(userId);
    const scopeCond = this.scopeCondition(scope);

    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      total,
      brouillon,
      envoye,
      recu,
      enTraitement,
      archive,
      totalThisMonth,
      totalLastMonth,
      inbox,
      sent,
      ministeresCount,
      directionsCount,
      utilisateursCount,
    ] = await Promise.all([
      this.countWhere(and(scopeCond, not(eq(courriers.statut, StatutCourrier.BROUILLON)))),
      this.countByStatut(scopeCond, StatutCourrier.BROUILLON),
      this.countByStatut(scopeCond, StatutCourrier.ENVOYE),
      this.countByStatut(scopeCond, StatutCourrier.RECU),
      this.countByStatut(scopeCond, StatutCourrier.EN_TRAITEMENT),
      this.countByStatut(scopeCond, StatutCourrier.ARCHIVE),
      this.countWhere(and(scopeCond, gte(courriers.createdAt, startThisMonth))),
      this.countWhere(and(scopeCond, gte(courriers.createdAt, startLastMonth), lt(courriers.createdAt, startThisMonth))),
      this.countWhere(
        and(
          scope.directionId
            ? eq(courriers.destinataireDirectionId, scope.directionId)
            : scopeCond,
          not(eq(courriers.statut, StatutCourrier.BROUILLON)),
          not(eq(courriers.statut, StatutCourrier.ARCHIVE)),
        ),
      ),
      this.countWhere(eq(courriers.emetteurId, scope.userId)),
      this.db.select({ value: count() }).from(ministeres).then((r) => Number(r[0]?.value ?? 0)),
      scope.ministereId
        ? this.db
            .select({ value: count() })
            .from(directions)
            .where(eq(directions.ministereId, scope.ministereId))
            .then((r) => Number(r[0]?.value ?? 0))
        : this.db.select({ value: count() }).from(directions).then((r) => Number(r[0]?.value ?? 0)),
      scope.role === 'super_admin'
        ? this.db.select({ value: count() }).from(utilisateurs).then((r) => Number(r[0]?.value ?? 0))
        : scope.directionIdsInMinistere.length
          ? this.db
              .select({ value: count() })
              .from(utilisateurs)
              .where(inArray(utilisateurs.directionId, scope.directionIdsInMinistere))
              .then((r) => Number(r[0]?.value ?? 0))
          : 0,
    ]);

    const enAttente = envoye + enTraitement;
    const volumeChange = this.formatChange(totalThisMonth, totalLastMonth);

    const kpis = this.buildKpis(scope.role, {
      total,
      brouillon,
      envoye,
      recu,
      enTraitement,
      archive,
      enAttente,
      inbox,
      sent,
      ministeresCount,
      directionsCount,
      utilisateursCount,
      volumeChange,
    });

    const recent = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        statut: courriers.statut,
        createdAt: courriers.createdAt,
        emetteurNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), 'Inconnu')`,
        directionNom: sql<string>`COALESCE(${directions.nom}, 'Inconnue')`,
      })
      .from(courriers)
      .leftJoin(utilisateurs, eq(courriers.emetteurId, utilisateurs.id))
      .leftJoin(directions, eq(courriers.directionEmetteurId, directions.id))
      .where(scopeCond)
      .orderBy(desc(courriers.createdAt))
      .limit(8);

    const activityRows = await this.db
      .select({
        at: fluxEtapes.dateAction,
        action: fluxEtapes.action,
        courrierId: fluxEtapes.courrierId,
        reference: courriers.reference,
      })
      .from(fluxEtapes)
      .innerJoin(courriers, eq(fluxEtapes.courrierId, courriers.id))
      .where(scopeCond)
      .orderBy(desc(fluxEtapes.dateAction))
      .limit(8);

    const activity = activityRows.map((row) => ({
      at: row.at,
      action: ACTION_LABELS[row.action || ''] || row.action || 'Action',
      reference: row.reference,
      courrierId: row.courrierId,
    }));

    const [closureBase] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(and(scopeCond, not(eq(courriers.statut, StatutCourrier.BROUILLON))));
    const closureTotal = Number(closureBase?.value ?? 0);
    const closureRate = closureTotal > 0 ? Math.round((archive / closureTotal) * 1000) / 10 : null;

    const [avgRow] = await this.db
      .select({
        avgHours: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${courriers.dateReception} - ${courriers.dateEnvoi})) / 3600.0)`,
      })
      .from(courriers)
      .where(
        and(
          scopeCond,
          sql`${courriers.dateEnvoi} IS NOT NULL`,
          sql`${courriers.dateReception} IS NOT NULL`,
        ),
      );

    const avgTraitementHours =
      avgRow?.avgHours != null ? Math.round(Number(avgRow.avgHours) * 10) / 10 : null;

    return {
      role: scope.role,
      kpis,
      recent,
      activity,
      performance: {
        avgTraitementHours,
        closureRate,
      },
    };
  }

  private buildKpis(
    role: string,
    data: {
      total: number;
      brouillon: number;
      envoye: number;
      recu: number;
      enTraitement: number;
      archive: number;
      enAttente: number;
      inbox: number;
      sent: number;
      ministeresCount: number;
      directionsCount: number;
      utilisateursCount: number;
      volumeChange: { changePct: number | null; trend: 'up' | 'down' | 'flat' };
    },
  ) {
    const vol = data.volumeChange;

    if (role === 'super_admin') {
      return [
        { key: 'total', label: 'Total courriers', value: data.total, changePct: vol.changePct, trend: vol.trend },
        { key: 'ministeres', label: 'Ministères', value: data.ministeresCount, changePct: null, trend: 'flat' as const },
        { key: 'utilisateurs', label: 'Utilisateurs', value: data.utilisateursCount, changePct: null, trend: 'flat' as const },
        { key: 'en_attente', label: 'En attente', value: data.enAttente, changePct: null, trend: 'flat' as const },
      ];
    }

    if (role === 'directeur_ministere') {
      return [
        { key: 'total', label: 'Courriers du ministère', value: data.total, changePct: vol.changePct, trend: vol.trend },
        { key: 'directions', label: 'Directions', value: data.directionsCount, changePct: null, trend: 'flat' as const },
        { key: 'en_attente', label: 'En attente', value: data.enAttente, changePct: null, trend: 'flat' as const },
        { key: 'archive', label: 'Archivés', value: data.archive, changePct: null, trend: 'flat' as const },
      ];
    }

    if (role === 'agent_courrier') {
      return [
        { key: 'inbox', label: 'À traiter', value: data.inbox, changePct: vol.changePct, trend: vol.trend },
        { key: 'recu', label: 'Reçus', value: data.recu, changePct: null, trend: 'flat' as const },
        { key: 'en_traitement', label: 'En traitement', value: data.enTraitement, changePct: null, trend: 'flat' as const },
        { key: 'archive', label: 'Archivés', value: data.archive, changePct: null, trend: 'flat' as const },
      ];
    }

    if (role === 'responsable_direction') {
      return [
        { key: 'inbox', label: 'Courriers de la direction', value: data.inbox, changePct: vol.changePct, trend: vol.trend },
        { key: 'en_attente', label: 'En attente', value: data.enAttente, changePct: null, trend: 'flat' as const },
        { key: 'recu', label: 'Traités (reçus)', value: data.recu, changePct: null, trend: 'flat' as const },
        { key: 'sent', label: 'Envoyés (moi)', value: data.sent, changePct: null, trend: 'flat' as const },
      ];
    }

    // responsable (défaut)
    return [
      { key: 'recu', label: 'Courriers reçus', value: data.recu + data.enTraitement + data.envoye, changePct: vol.changePct, trend: vol.trend },
      { key: 'en_attente', label: 'En attente', value: data.enAttente, changePct: null, trend: 'flat' as const },
      { key: 'archive', label: 'Archivés', value: data.archive, changePct: null, trend: 'flat' as const },
      { key: 'sent', label: 'Envoyés (moi)', value: data.sent, changePct: null, trend: 'flat' as const },
    ];
  }

  async getAnalytics(userId: number, months = 6) {
    const scope = await this.resolveScope(userId);
    const scopeCond = this.scopeCondition(scope);
    const monthCount = Math.min(Math.max(months, 3), 12);

    const [total, traites, enAttente, archives] = await Promise.all([
      this.countWhere(and(scopeCond, not(eq(courriers.statut, StatutCourrier.BROUILLON)))),
      this.countWhere(
        and(
          scopeCond,
          or(eq(courriers.statut, StatutCourrier.RECU), eq(courriers.statut, StatutCourrier.ARCHIVE))!,
        ),
      ),
      this.countWhere(
        and(
          scopeCond,
          or(eq(courriers.statut, StatutCourrier.ENVOYE), eq(courriers.statut, StatutCourrier.EN_TRAITEMENT))!,
        ),
      ),
      this.countByStatut(scopeCond, StatutCourrier.ARCHIVE),
    ]);

    const now = new Date();
    const monthly: Array<{ month: string; monthKey: string; courriers: number; traites: number }> = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const label = start.toLocaleDateString('fr-FR', { month: 'short' });

      const [created] = await this.db
        .select({ value: count() })
        .from(courriers)
        .where(and(scopeCond, gte(courriers.createdAt, start), lt(courriers.createdAt, end)));

      const [done] = await this.db
        .select({ value: count() })
        .from(courriers)
        .where(
          and(
            scopeCond,
            or(eq(courriers.statut, StatutCourrier.RECU), eq(courriers.statut, StatutCourrier.ARCHIVE))!,
            gte(courriers.updatedAt, start),
            lt(courriers.updatedAt, end),
          ),
        );

      monthly.push({
        month: label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
        monthKey,
        courriers: Number(created?.value ?? 0),
        traites: Number(done?.value ?? 0),
      });
    }

    const topRows = await this.db
      .select({
        directionId: courriers.destinataireDirectionId,
        name: directions.nom,
        courriers: count(),
      })
      .from(courriers)
      .leftJoin(directions, eq(courriers.destinataireDirectionId, directions.id))
      .where(and(scopeCond, not(eq(courriers.statut, StatutCourrier.BROUILLON))))
      .groupBy(courriers.destinataireDirectionId, directions.nom)
      .orderBy(desc(count()))
      .limit(5);

    const topTotal = topRows.reduce((sum, r) => sum + Number(r.courriers), 0) || 1;
    const topDirections = topRows
      .filter((r) => r.directionId != null)
      .map((r) => ({
        directionId: r.directionId as number,
        name: r.name || `Direction #${r.directionId}`,
        courriers: Number(r.courriers),
        pourcentage: Math.round((Number(r.courriers) / topTotal) * 1000) / 10,
      }));

    return {
      summary: { total, traites, enAttente, archives },
      monthly,
      topDirections,
    };
  }

  async getProcessMining(userId: number) {
    const scope = await this.resolveScope(userId);
    const scopeCond = this.scopeCondition(scope);

    const actionRows = await this.db
      .select({
        action: fluxEtapes.action,
        total: count(),
      })
      .from(fluxEtapes)
      .innerJoin(courriers, eq(fluxEtapes.courrierId, courriers.id))
      .where(scopeCond)
      .groupBy(fluxEtapes.action)
      .orderBy(desc(count()));

    const byAction = actionRows.map((r) => ({
      action: r.action || 'inconnu',
      label: ACTION_LABELS[r.action || ''] || r.action || 'Inconnu',
      total: Number(r.total),
    }));

    // Transitions A → B (même courrier, étapes consécutives)
    const etapes = await this.db
      .select({
        courrierId: fluxEtapes.courrierId,
        action: fluxEtapes.action,
        dateAction: fluxEtapes.dateAction,
      })
      .from(fluxEtapes)
      .innerJoin(courriers, eq(fluxEtapes.courrierId, courriers.id))
      .where(scopeCond)
      .orderBy(asc(fluxEtapes.courrierId), asc(fluxEtapes.dateAction));

    const transitionMap = new Map<string, number>();
    const byCourrier = new Map<number, Array<{ action: string; date: Date }>>();
    for (const e of etapes) {
      if (e.courrierId == null || !e.action || !e.dateAction) continue;
      const list = byCourrier.get(e.courrierId) || [];
      list.push({ action: e.action, date: e.dateAction });
      byCourrier.set(e.courrierId, list);
    }

    const delaysEnvoiReception: number[] = [];
    const delaysEnvoiArchive: number[] = [];

    for (const steps of byCourrier.values()) {
      for (let i = 0; i < steps.length - 1; i++) {
        const key = `${steps[i].action}→${steps[i + 1].action}`;
        transitionMap.set(key, (transitionMap.get(key) || 0) + 1);
      }
      const envoi = steps.find((s) => s.action === 'envoi');
      const reception = steps.find((s) => s.action === 'reception');
      const archivage = steps.find((s) => s.action === 'archivage');
      if (envoi && reception) {
        delaysEnvoiReception.push(
          (reception.date.getTime() - envoi.date.getTime()) / 36e5,
        );
      }
      if (envoi && archivage) {
        delaysEnvoiArchive.push(
          (archivage.date.getTime() - envoi.date.getTime()) / 36e5,
        );
      }
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    const transitions = [...transitionMap.entries()]
      .map(([transition, total]) => ({ transition, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    return {
      byAction,
      transitions,
      delays: {
        envoiVersReceptionHeures: avg(delaysEnvoiReception),
        envoiVersArchivageHeures: avg(delaysEnvoiArchive),
        echantillonReception: delaysEnvoiReception.length,
        echantillonArchivage: delaysEnvoiArchive.length,
      },
      courriersTraces: byCourrier.size,
    };
  }
}

import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  auditLogs,
  auditReports,
  anomalyResolutions,
  courriers,
  utilisateurs,
  directions,
  fluxEtapes,
} from '../../infrastructure/database/schema';
import { eq, and, like, sql, desc, count, or, gte, lte, ne, inArray } from 'drizzle-orm';
import { StatutCourrier } from '../courrier/dto/courrier.dto';
import {
  QueryAuditLogsDto,
  QueryAuditSearchDto,
  CreateAuditReportDto,
  QueryAnomaliesDto,
} from './dto/audit.dto';

const DELAI_HEURES = 72;

function periodeToDates(periode?: string): { debut?: Date; fin?: Date } {
  if (!periode || periode === 'all') return {};
  const fin = new Date();
  const debut = new Date();
  if (periode === 'today') {
    debut.setHours(0, 0, 0, 0);
  } else if (periode === 'week') {
    debut.setDate(debut.getDate() - 7);
  } else if (periode === 'month') {
    debut.setMonth(debut.getMonth() - 1);
  } else if (periode === 'year') {
    debut.setFullYear(debut.getFullYear() - 1);
  }
  return { debut, fin };
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
  ) {}

  async log(params: {
    utilisateurId?: number;
    action: string;
    entiteType?: string;
    entiteId?: number;
    details?: Record<string, any>;
    ip?: string;
  }) {
    await this.db.insert(auditLogs).values({
      utilisateurId: params.utilisateurId || null,
      action: params.action,
      entiteType: params.entiteType || null,
      entiteId: params.entiteId || null,
      details: params.details || null,
      ip: params.ip || null,
    });
  }

  // ─── Logs ───
  async findLogs(query: QueryAuditLogsDto) {
    const { search, entiteType, action, utilisateurId, dateDebut, dateFin, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(auditLogs.action, `%${search}%`),
          like(auditLogs.entiteType, `%${search}%`),
        ),
      );
    }
    if (entiteType && entiteType !== 'all') {
      conditions.push(eq(auditLogs.entiteType, entiteType));
    }
    if (action) {
      conditions.push(like(auditLogs.action, `%${action}%`));
    }
    if (utilisateurId) {
      conditions.push(eq(auditLogs.utilisateurId, utilisateurId));
    }
    if (dateDebut) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateDebut)));
    }
    if (dateFin) {
      conditions.push(lte(auditLogs.createdAt, new Date(dateFin)));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: auditLogs.id,
        utilisateurId: auditLogs.utilisateurId,
        action: auditLogs.action,
        entiteType: auditLogs.entiteType,
        entiteId: auditLogs.entiteId,
        details: auditLogs.details,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
        utilisateurNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), 'Système')`,
        utilisateurEmail: utilisateurs.email,
      })
      .from(auditLogs)
      .leftJoin(utilisateurs, eq(auditLogs.utilisateurId, utilisateurs.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(auditLogs)
      .where(whereClause);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit) || 0,
      },
    };
  }

  // ─── Recherche courriers (lecture audit) ───
  async searchCourriers(userId: number, query: QueryAuditSearchDto) {
    const user = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user.length) throw new NotFoundException('Utilisateur introuvable');

    const role = user[0].role;
    if (role !== 'auditeur' && role !== 'super_admin') {
      throw new ForbiddenException('Recherche audit réservée aux auditeurs');
    }

    const { search, statut, typeCourrier, periode, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const conditions: any[] = [ne(courriers.statut, StatutCourrier.BROUILLON)];

    if (search) {
      conditions.push(
        or(
          like(courriers.reference, `%${search}%`),
          like(courriers.objet, `%${search}%`),
          like(courriers.corps, `%${search}%`),
        ),
      );
    }
    if (statut && statut !== 'all') {
      conditions.push(eq(courriers.statut, statut));
    }
    if (typeCourrier && typeCourrier !== 'all') {
      conditions.push(eq(courriers.typeCourrier, typeCourrier));
    }

    const { debut, fin } = periodeToDates(periode);
    if (debut) conditions.push(gte(courriers.createdAt, debut));
    if (fin) conditions.push(lte(courriers.createdAt, fin));

    const whereClause = and(...conditions);

    const rows = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        typeCourrier: courriers.typeCourrier,
        statut: courriers.statut,
        createdAt: courriers.createdAt,
        dateEnvoi: courriers.dateEnvoi,
        emetteurNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), '—')`,
        directionNom: sql<string>`COALESCE(${directions.nom}, '—')`,
        actionsCount: sql<number>`(
          SELECT COUNT(*)::int FROM flux_etapes fe WHERE fe.courrier_id = ${courriers.id}
        )`,
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
      data: rows,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit) || 0,
      },
    };
  }

  // ─── Rapports ───
  private async buildReportResume(periodeDebut: Date, periodeFin: Date) {
    const inPeriod = and(
      gte(courriers.createdAt, periodeDebut),
      lte(courriers.createdAt, periodeFin),
    );

    const [totalCourriers] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(and(inPeriod, ne(courriers.statut, StatutCourrier.BROUILLON)));

    const [archivesCount] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(
        and(inPeriod, eq(courriers.statut, StatutCourrier.ARCHIVE)),
      );

    const [envoyes] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(and(inPeriod, eq(courriers.statut, StatutCourrier.ENVOYE)));

    const [recus] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(and(inPeriod, eq(courriers.statut, StatutCourrier.RECU)));

    const [enTraitement] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(and(inPeriod, eq(courriers.statut, StatutCourrier.EN_TRAITEMENT)));

    const [actionsCount] = await this.db
      .select({ value: count() })
      .from(fluxEtapes)
      .where(
        and(
          gte(fluxEtapes.dateAction, periodeDebut),
          lte(fluxEtapes.dateAction, periodeFin),
        ),
      );

    const [logsCount] = await this.db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, periodeDebut),
          lte(auditLogs.createdAt, periodeFin),
        ),
      );

    // Délai moyen envoi → réception (heures), approximatif
    const delayRows = await this.db
      .select({
        dateEnvoi: courriers.dateEnvoi,
        dateReception: courriers.dateReception,
      })
      .from(courriers)
      .where(
        and(
          inPeriod,
          sql`${courriers.dateEnvoi} IS NOT NULL`,
          sql`${courriers.dateReception} IS NOT NULL`,
        ),
      )
      .limit(500);

    let delaiMoyenH = 0;
    if (delayRows.length > 0) {
      const sum = delayRows.reduce((acc, row) => {
        if (!row.dateEnvoi || !row.dateReception) return acc;
        return acc + (row.dateReception.getTime() - row.dateEnvoi.getTime()) / 3_600_000;
      }, 0);
      delaiMoyenH = Math.round((sum / delayRows.length) * 10) / 10;
    }

    const anomalies = await this.detectAnomaliesRaw();
    const anomaliesOuvertes = anomalies.filter((a) => a.statut === 'en_cours').length;

    return {
      courriersTraites: totalCourriers.value,
      archives: archivesCount.value,
      envoyes: envoyes.value,
      recus: recus.value,
      enTraitement: enTraitement.value,
      actionsFlux: actionsCount.value,
      evenementsAudit: logsCount.value,
      delaiMoyenH,
      anomalies: anomaliesOuvertes,
    };
  }

  async listReports() {
    const rows = await this.db
      .select({
        id: auditReports.id,
        titre: auditReports.titre,
        periodeDebut: auditReports.periodeDebut,
        periodeFin: auditReports.periodeFin,
        resume: auditReports.resume,
        createdAt: auditReports.createdAt,
        genereParNom: sql<string>`COALESCE(CONCAT(${utilisateurs.prenom}, ' ', ${utilisateurs.nom}), '—')`,
      })
      .from(auditReports)
      .leftJoin(utilisateurs, eq(auditReports.genereParId, utilisateurs.id))
      .orderBy(desc(auditReports.createdAt));

    return rows.map((r) => ({
      ...r,
      statut: 'generé' as const,
      courriersTraites: (r.resume as any)?.courriersTraites ?? 0,
      delaiMoyen: `${(r.resume as any)?.delaiMoyenH ?? 0}h`,
      anomalies: (r.resume as any)?.anomalies ?? 0,
    }));
  }

  async getReport(id: number) {
    const [row] = await this.db
      .select()
      .from(auditReports)
      .where(eq(auditReports.id, id))
      .limit(1);

    if (!row) throw new NotFoundException(`Rapport #${id} introuvable`);
    return row;
  }

  async generateReport(dto: CreateAuditReportDto, userId: number) {
    const periodeDebut = new Date(dto.periodeDebut);
    const periodeFin = new Date(dto.periodeFin);

    if (isNaN(periodeDebut.getTime()) || isNaN(periodeFin.getTime())) {
      throw new ForbiddenException('Période invalide');
    }
    if (periodeFin < periodeDebut) {
      throw new ForbiddenException('La date de fin doit être après la date de début');
    }

    const resume = await this.buildReportResume(periodeDebut, periodeFin);

    const [report] = await this.db
      .insert(auditReports)
      .values({
        titre: dto.titre.trim(),
        periodeDebut,
        periodeFin,
        genereParId: userId,
        resume,
      })
      .returning();

    return {
      ...report,
      statut: 'generé',
      courriersTraites: resume.courriersTraites,
      delaiMoyen: `${resume.delaiMoyenH}h`,
      anomalies: resume.anomalies,
    };
  }

  // ─── Anomalies (détection live) ───
  private async detectAnomaliesRaw() {
    const resolutions = await this.db.select().from(anomalyResolutions);
    const resolvedKeys = new Set(resolutions.map((r) => r.anomalyKey));

    const stuckStatuses = [
      StatutCourrier.ENVOYE,
      StatutCourrier.RECU,
      StatutCourrier.EN_TRAITEMENT,
    ];

    const seuil = new Date(Date.now() - DELAI_HEURES * 3_600_000);

    const stuck = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        statut: courriers.statut,
        updatedAt: courriers.updatedAt,
        createdAt: courriers.createdAt,
      })
      .from(courriers)
      .where(
        and(
          inArray(courriers.statut, stuckStatuses),
          lte(courriers.updatedAt, seuil),
        ),
      )
      .orderBy(courriers.updatedAt)
      .limit(100);

    const anomalies: Array<{
      id: string;
      type: 'delai' | 'workflow';
      title: string;
      courrierId: number;
      courrier: string;
      objet: string;
      dateDetection: string;
      gravite: 'haute' | 'moyenne' | 'basse';
      statut: 'en_cours' | 'traite';
    }> = [];

    for (const c of stuck) {
      const key = `delai:${c.id}`;
      const refDate = c.updatedAt || c.createdAt;
      const heures = Math.round((Date.now() - new Date(refDate).getTime()) / 3_600_000);
      anomalies.push({
        id: key,
        type: 'delai',
        title: `Dépassement de délai — ${heures}h sans traitement`,
        courrierId: c.id,
        courrier: c.reference,
        objet: c.objet,
        dateDetection: new Date(refDate).toISOString(),
        gravite: heures >= 120 ? 'haute' : heures >= 72 ? 'moyenne' : 'basse',
        statut: resolvedKeys.has(key) ? 'traite' : 'en_cours',
      });
    }

    // Workflow : envoyé depuis > 48h sans aucune étape réception/transmission
    const seuilWorkflow = new Date(Date.now() - 48 * 3_600_000);
    const envoyes = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        dateEnvoi: courriers.dateEnvoi,
        createdAt: courriers.createdAt,
      })
      .from(courriers)
      .where(
        and(
          eq(courriers.statut, StatutCourrier.ENVOYE),
          lte(courriers.dateEnvoi, seuilWorkflow),
        ),
      )
      .limit(50);

    for (const c of envoyes) {
      const [etapes] = await this.db
        .select({ value: count() })
        .from(fluxEtapes)
        .where(
          and(
            eq(fluxEtapes.courrierId, c.id),
            or(
              eq(fluxEtapes.action, 'reception'),
              eq(fluxEtapes.action, 'transmission'),
            ),
          ),
        );

      if (etapes.value === 0) {
        const key = `workflow:${c.id}`;
        // éviter doublon avec delai si déjà listé
        if (anomalies.some((a) => a.courrierId === c.id && a.type === 'delai')) continue;
        anomalies.push({
          id: key,
          type: 'workflow',
          title: 'Courrier envoyé sans réception ni transmission',
          courrierId: c.id,
          courrier: c.reference,
          objet: c.objet,
          dateDetection: (c.dateEnvoi || c.createdAt).toISOString(),
          gravite: 'moyenne',
          statut: resolvedKeys.has(key) ? 'traite' : 'en_cours',
        });
      }
    }

    return anomalies;
  }

  async listAnomalies(query: QueryAnomaliesDto) {
    let anomalies = await this.detectAnomaliesRaw();

    if (query.type && query.type !== 'all') {
      anomalies = anomalies.filter((a) => a.type === query.type);
    }
    if (query.statut && query.statut !== 'all') {
      anomalies = anomalies.filter((a) => a.statut === query.statut);
    }

    return {
      data: anomalies,
      summary: {
        total: anomalies.length,
        enCours: anomalies.filter((a) => a.statut === 'en_cours').length,
        traite: anomalies.filter((a) => a.statut === 'traite').length,
      },
    };
  }

  async resolveAnomaly(anomalyKey: string, userId: number, note?: string) {
    const existing = await this.db
      .select()
      .from(anomalyResolutions)
      .where(eq(anomalyResolutions.anomalyKey, anomalyKey))
      .limit(1);

    if (existing.length) {
      return { resolved: true, anomalyKey };
    }

    await this.db.insert(anomalyResolutions).values({
      anomalyKey,
      resolvedById: userId,
      note: note || null,
    });

    return { resolved: true, anomalyKey };
  }
}

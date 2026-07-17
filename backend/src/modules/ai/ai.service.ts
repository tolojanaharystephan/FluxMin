import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  courriers,
  piecesJointes,
  utilisateurs,
} from '../../infrastructure/database/schema';
import { eq, and, or, inArray, lte, ne, desc, count, sql } from 'drizzle-orm';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  resolveStoredFilePath,
} from '../../common/files/storage.util';
import { StatutCourrier } from '../courrier/dto/courrier.dto';
import { AuditService } from '../audit/audit.service';
import { AnalyzeTextDto, DraftDto } from './dto/ai.dto';

const IA_URL = (process.env.IA_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const ANALYZABLE_EXTS = new Set<string>(ALLOWED_UPLOAD_EXTENSIONS);

@Injectable()
export class AiService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private auditService: AuditService,
  ) {}

  private async callIaAnalyzeFile(buffer: Buffer, filename: string) {
    const form = new FormData();
    const bytes = new Uint8Array(buffer);
    form.append('file', new Blob([bytes]), filename);

    let res: Response;
    try {
      res = await fetch(`${IA_URL}/api/v1/analyze/`, {
        method: 'POST',
        body: form,
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Service IA injoignable (${IA_URL}). Vérifiez que ia-service tourne. ${err.message || ''}`,
      );
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(detail || `Erreur IA HTTP ${res.status}`);
    }
    return res.json();
  }

  private async callIaAnalyzeText(texte: string, objet?: string) {
    let res: Response;
    try {
      res = await fetch(`${IA_URL}/api/v1/analyze/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte, objet }),
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Service IA injoignable (${IA_URL}). ${err.message || ''}`,
      );
    }
    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(detail || `Erreur IA HTTP ${res.status}`);
    }
    return res.json();
  }

  private async callIaDraft(dto: DraftDto) {
    let res: Response;
    try {
      res = await fetch(`${IA_URL}/api/v1/analyze/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Service IA injoignable (${IA_URL}). ${err.message || ''}`,
      );
    }
    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(detail || `Erreur IA HTTP ${res.status}`);
    }
    return res.json();
  }

  async health() {
    try {
      const res = await fetch(`${IA_URL}/health`);
      if (!res.ok) return { status: 'down', url: IA_URL };
      const data = await res.json();
      return { status: 'ok', url: IA_URL, service: data };
    } catch {
      return { status: 'down', url: IA_URL };
    }
  }

  async analyzeText(dto: AnalyzeTextDto) {
    return this.callIaAnalyzeText(dto.texte, dto.objet);
  }

  async draft(dto: DraftDto) {
    return this.callIaDraft(dto);
  }

  async analyzeUpload(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis');
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ANALYZABLE_EXTS.has(ext)) {
      throw new BadRequestException(
        `Format « ${ext || 'inconnu'} » non analysable. ` +
          `Formats acceptés : ${[...ANALYZABLE_EXTS].join(', ')}`,
      );
    }
    return this.callIaAnalyzeFile(file.buffer, file.originalname);
  }

  private async assertCourrierAccess(courrierId: number, userId: number) {
    const [courrier] = await this.db
      .select()
      .from(courriers)
      .where(eq(courriers.id, courrierId))
      .limit(1);
    if (!courrier) throw new NotFoundException('Courrier introuvable');

    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (
      user.role === 'super_admin' ||
      user.role === 'auditeur' ||
      courrier.emetteurId === userId ||
      (user.directionId &&
        (courrier.destinataireDirectionId === user.directionId ||
          courrier.directionEmetteurId === user.directionId))
    ) {
      return { courrier, user };
    }

    throw new ForbiddenException('Accès non autorisé à ce courrier');
  }

  private async callIaBundle(
    documents: Array<{ nomFichier: string; texte: string }>,
    objetCourrier?: string | null,
  ) {
    let res: Response;
    try {
      res = await fetch(`${IA_URL}/api/v1/analyze/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, objetCourrier: objetCourrier || undefined }),
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Service IA injoignable (${IA_URL}). ${err.message || ''}`,
      );
    }
    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(detail || `Erreur IA HTTP ${res.status}`);
    }
    return res.json();
  }

  async analyzePieceJointe(courrierId: number, pjId: number, userId: number) {
    await this.assertCourrierAccess(courrierId, userId);

    const [pj] = await this.db
      .select()
      .from(piecesJointes)
      .where(and(eq(piecesJointes.id, pjId), eq(piecesJointes.courrierId, courrierId)))
      .limit(1);

    if (!pj) throw new NotFoundException('Pièce jointe introuvable');

    const path = resolveStoredFilePath(pj.cheminMinio);
    if (!path || !existsSync(path)) {
      throw new NotFoundException('Fichier introuvable sur le disque');
    }

    const buffer = readFileSync(path);
    const ext = extname(pj.nomFichier || '').toLowerCase();

    if (!ANALYZABLE_EXTS.has(ext)) {
      throw new BadRequestException(
        `Le format « ${ext || 'inconnu'} » n’est pas analysable. ` +
          `Formats acceptés : ${[...ANALYZABLE_EXTS].join(', ')}`,
      );
    }

    const analysis = await this.callIaAnalyzeFile(
      buffer,
      pj.nomFichier || `document${ext || '.bin'}`,
    );

    await this.auditService.log({
      utilisateurId: userId,
      action: 'AI_ANALYZE_PIECE_JOINTE',
      entiteType: 'courrier',
      entiteId: courrierId,
      details: {
        pjId,
        nomFichier: pj.nomFichier,
        priorite: analysis?.prioriteDetecte,
        topDirection: analysis?.recommandations?.[0]?.directionPropose,
      },
    });

    return {
      courrierId,
      pieceJointeId: pjId,
      nomFichier: pj.nomFichier,
      analysis,
    };
  }

  /** Analyse toutes les PJ d'un courrier + correspondances croisées */
  async analyzeAllPiecesJointes(courrierId: number, userId: number) {
    const { courrier } = await this.assertCourrierAccess(courrierId, userId);

    const pjs = await this.db
      .select()
      .from(piecesJointes)
      .where(eq(piecesJointes.courrierId, courrierId));

    if (!pjs.length) {
      throw new BadRequestException('Aucune pièce jointe à analyser sur ce courrier');
    }

    const documents: Array<{ nomFichier: string; texte: string }> = [];
    const details: Array<{
      pieceJointeId: number;
      nomFichier: string;
      ok: boolean;
      error?: string;
      analysis?: any;
    }> = [];

    for (const pj of pjs) {
      const path = resolveStoredFilePath(pj.cheminMinio);
      const ext = extname(pj.nomFichier || '').toLowerCase();
      if (!path || !existsSync(path)) {
        details.push({
          pieceJointeId: pj.id,
          nomFichier: pj.nomFichier,
          ok: false,
          error: 'Fichier introuvable sur le disque',
        });
        documents.push({ nomFichier: pj.nomFichier, texte: '' });
        continue;
      }
      if (!ANALYZABLE_EXTS.has(ext)) {
        details.push({
          pieceJointeId: pj.id,
          nomFichier: pj.nomFichier,
          ok: false,
          error: `Format non analysable (${ext})`,
        });
        documents.push({ nomFichier: pj.nomFichier, texte: '' });
        continue;
      }

      try {
        const buffer = readFileSync(path);
        const analysis = await this.callIaAnalyzeFile(
          buffer,
          pj.nomFichier || `document${ext}`,
        );
        const texte =
          analysis?.ocrResult?.texteExtrait?.texteBrut ||
          analysis?.ocrResult?.resumeStructure?.accroche ||
          '';
        documents.push({ nomFichier: pj.nomFichier, texte });
        details.push({
          pieceJointeId: pj.id,
          nomFichier: pj.nomFichier,
          ok: true,
          analysis,
        });
      } catch (err: any) {
        details.push({
          pieceJointeId: pj.id,
          nomFichier: pj.nomFichier,
          ok: false,
          error: err?.message || 'Échec analyse',
        });
        documents.push({ nomFichier: pj.nomFichier, texte: '' });
      }
    }

    const withText = documents.filter((d) => (d.texte || '').trim().length > 0);
    if (!withText.length) {
      throw new BadRequestException(
        'Aucun texte extractible des pièces jointes. Vérifiez OCR (Tesseract/RapidOCR) et les formats.',
      );
    }

    const analysis = await this.callIaBundle(documents, courrier.objet);

    await this.auditService.log({
      utilisateurId: userId,
      action: 'AI_ANALYZE_ALL_PIECES_JOINTES',
      entiteType: 'courrier',
      entiteId: courrierId,
      details: {
        nbPieces: pjs.length,
        okCount: details.filter((d) => d.ok).length,
        coherenceScore: analysis?.coherenceScore,
        alertes: analysis?.alertes,
      },
    });

    return {
      courrierId,
      nbPieces: pjs.length,
      pieces: details,
      analysis,
    };
  }

  /** Suggestions opérationnelles à partir des données réelles + health IA */
  async getSuggestions(userId: number) {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const health = await this.health();
    const seuil = new Date(Date.now() - 48 * 3_600_000);

    const stuckConditions: any[] = [
      inArray(courriers.statut, [
        StatutCourrier.ENVOYE,
        StatutCourrier.RECU,
        StatutCourrier.EN_TRAITEMENT,
      ]),
      lte(courriers.updatedAt, seuil),
      ne(courriers.statut, StatutCourrier.BROUILLON),
    ];

    if (user.directionId && user.role !== 'super_admin' && user.role !== 'auditeur') {
      stuckConditions.push(
        or(
          eq(courriers.destinataireDirectionId, user.directionId),
          eq(courriers.directionEmetteurId, user.directionId),
          eq(courriers.emetteurId, userId),
        ),
      );
    }

    const stuck = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        statut: courriers.statut,
        updatedAt: courriers.updatedAt,
      })
      .from(courriers)
      .where(and(...stuckConditions))
      .orderBy(courriers.updatedAt)
      .limit(10);

    const unanalyzed = await this.db
      .select({
        id: courriers.id,
        reference: courriers.reference,
        objet: courriers.objet,
        pjCount: sql<number>`(
          SELECT COUNT(*)::int FROM pieces_jointes pj WHERE pj.courrier_id = ${courriers.id}
        )`,
      })
      .from(courriers)
      .where(
        and(
          ne(courriers.statut, StatutCourrier.BROUILLON),
          sql`EXISTS (SELECT 1 FROM pieces_jointes pj WHERE pj.courrier_id = ${courriers.id})`,
        ),
      )
      .orderBy(desc(courriers.createdAt))
      .limit(8);

    const suggestions: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      confiance: number;
      actions: Array<Record<string, any>>;
      items?: any[];
      iaDisponible?: boolean;
    }> = [];

    if (stuck.length > 0) {
      suggestions.push({
        id: 'urgent-stuck',
        type: 'urgent',
        title: `${stuck.length} courrier(s) sans mouvement depuis +48h`,
        description:
          'Ces dossiers dépassent le délai indicatif. Traitez-les ou transmettez-les.',
        confiance: 90,
        actions: [
          { code: 'voir_retards', label: 'Voir les courriers', courrierIds: stuck.map((c) => c.id) },
        ],
        items: stuck,
      });
    }

    const withPj = unanalyzed.filter((c) => (c.pjCount || 0) > 0);
    if (withPj.length > 0) {
      suggestions.push({
        id: 'classify-pj',
        type: 'classification',
        title: `${withPj.length} courrier(s) avec pièces jointes analysables`,
        description:
          'Lancez l’analyse IA (OCR / résumé / direction) depuis le détail du courrier.',
        confiance: health.status === 'ok' ? 85 : 40,
        actions: [
          {
            code: 'ouvrir_premier',
            label: 'Ouvrir un courrier',
            courrierId: withPj[0].id,
          },
        ],
        items: withPj.slice(0, 5),
        iaDisponible: health.status === 'ok',
      });
    }

    suggestions.push({
      id: 'assist-draft',
      type: 'optimisation',
      title: 'Rédaction assistée disponible',
      description:
        'Générez un brouillon d’accusé de réception à partir d’un résumé (validation humaine obligatoire).',
      confiance: 55,
      actions: [{ code: 'ouvrir_draft', label: 'Essayer la rédaction assistée' }],
    });

    if (health.status !== 'ok') {
      suggestions.unshift({
        id: 'ia-down',
        type: 'systeme',
        title: 'Service IA local indisponible',
        description: `Impossible de joindre ${IA_URL}. Démarrez ia-service pour OCR et suggestions documentaires.`,
        confiance: 100,
        actions: [],
      });
    }

    const [totalCourriers] = await this.db
      .select({ value: count() })
      .from(courriers)
      .where(ne(courriers.statut, StatutCourrier.BROUILLON));

    return {
      ia: health,
      stats: {
        courriersActifs: totalCourriers.value,
        retards48h: stuck.length,
        avecPiecesJointes: withPj.length,
      },
      suggestions,
      avertissement: 'Toutes les suggestions IA sont indicatives et doivent être validées.',
    };
  }

  async acceptSuggestion(
    userId: number,
    payload: { actionCode: string; commentaire?: string; courrierId?: number },
  ) {
    await this.auditService.log({
      utilisateurId: userId,
      action: 'AI_SUGGESTION_ACCEPTED',
      entiteType: payload.courrierId ? 'courrier' : 'ai',
      entiteId: payload.courrierId || undefined,
      details: {
        actionCode: payload.actionCode,
        commentaire: payload.commentaire || null,
      },
    });
    return { accepted: true, actionCode: payload.actionCode };
  }
}

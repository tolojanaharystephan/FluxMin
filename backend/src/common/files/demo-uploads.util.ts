import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UPLOADS_ROOT } from './storage.util';

/** PDF démo attendus par le seed — doivent exister pour toute analyse. */
export const DEMO_UPLOAD_FILES: Record<string, string[]> = {
  'convention_partenariat_culturel.pdf': [
    'CONVENTION DE PARTENARIAT CULTUREL',
    'Reference: MCC-CONV-2026-014',
    'Entre MCC et MINJUS.',
    'Objet: preservation du patrimoine culturel commun.',
    'Destinataire: Direction du Patrimoine Culturel MCC.',
    'Emetteur: Direction du Courrier MINJUS.',
    'Montant previsionnel: 12500 EUR.',
    'Date: 15 mars 2026.',
    'Demande de validation et transmission.',
  ],
  'fiche_technique_serveurs.pdf': [
    'FICHE TECHNIQUE SERVEURS',
    'Reference: MFA-DSI-2026-001',
    'Demande urgente de renouvellement de licence DSI.',
    'Priorite haute - Direction des Systemes d Information.',
  ],
  'accord_securite_interministeriel.pdf': [
    'ACCORD DE SECURITE INTERMINISTERIELLE',
    'Reference: MINJUS-SEC-2026-002',
    'Transmission des dossiers de securite MINJUS / MFA.',
    'Priorite haute - validation Direction Courrier.',
  ],
};

/** PDF minimal Type1 Helvetica — texte extractible (pypdf / ia-service). */
function buildSimplePdf(lines: string[]): Buffer {
  const escapePdf = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      // PDF Latin-1 safe
      .replace(/[^\x20-\x7E]/g, '?');

  const contentOps = ['BT', '/F1 11 Tf', '50 750 Td'];
  lines.forEach((line, i) => {
    if (i > 0) contentOps.push('0 -14 Td');
    contentOps.push(`(${escapePdf(line)}) Tj`);
  });
  contentOps.push('ET');
  const stream = Buffer.from(contentOps.join('\n'), 'latin1');

  const objects: Buffer[] = [
    Buffer.from('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n'),
    Buffer.from('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n'),
    Buffer.from(
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
    ),
    Buffer.concat([
      Buffer.from(`4 0 obj<< /Length ${stream.length} >>stream\n`),
      stream,
      Buffer.from('\nendstream\nendobj\n'),
    ]),
    Buffer.from('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n'),
  ];

  const header = Buffer.from('%PDF-1.4\n');
  const parts: Buffer[] = [header];
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const obj of objects) {
    offsets.push(cursor);
    parts.push(obj);
    cursor += obj.length;
  }

  const xrefPos = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'latin1'), Buffer.from(trailer, 'latin1'));
  return Buffer.concat(parts);
}

/**
 * Crée les PDF de démo manquants sous uploads/.
 * Appelé au seed et au démarrage Nest — évite les analyses « fichier introuvable ».
 */
export function ensureDemoUploadPdfs(uploadsDir: string = UPLOADS_ROOT): {
  created: string[];
  existing: string[];
} {
  mkdirSync(uploadsDir, { recursive: true });
  const created: string[] = [];
  const existing: string[] = [];

  for (const [filename, lines] of Object.entries(DEMO_UPLOAD_FILES)) {
    const full = join(uploadsDir, filename);
    if (existsSync(full)) {
      existing.push(filename);
      continue;
    }
    writeFileSync(full, buildSimplePdf(lines));
    created.push(filename);
  }

  return { created, existing };
}

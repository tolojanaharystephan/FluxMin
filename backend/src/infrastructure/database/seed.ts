import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ensureDemoUploadPdfs } from '../../common/files/demo-uploads.util';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const runSeed = async () => {
  console.log('Seeding database with demo data...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fluxmin',
  });
  const db = drizzle(pool, { schema });

  // 1. Nettoyer les tables existantes (ordre FK)
  console.log('Cleaning existing tables...');
  await db.delete(schema.publicationLectures);
  await db.delete(schema.publicationMessages);
  await db.delete(schema.publicationAccuses);
  await db.delete(schema.publicationPiecesJointes);
  await db.delete(schema.publicationsGouvernement);
  await db.delete(schema.anomalyResolutions);
  await db.delete(schema.auditReports);
  await db.delete(schema.auditLogs);
  await db.delete(schema.sessions);
  await db.delete(schema.ipBlocks);
  await db.delete(schema.securityLogs);
  await db.delete(schema.archives);
  await db.delete(schema.messagePiecesJointes);
  await db.delete(schema.messages);
  await db.delete(schema.notifications);
  await db.delete(schema.fluxEtapes);
  await db.delete(schema.piecesJointes);
  await db.delete(schema.courriers);
  await db.delete(schema.utilisateurs);
  await db.delete(schema.directions);
  await db.delete(schema.ministeres);

  // 2. Insérer les ministères
  console.log('Inserting ministeres...');
  const [mfa, minjus, mcc] = await db.insert(schema.ministeres).values([
    { nom: 'Ministère des Forces Armées', code: 'MFA' },
    { nom: 'Ministère de la Justice', code: 'MINJUS' },
    { nom: 'Ministère de la Culture et de la Communication', code: 'MCC' },
  ]).returning();

  // 3. Insérer les directions — chaque ministère a une direction courrier + directions métier
  console.log('Inserting directions...');

  const [mfaCourrier, mfaDsi, mfaDrh, mfaDaf] = await db.insert(schema.directions).values([
    { ministereId: mfa.id, nom: 'Direction du Courrier MFA', type: 'courrier' },
    { ministereId: mfa.id, nom: 'Direction des Systèmes d\'Information MFA', type: 'dsi' },
    { ministereId: mfa.id, nom: 'Direction des Ressources Humaines MFA', type: 'drh' },
    { ministereId: mfa.id, nom: 'Direction Administrative et Financière MFA', type: 'daf' },
  ]).returning();

  const [minjusCourrier, minjusDaf, minjusDrh, minjusDaj] = await db.insert(schema.directions).values([
    { ministereId: minjus.id, nom: 'Direction du Courrier MINJUS', type: 'courrier' },
    { ministereId: minjus.id, nom: 'Direction Administrative et Financière MINJUS', type: 'daf' },
    { ministereId: minjus.id, nom: 'Direction des Ressources Humaines MINJUS', type: 'drh' },
    { ministereId: minjus.id, nom: 'Direction des Affaires Civiles et du Sceau MINJUS', type: 'daj' },
  ]).returning();

  const [mccCourrier, mccPatrimoine, mccDaf] = await db.insert(schema.directions).values([
    { ministereId: mcc.id, nom: 'Direction du Courrier MCC', type: 'courrier' },
    { ministereId: mcc.id, nom: 'Direction du Patrimoine Culturel MCC', type: 'patrimoine' },
    { ministereId: mcc.id, nom: 'Direction Administrative et Financière MCC', type: 'daf' },
  ]).returning();

  // 4. Insérer les utilisateurs — chaque direction a au moins un agent
  console.log('Inserting utilisateurs...');
  const hashedMdp = await bcrypt.hash('fluxmin2026', 10);

  // ── MFA ──
  const [
    agentCourrierMfa,   // agent_courrier → Dir. Courrier MFA
    responsableDsiMfa,  // responsable → DSI MFA
    agentDsiMfa,        // responsable → DSI MFA
    agentDrhMfa,        // responsable → DRH MFA
    agentDafMfa,        // responsable → DAF MFA
  ] = await db.insert(schema.utilisateurs).values([
    {
      directionId: mfaCourrier.id,
      email: 'agent.courrier.mfa@fluxmin.gouv.fr',
      nom: 'Dupont',
      prenom: 'Jean',
      role: 'agent_courrier',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mfaDsi.id,
      email: 'responsable.dsi.mfa@fluxmin.gouv.fr',
      nom: 'Martin',
      prenom: 'Sophie',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mfaDsi.id,
      email: 'agent.dsi.mfa@fluxmin.gouv.fr',
      nom: 'Bernard',
      prenom: 'Lucas',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mfaDrh.id,
      email: 'agent.drh.mfa@fluxmin.gouv.fr',
      nom: 'Moreau',
      prenom: 'Claire',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mfaDaf.id,
      email: 'agent.daf.mfa@fluxmin.gouv.fr',
      nom: 'Petit',
      prenom: 'Thomas',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // ── MINJUS ──
  const [
    agentCourrierMinjus,  // agent_courrier → Dir. Courrier MINJUS
    responsableDafMinjus, // responsable → DAF MINJUS
    agentDrhMinjus,       // responsable → DRH MINJUS
    agentDajMinjus,       // responsable → DAJ MINJUS
  ] = await db.insert(schema.utilisateurs).values([
    {
      directionId: minjusCourrier.id,
      email: 'agent.courrier.minjus@fluxmin.gouv.fr',
      nom: 'Lemoine',
      prenom: 'Alice',
      role: 'agent_courrier',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: minjusDaf.id,
      email: 'responsable.daf.minjus@fluxmin.gouv.fr',
      nom: 'Girard',
      prenom: 'Pierre',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: minjusDrh.id,
      email: 'agent.drh.minjus@fluxmin.gouv.fr',
      nom: 'Roux',
      prenom: 'Marie',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: minjusDaj.id,
      email: 'agent.daj.minjus@fluxmin.gouv.fr',
      nom: 'Fournier',
      prenom: 'Antoine',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // ── MCC ──
  const [
    agentCourrierMcc,    // agent_courrier → Dir. Courrier MCC
    agentPatrimoineMcc,  // responsable → Patrimoine MCC
    agentDafMcc,         // responsable → DAF MCC
  ] = await db.insert(schema.utilisateurs).values([
    {
      directionId: mccCourrier.id,
      email: 'agent.courrier.mcc@fluxmin.gouv.fr',
      nom: 'Rasoamanarivo',
      prenom: 'Marie',
      role: 'agent_courrier',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mccPatrimoine.id,
      email: 'agent.patrimoine.mcc@fluxmin.gouv.fr',
      nom: 'Rakoto',
      prenom: 'Hery',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: mccDaf.id,
      email: 'agent.daf.mcc@fluxmin.gouv.fr',
      nom: 'Andria',
      prenom: 'Nomena',
      role: 'responsable',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // Super admin
  const [superAdmin] = await db.insert(schema.utilisateurs).values([
    {
      directionId: null,
      email: 'admin@fluxmin.gouv.fr',
      nom: 'Rakoto',
      prenom: 'Andry',
      role: 'super_admin',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // Gouvernement
  const [userGouvernement] = await db.insert(schema.utilisateurs).values([
    {
      directionId: null,
      email: 'gouvernement@fluxmin.gouv.fr',
      nom: 'Rabenoro',
      prenom: 'Soa',
      role: 'gouvernement',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // ── Directeurs de ministère (un par ministère) ──
  // Directeurs : rattachés au ministère uniquement (pas de direction)
  const [dirMfa, dirMinjus, dirMcc] = await db.insert(schema.utilisateurs).values([
    {
      directionId: null,
      ministereId: mfa.id,
      email: 'directeur.mfa@fluxmin.gouv.fr',
      nom: 'Razafy',
      prenom: 'Mamy',
      role: 'directeur_ministere',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: null,
      ministereId: minjus.id,
      email: 'directeur.minjus@fluxmin.gouv.fr',
      nom: 'Ravelo',
      prenom: 'Hasina',
      role: 'directeur_ministere',
      permissions: {},
      motDePasse: hashedMdp,
    },
    {
      directionId: null,
      ministereId: mcc.id,
      email: 'directeur.mcc@fluxmin.gouv.fr',
      nom: 'Andrianina',
      prenom: 'Lalao',
      role: 'directeur_ministere',
      permissions: {},
      motDePasse: hashedMdp,
    },
  ]).returning();

  // Publications gouvernement démo
  console.log('Inserting publications gouvernement...');
  const [pubPublic] = await db.insert(schema.publicationsGouvernement).values([
    {
      titre: 'Communiqué — Semaine de la modernisation administrative',
      corps:
        'Le Gouvernement invite tous les ministères à participer à la semaine de modernisation des services publics du 21 au 25 juillet 2026. Des ateliers de formation FluxMin seront organisés.',
      typePublication: 'communique',
      priorite: 'normale',
      portee: 'public',
      ministereId: null,
      statut: 'publie',
      auteurId: userGouvernement.id,
      datePublication: new Date(),
    },
  ]).returning();

  const [pubCible] = await db.insert(schema.publicationsGouvernement).values([
    {
      titre: 'Ordre de mission — Audit de cybersécurité MFA',
      corps:
        'Le Ministère des Forces Armées est invité à préparer un rapport de cybersécurité pour le 30 juillet 2026. Merci d\'accuser réception et de confirmer le calendrier.',
      typePublication: 'ordre',
      priorite: 'haute',
      portee: 'ministere',
      ministereId: mfa.id,
      statut: 'publie',
      auteurId: userGouvernement.id,
      datePublication: new Date(),
    },
  ]).returning();

  void pubPublic;
  void pubCible;
  void dirMfa;
  void dirMinjus;
  void dirMcc;

  // 5. Insérer des courriers de démo illustrant les flux
  console.log('Inserting courriers...');

  // Courrier 1 : Interne MFA — DSI → DRH (via Dir. Courrier MFA)
  const [courrier1] = await db.insert(schema.courriers).values([
    {
      reference: 'MFA-INT-2026-000001',
      objet: 'Demande de mise à niveau de l\'infrastructure serveur',
      corps: 'Bonjour, dans le cadre de la transition FluxMin, la DSI demande l\'acquisition de 4 serveurs supplémentaires. Cordialement.',
      typeCourrier: 'interne',
      statut: 'en_traitement',
      emetteurId: agentDsiMfa.id,
      directionEmetteurId: mfaDsi.id,
      directionCourrierEmetteurId: mfaCourrier.id,
      destinataireDirectionId: mfaDrh.id,
      dateEnvoi: new Date(Date.now() - 3600000),
      metadata: { priorite: 'moyenne' },
    }
  ]).returning();

  // Courrier 2 : Externe MINJUS → MFA — Dir. Courrier MINJUS → DSI MFA
  const [courrier2] = await db.insert(schema.courriers).values([
    {
      reference: 'MINJUS-EXT-2026-000002',
      objet: 'Demande de transmission de dossiers de sécurité interministérielle',
      corps: 'Monsieur le Directeur, je sollicite la transmission des pièces de sécurité relatives à la liaison interministérielle.',
      typeCourrier: 'externe',
      statut: 'recu',
      emetteurId: agentCourrierMinjus.id,
      directionEmetteurId: minjusCourrier.id,
      directionCourrierEmetteurId: minjusCourrier.id,
      destinataireDirectionId: mfaDsi.id,
      ministereDestinataireId: mfa.id,
      dateEnvoi: new Date(Date.now() - 7200000),
      dateReception: new Date(Date.now() - 3600000),
      metadata: { priorite: 'haute' },
    }
  ]).returning();

  // Courrier 3 : Externe MCC → MINJUS — Dir. Courrier MCC → DAF MINJUS
  const [courrier3] = await db.insert(schema.courriers).values([
    {
      reference: 'MCC-EXT-2026-000003',
      objet: 'Convention de partenariat culturel franco-malgache',
      corps: 'Madame la Directrice, veuillez trouver ci-joint la proposition de convention de partenariat pour la préservation du patrimoine culturel commun.',
      typeCourrier: 'externe',
      statut: 'envoye',
      emetteurId: agentCourrierMcc.id,
      directionEmetteurId: mccCourrier.id,
      directionCourrierEmetteurId: mccCourrier.id,
      destinataireDirectionId: minjusDaf.id,
      ministereDestinataireId: minjus.id,
      dateEnvoi: new Date(),
      metadata: { priorite: 'moyenne' },
    }
  ]).returning();

  // Courrier 4 : Interne MINJUS — DAF → DAJ (via Dir. Courrier MINJUS)
  const [courrier4] = await db.insert(schema.courriers).values([
    {
      reference: 'MINJUS-INT-2026-000004',
      objet: 'Budget prévisionnel formation 2026',
      corps: 'Bonjour, veuillez trouver ci-joint le budget prévisionnel pour les formations de l\'année 2026.',
      typeCourrier: 'interne',
      statut: 'brouillon',
      emetteurId: responsableDafMinjus.id,
      directionEmetteurId: minjusDaf.id,
      directionCourrierEmetteurId: minjusCourrier.id,
      destinataireDirectionId: minjusDaj.id,
      createdAt: new Date(),
    }
  ]).returning();

  // Courrier 5 : Interne MFA — DAF → DSI (via Dir. Courrier MFA)
  const [courrier5] = await db.insert(schema.courriers).values([
    {
      reference: 'MFA-INT-2026-000005',
      objet: 'Validation budgétaire acquisition licences logicielles',
      corps: 'Madame la Responsable, le budget pour l\'acquisition de 200 licences Office 365 est approuvé. Procédez à la commande.',
      typeCourrier: 'interne',
      statut: 'recu',
      emetteurId: agentDafMfa.id,
      directionEmetteurId: mfaDaf.id,
      directionCourrierEmetteurId: mfaCourrier.id,
      destinataireDirectionId: mfaDsi.id,
      dateEnvoi: new Date(Date.now() - 86400000),
      dateReception: new Date(Date.now() - 43200000),
      metadata: { priorite: 'haute' },
    }
  ]).returning();

  // 6. Insérer des étapes de flux
  console.log('Inserting flux etapes...');
  await db.insert(schema.fluxEtapes).values([
    // Courrier 1 — Interne MFA
    {
      courrierId: courrier1.id,
      directionId: mfaDsi.id,
      action: 'creation',
      utilisateurId: agentDsiMfa.id,
      commentaire: 'Courrier créé par la DSI',
      dateAction: new Date(Date.now() - 7200000),
    },
    {
      courrierId: courrier1.id,
      directionId: mfaDsi.id,
      action: 'envoi',
      utilisateurId: agentDsiMfa.id,
      commentaire: 'Courrier envoyé pour validation budgétaire',
      dateAction: new Date(Date.now() - 3600000),
    },
    {
      courrierId: courrier1.id,
      directionId: mfaCourrier.id,
      action: 'transmission',
      utilisateurId: agentCourrierMfa.id,
      commentaire: 'Transmis à la DRH pour traitement',
      dateAction: new Date(),
    },
    // Courrier 2 — Externe MINJUS → MFA
    {
      courrierId: courrier2.id,
      directionId: minjusCourrier.id,
      action: 'envoi',
      utilisateurId: agentCourrierMinjus.id,
      commentaire: 'Envoi externe vers la DSI du MFA',
      dateAction: new Date(Date.now() - 7200000),
    },
    {
      courrierId: courrier2.id,
      directionId: mfaDsi.id,
      action: 'reception',
      utilisateurId: agentDsiMfa.id,
      commentaire: 'Reçu et pris en charge par la DSI',
      dateAction: new Date(Date.now() - 3600000),
    },
    // Courrier 5 — Interne MFA
    {
      courrierId: courrier5.id,
      directionId: mfaDaf.id,
      action: 'envoi',
      utilisateurId: agentDafMfa.id,
      commentaire: 'Budget validé, envoi à la DSI',
      dateAction: new Date(Date.now() - 86400000),
    },
    {
      courrierId: courrier5.id,
      directionId: mfaCourrier.id,
      action: 'transmission',
      utilisateurId: agentCourrierMfa.id,
      commentaire: 'Transmis à la DSI MFA',
      dateAction: new Date(Date.now() - 43200000),
    },
    {
      courrierId: courrier5.id,
      directionId: mfaDsi.id,
      action: 'reception',
      utilisateurId: agentDsiMfa.id,
      commentaire: 'Accusé de réception',
      dateAction: new Date(Date.now() - 3600000),
    },
  ]);

  // 7. Pièces jointes de démo (fichiers réels dans uploads/)
  console.log('Inserting pieces jointes...');
  const demoFiles = ensureDemoUploadPdfs();
  if (demoFiles.created.length) {
    console.log('PDF démo créés:', demoFiles.created.join(', '));
  }
  await db.insert(schema.piecesJointes).values([
    {
      courrierId: courrier1.id,
      nomFichier: 'fiche_technique_serveurs.pdf',
      cheminMinio: 'uploads/fiche_technique_serveurs.pdf',
      typeMime: 'application/pdf',
      tailleBytes: 154200,
    },
    {
      courrierId: courrier2.id,
      nomFichier: 'accord_securite_interministeriel.pdf',
      cheminMinio: 'uploads/accord_securite_interministeriel.pdf',
      typeMime: 'application/pdf',
      tailleBytes: 345000,
    },
    {
      courrierId: courrier3.id,
      nomFichier: 'convention_partenariat_culturel.pdf',
      cheminMinio: 'uploads/convention_partenariat_culturel.pdf',
      typeMime: 'application/pdf',
      tailleBytes: 278000,
    },
  ]);

  console.log('Seeding completed successfully!');
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  COMPTES DE DÉMO');
  console.log('═══════════════════════════════════════════════');
  console.log('  Super Admin   : admin@fluxmin.gouv.fr');
  console.log('  Gouvernement  : gouvernement@fluxmin.gouv.fr');
  console.log('');
  console.log('  Directeurs de ministère :');
  console.log('    MFA         : directeur.mfa@fluxmin.gouv.fr');
  console.log('    MINJUS      : directeur.minjus@fluxmin.gouv.fr');
  console.log('    MCC         : directeur.mcc@fluxmin.gouv.fr');
  console.log('');
  console.log('  MFA :');
  console.log('    Courrier    : agent.courrier.mfa@fluxmin.gouv.fr');
  console.log('    DSI Resp.   : responsable.dsi.mfa@fluxmin.gouv.fr');
  console.log('    DSI Agent   : agent.dsi.mfa@fluxmin.gouv.fr');
  console.log('    DRH Agent   : agent.drh.mfa@fluxmin.gouv.fr');
  console.log('    DAF Agent   : agent.daf.mfa@fluxmin.gouv.fr');
  console.log('');
  console.log('  MINJUS :');
  console.log('    Courrier    : agent.courrier.minjus@fluxmin.gouv.fr');
  console.log('    DAF Resp.   : responsable.daf.minjus@fluxmin.gouv.fr');
  console.log('    DRH Agent   : agent.drh.minjus@fluxmin.gouv.fr');
  console.log('    DAJ Agent   : agent.daj.minjus@fluxmin.gouv.fr');
  console.log('');
  console.log('  MCC :');
  console.log('    Courrier    : agent.courrier.mcc@fluxmin.gouv.fr');
  console.log('    Patrimoine  : agent.patrimoine.mcc@fluxmin.gouv.fr');
  console.log('    DAF Agent   : agent.daf.mcc@fluxmin.gouv.fr');
  console.log('');
  console.log('  Super Admin  : admin@fluxmin.gouv.fr');
  console.log('  Mot de passe : fluxmin2026');
  console.log('═══════════════════════════════════════════════');

  await pool.end();
};

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

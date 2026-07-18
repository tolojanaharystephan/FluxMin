import { pgTable, serial, varchar, timestamp, integer, text, jsonb, bigint, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Entités organisationnelles : Ministères
export const ministeres = pgTable('ministeres', {
  id: serial('id').primaryKey(),
  nom: varchar('nom', { length: 255 }).notNull().unique(),
  code: varchar('code', { length: 50 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Entités organisationnelles : Directions
export const directions = pgTable('directions', {
  id: serial('id').primaryKey(),
  ministereId: integer('ministere_id').references(() => ministeres.id),
  nom: varchar('nom', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }), // 'courrier', 'dsi', 'daf', 'drh', etc.
}, (table) => {
  return {
    unq: {
      columns: [table.ministereId, table.nom]
    }
  };
});

// 3. Utilisateurs et rôles
export const utilisateurs = pgTable('utilisateurs', {
  id: serial('id').primaryKey(),
  directionId: integer('direction_id').references(() => directions.id),
  /** Rattachement ministère sans direction (ex. directeur_ministere) */
  ministereId: integer('ministere_id').references(() => ministeres.id),
  email: varchar('email', { length: 255 }).unique().notNull(),
  nom: varchar('nom', { length: 100 }),
  prenom: varchar('prenom', { length: 100 }),
  role: varchar('role', { length: 50 }), // responsable, agent_courrier, auditeur, super_admin, directeur_ministere, gouvernement, responsable_direction
  permissions: jsonb('permissions'), // RBAC fin
  motDePasse: varchar('mot_de_passe', { length: 255 }).notNull(), // INDISPENSABLE pour l'authentification
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Courriers
export const courriers = pgTable('courriers', {
  id: serial('id').primaryKey(),
  reference: varchar('reference', { length: 100 }).unique().notNull(), // ex: MINDEF-2026-000123
  objet: text('objet').notNull(),
  corps: text('corps'),
  typeCourrier: varchar('type_courrier', { length: 50 }), // 'interne', 'externe'
  statut: varchar('statut', { length: 50 }).default('brouillon').notNull(), // brouillon, envoye, recu, en_traitement, archive
  emetteurId: integer('emetteur_id').references(() => utilisateurs.id),
  directionEmetteurId: integer('direction_emetteur_id').references(() => directions.id),
  directionCourrierEmetteurId: integer('direction_courrier_emetteur_id').references(() => directions.id), // point de passage obligatoire
  destinataireDirectionId: integer('destinataire_direction_id').references(() => directions.id),
  ministereDestinataireId: integer('ministere_destinataire_id').references(() => ministeres.id),
  dateEnvoi: timestamp('date_envoi'),
  dateReception: timestamp('date_reception'),
  metadata: jsonb('metadata'), // données extraites par IA
  iaSuggestions: jsonb('ia_suggestions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Pièces jointes
export const piecesJointes = pgTable('pieces_jointes', {
  id: serial('id').primaryKey(),
  courrierId: integer('courrier_id').references(() => courriers.id),
  nomFichier: varchar('nom_fichier', { length: 255 }),
  cheminMinio: varchar('chemin_minio', { length: 512 }),
  typeMime: varchar('type_mime', { length: 100 }),
  tailleBytes: bigint('taille_bytes', { mode: 'number' }),
  hashSha256: varchar('hash_sha256', { length: 64 }), // intégrité
  metadataIa: jsonb('metadata_ia'), // extraction OCR
});

// 6. Flux / Historique
export const fluxEtapes = pgTable('flux_etapes', {
  id: serial('id').primaryKey(),
  courrierId: integer('courrier_id').references(() => courriers.id),
  directionId: integer('direction_id').references(() => directions.id),
  action: varchar('action', { length: 50 }), // 'envoi', 'reception', 'transmission', 'validation'
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id),
  commentaire: text('commentaire'),
  dateAction: timestamp('date_action').defaultNow().notNull(),
});

// 7. Archivage & Audit
export const archives = pgTable('archives', {
  id: serial('id').primaryKey(),
  courrierId: integer('courrier_id').references(() => courriers.id),
  dateArchivage: timestamp('date_archivage'),
  dureeConservation: integer('duree_conservation'), // en années
  emplacement: varchar('emplacement', { length: 255 }),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  utilisateurId: integer('utilisateur_id'),
  action: text('action'),
  entiteType: varchar('entite_type', { length: 50 }), // 'courrier', 'utilisateur', ...
  entiteId: integer('entite_id'),
  details: jsonb('details'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Rapports d'audit générés (M4) */
export const auditReports = pgTable('audit_reports', {
  id: serial('id').primaryKey(),
  titre: varchar('titre', { length: 255 }).notNull(),
  periodeDebut: timestamp('periode_debut').notNull(),
  periodeFin: timestamp('periode_fin').notNull(),
  genereParId: integer('genere_par_id').references(() => utilisateurs.id),
  resume: jsonb('resume'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Résolutions d'anomalies détectées (clé = type:courrierId) */
export const anomalyResolutions = pgTable('anomaly_resolutions', {
  id: serial('id').primaryKey(),
  anomalyKey: varchar('anomaly_key', { length: 100 }).notNull().unique(),
  resolvedById: integer('resolved_by_id').references(() => utilisateurs.id),
  note: text('note'),
  resolvedAt: timestamp('resolved_at').defaultNow().notNull(),
});

// 8. Messages (messagerie par courrier)
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  courrierId: integer('courrier_id').references(() => courriers.id).notNull(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id).notNull(),
  contenu: text('contenu').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8b. Pièces jointes aux messages
export const messagePiecesJointes = pgTable('message_pieces_jointes', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => messages.id).notNull(),
  nomFichier: varchar('nom_fichier', { length: 255 }).notNull(),
  cheminFichier: varchar('chemin_fichier', { length: 512 }).notNull(),
  typeMime: varchar('type_mime', { length: 100 }),
  tailleBytes: bigint('taille_bytes', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id),
  type: varchar('type', { length: 50 }).notNull(),
  titre: varchar('titre', { length: 255 }).notNull(),
  message: text('message'),
  courrierId: integer('courrier_id').references(() => courriers.id),
  publicationId: integer('publication_id'),
  lu: boolean('lu').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Communications Gouvernement (MG)
export const publicationsGouvernement = pgTable('publications_gouvernement', {
  id: serial('id').primaryKey(),
  titre: varchar('titre', { length: 255 }).notNull(),
  corps: text('corps'),
  typePublication: varchar('type_publication', { length: 50 }).default('communique').notNull(), // communique | information | ordre | alerte
  priorite: varchar('priorite', { length: 30 }).default('normale').notNull(), // normale | haute | urgente
  portee: varchar('portee', { length: 30 }).notNull(), // public | ministere
  ministereId: integer('ministere_id').references(() => ministeres.id),
  statut: varchar('statut', { length: 30 }).default('brouillon').notNull(), // brouillon | publie | archive
  auteurId: integer('auteur_id').references(() => utilisateurs.id).notNull(),
  datePublication: timestamp('date_publication'),
  dateArchivage: timestamp('date_archivage'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const publicationPiecesJointes = pgTable('publication_pieces_jointes', {
  id: serial('id').primaryKey(),
  publicationId: integer('publication_id')
    .references(() => publicationsGouvernement.id)
    .notNull(),
  nomFichier: varchar('nom_fichier', { length: 255 }).notNull(),
  cheminFichier: varchar('chemin_fichier', { length: 512 }).notNull(),
  typeMime: varchar('type_mime', { length: 100 }),
  tailleBytes: bigint('taille_bytes', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const publicationAccuses = pgTable('publication_accuses', {
  id: serial('id').primaryKey(),
  publicationId: integer('publication_id')
    .references(() => publicationsGouvernement.id)
    .notNull(),
  ministereId: integer('ministere_id').references(() => ministeres.id).notNull(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id).notNull(),
  commentaire: text('commentaire'),
  dateAr: timestamp('date_ar').defaultNow().notNull(),
});

export const publicationMessages = pgTable('publication_messages', {
  id: serial('id').primaryKey(),
  publicationId: integer('publication_id')
    .references(() => publicationsGouvernement.id)
    .notNull(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id).notNull(),
  contenu: text('contenu').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const publicationLectures = pgTable('publication_lectures', {
  id: serial('id').primaryKey(),
  publicationId: integer('publication_id')
    .references(() => publicationsGouvernement.id)
    .notNull(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateurs.id).notNull(),
  luAt: timestamp('lu_at').defaultNow().notNull(),
});

// ==========================================
// RELATIONS DRIZZLE ORM
// ==========================================

export const ministeresRelations = relations(ministeres, ({ many }) => ({
  directions: many(directions),
  courriersDestinataires: many(courriers),
}));

export const directionsRelations = relations(directions, ({ one, many }) => ({
  ministere: one(ministeres, {
    fields: [directions.ministereId],
    references: [ministeres.id],
  }),
  utilisateurs: many(utilisateurs),
  courriersEmetteurs: many(courriers, {
    relationName: 'directionEmetteur',
  }),
  courriersCourrierEmetteurs: many(courriers, {
    relationName: 'directionCourrierEmetteur',
  }),
  courriersDestinataires: many(courriers, {
    relationName: 'destinataireDirection',
  }),
  fluxEtapes: many(fluxEtapes),
}));

export const utilisateursRelations = relations(utilisateurs, ({ one, many }) => ({
  direction: one(directions, {
    fields: [utilisateurs.directionId],
    references: [directions.id],
  }),
  ministere: one(ministeres, {
    fields: [utilisateurs.ministereId],
    references: [ministeres.id],
  }),
  courriersEmetteurs: many(courriers),
  fluxEtapes: many(fluxEtapes),
  messages: many(messages),
}));

export const courriersRelations = relations(courriers, ({ one, many }) => ({
  emetteur: one(utilisateurs, {
    fields: [courriers.emetteurId],
    references: [utilisateurs.id],
  }),
  directionEmetteur: one(directions, {
    fields: [courriers.directionEmetteurId],
    references: [directions.id],
    relationName: 'directionEmetteur',
  }),
  directionCourrierEmetteur: one(directions, {
    fields: [courriers.directionCourrierEmetteurId],
    references: [directions.id],
    relationName: 'directionCourrierEmetteur',
  }),
  destinataireDirection: one(directions, {
    fields: [courriers.destinataireDirectionId],
    references: [directions.id],
    relationName: 'destinataireDirection',
  }),
  ministereDestinataire: one(ministeres, {
    fields: [courriers.ministereDestinataireId],
    references: [ministeres.id],
  }),
  piecesJointes: many(piecesJointes),
  fluxEtapes: many(fluxEtapes),
  archives: many(archives),
  messages: many(messages),
}));

export const piecesJointesRelations = relations(piecesJointes, ({ one }) => ({
  courrier: one(courriers, {
    fields: [piecesJointes.courrierId],
    references: [courriers.id],
  }),
}));

export const fluxEtapesRelations = relations(fluxEtapes, ({ one }) => ({
  courrier: one(courriers, {
    fields: [fluxEtapes.courrierId],
    references: [courriers.id],
  }),
  direction: one(directions, {
    fields: [fluxEtapes.directionId],
    references: [directions.id],
  }),
  utilisateur: one(utilisateurs, {
    fields: [fluxEtapes.utilisateurId],
    references: [utilisateurs.id],
  }),
}));

export const archivesRelations = relations(archives, ({ one }) => ({
  courrier: one(courriers, {
    fields: [archives.courrierId],
    references: [courriers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  utilisateur: one(utilisateurs, {
    fields: [notifications.utilisateurId],
    references: [utilisateurs.id],
  }),
  courrier: one(courriers, {
    fields: [notifications.courrierId],
    references: [courriers.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  courrier: one(courriers, {
    fields: [messages.courrierId],
    references: [courriers.id],
  }),
  utilisateur: one(utilisateurs, {
    fields: [messages.utilisateurId],
    references: [utilisateurs.id],
  }),
  piecesJointes: many(messagePiecesJointes),
}));

export const messagePiecesJointesRelations = relations(messagePiecesJointes, ({ one }) => ({
  message: one(messages, {
    fields: [messagePiecesJointes.messageId],
    references: [messages.id],
  }),
}));

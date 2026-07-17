CREATE TABLE "archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"courrier_id" integer,
	"date_archivage" timestamp,
	"duree_conservation" integer,
	"emplacement" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"utilisateur_id" integer,
	"action" text,
	"entite_type" varchar(50),
	"entite_id" integer,
	"details" jsonb,
	"ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(100) NOT NULL,
	"objet" text NOT NULL,
	"corps" text,
	"type_courrier" varchar(50),
	"statut" varchar(50) DEFAULT 'brouillon' NOT NULL,
	"emetteur_id" integer,
	"direction_emetteur_id" integer,
	"direction_courrier_emetteur_id" integer,
	"destinataire_direction_id" integer,
	"ministere_destinataire_id" integer,
	"date_envoi" timestamp,
	"date_reception" timestamp,
	"metadata" jsonb,
	"ia_suggestions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courriers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "directions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ministere_id" integer,
	"nom" varchar(255) NOT NULL,
	"type" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "flux_etapes" (
	"id" serial PRIMARY KEY NOT NULL,
	"courrier_id" integer,
	"direction_id" integer,
	"action" varchar(50),
	"utilisateur_id" integer,
	"commentaire" text,
	"date_action" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministeres" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ministeres_nom_unique" UNIQUE("nom"),
	CONSTRAINT "ministeres_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pieces_jointes" (
	"id" serial PRIMARY KEY NOT NULL,
	"courrier_id" integer,
	"nom_fichier" varchar(255),
	"chemin_minio" varchar(512),
	"type_mime" varchar(100),
	"taille_bytes" bigint,
	"hash_sha256" varchar(64),
	"metadata_ia" jsonb
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"direction_id" integer,
	"email" varchar(255) NOT NULL,
	"nom" varchar(100),
	"prenom" varchar(100),
	"role" varchar(50),
	"permissions" jsonb,
	"mot_de_passe" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "archives" ADD CONSTRAINT "archives_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_emetteur_id_utilisateurs_id_fk" FOREIGN KEY ("emetteur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_direction_emetteur_id_directions_id_fk" FOREIGN KEY ("direction_emetteur_id") REFERENCES "public"."directions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_direction_courrier_emetteur_id_directions_id_fk" FOREIGN KEY ("direction_courrier_emetteur_id") REFERENCES "public"."directions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_destinataire_direction_id_directions_id_fk" FOREIGN KEY ("destinataire_direction_id") REFERENCES "public"."directions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_ministere_destinataire_id_ministeres_id_fk" FOREIGN KEY ("ministere_destinataire_id") REFERENCES "public"."ministeres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directions" ADD CONSTRAINT "directions_ministere_id_ministeres_id_fk" FOREIGN KEY ("ministere_id") REFERENCES "public"."ministeres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flux_etapes" ADD CONSTRAINT "flux_etapes_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flux_etapes" ADD CONSTRAINT "flux_etapes_direction_id_directions_id_fk" FOREIGN KEY ("direction_id") REFERENCES "public"."directions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flux_etapes" ADD CONSTRAINT "flux_etapes_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_direction_id_directions_id_fk" FOREIGN KEY ("direction_id") REFERENCES "public"."directions"("id") ON DELETE no action ON UPDATE no action;
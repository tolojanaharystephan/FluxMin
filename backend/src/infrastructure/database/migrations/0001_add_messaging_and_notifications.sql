CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"courrier_id" integer NOT NULL,
	"utilisateur_id" integer NOT NULL,
	"contenu" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_pieces_jointes" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"nom_fichier" varchar(255) NOT NULL,
	"chemin_fichier" varchar(512) NOT NULL,
	"type_mime" varchar(100),
	"taille_bytes" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"utilisateur_id" integer,
	"type" varchar(50) NOT NULL,
	"titre" varchar(255) NOT NULL,
	"message" text,
	"courrier_id" integer,
	"lu" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_pieces_jointes" ADD CONSTRAINT "message_pieces_jointes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;

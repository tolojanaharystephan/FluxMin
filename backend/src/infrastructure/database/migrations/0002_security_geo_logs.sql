CREATE TABLE IF NOT EXISTS "security_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"utilisateur_id" integer,
	"ministere_id" integer,
	"succes" boolean NOT NULL,
	"motif" varchar(80),
	"risque" varchar(20) NOT NULL,
	"ip" varchar(45) NOT NULL,
	"user_agent" text,
	"pays" varchar(80),
	"pays_code" varchar(8),
	"ville" varchar(120),
	"region" varchar(120),
	"isp" varchar(255),
	"latitude" varchar(20),
	"longitude" varchar(20),
	"hors_madagascar" boolean DEFAULT false NOT NULL,
	"hors_zone_ministere" boolean DEFAULT false NOT NULL,
	"ip_autre_ministere" boolean DEFAULT false NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ip_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(45) NOT NULL,
	"raison" varchar(255),
	"until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_ministere_id_ministeres_id_fk" FOREIGN KEY ("ministere_id") REFERENCES "public"."ministeres"("id") ON DELETE no action ON UPDATE no action;

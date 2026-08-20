ALTER TABLE "security_logs" ADD COLUMN IF NOT EXISTS "session_id" varchar(36);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "session_id" varchar(36);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"utilisateur_id" integer,
	"security_log_id" integer,
	"ip" varchar(45),
	"user_agent" text,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_security_log_id_security_logs_id_fk" FOREIGN KEY ("security_log_id") REFERENCES "public"."security_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_logs_session_id_idx" ON "security_logs" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_session_id_idx" ON "audit_logs" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_utilisateur_id_idx" ON "sessions" ("utilisateur_id");

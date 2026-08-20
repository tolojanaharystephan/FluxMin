/**
 * Répare l'historique Drizzle quand les tables existent déjà
 * mais que drizzle.__drizzle_migrations est vide / désync.
 * Applique aussi 0003_session_id de façon idempotente.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Client } = require('pg');

const JOURNAL = [
  { tag: '0000_worthless_zemo', when: 1700000000000 },
  { tag: '0001_add_messaging_and_notifications', when: 1752760000000 },
  { tag: '0002_security_geo_logs', when: 1755510000000 },
  { tag: '0003_session_id', when: 1755680000000 },
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const migrationsDir = path.resolve(__dirname, '../src/infrastructure/database/migrations');

  // 1) Appliquer 0003 (idempotent)
  const sql0003 = fs.readFileSync(path.join(migrationsDir, '0003_session_id.sql'), 'utf8');
  for (const stmt of sql0003.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)) {
    await client.query(stmt);
  }
  console.log('Applied 0003_session_id.sql');

  // 2) Schéma de suivi Drizzle
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // 3) Remplacer l'historique pour coller au journal corrigé
  await client.query('DELETE FROM drizzle.__drizzle_migrations');

  for (const entry of JOURNAL) {
    const content = fs.readFileSync(path.join(migrationsDir, `${entry.tag}.sql`), 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
    console.log(`marked: ${entry.tag}`);
  }

  const check = await client.query(`
    SELECT to_regclass('public.sessions') AS sessions,
           EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_name = 'security_logs' AND column_name = 'session_id'
           ) AS has_session_id
  `);
  console.log('verify:', check.rows[0]);

  await client.end();
  console.log('OK — tu peux relancer: npm run db:migrate');
}

main().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});

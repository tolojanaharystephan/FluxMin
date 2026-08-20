require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT
      to_regclass('public.sessions') AS sessions,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'security_logs' AND column_name = 'session_id'
      ) AS has_session_id,
      (SELECT count(*)::int FROM drizzle.__drizzle_migrations) AS migrations_count
  `);
  console.log(r.rows[0]);
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fluxmin',
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_reports (
      id SERIAL PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      periode_debut TIMESTAMP NOT NULL,
      periode_fin TIMESTAMP NOT NULL,
      genere_par_id INTEGER REFERENCES utilisateurs(id),
      resume JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS anomaly_resolutions (
      id SERIAL PRIMARY KEY,
      anomaly_key VARCHAR(100) NOT NULL UNIQUE,
      resolved_by_id INTEGER REFERENCES utilisateurs(id),
      note TEXT,
      resolved_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  console.log('audit_reports + anomaly_resolutions OK');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

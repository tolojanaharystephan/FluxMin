import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const runMigration = async () => {
  console.log('Running migrations...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fluxmin',
  });
  const db = drizzle(pool);
  
  await migrate(db, { migrationsFolder: path.resolve(__dirname, 'migrations') });
  
  console.log('Migrations completed successfully!');
  await pool.end();
};

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

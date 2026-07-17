import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables de la racine
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fluxmin',
      });
      return drizzle(pool, { schema });
    },
  },
];
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Token pour l'injection
export const DRIZZLE = 'DRIZZLE';

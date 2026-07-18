import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from './infrastructure/database/database.provider';
import type { DrizzleDB } from './infrastructure/database/database.provider';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
};

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
  ) {}

  async check(): Promise<HealthStatus> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.db.execute(sql`SELECT 1`);
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'fluxmin-backend',
      timestamp: new Date().toISOString(),
      database,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}

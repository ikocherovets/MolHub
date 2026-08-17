import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export interface AuditEntry {
  apiClient: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
}

@Injectable()
export class AuditService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async record(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (api_client, method, path, status_code, ip) VALUES ($1, $2, $3, $4, $5)`,
      [entry.apiClient, entry.method, entry.path, entry.statusCode, entry.ip ?? null],
    );
  }

  async list(limit: number) {
    const { rows } = await this.pool.query(
      `SELECT id, api_client, method, path, status_code, ip, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows;
  }

  onModuleDestroy() {
    void this.pool.end();
  }
}

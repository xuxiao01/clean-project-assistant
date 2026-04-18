import { Pool } from 'pg';
import { env } from '../config/env.js';

let pool: Pool | undefined;

/**
 * 复用的连接池；首次调用时从 `env.databaseUrl` 创建。
 */
export function getPool(): Pool {
  if (pool === undefined) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }
  return pool;
}

export interface DbConnectivityInfo {
  database: string;
  user: string;
  timeIso: string;
}

/**
 * 验证数据库连通性，并返回当前库名、用户与时间。
 */
export async function testDbConnection(): Promise<DbConnectivityInfo> {
  const client = getPool();
  const result = await client.query<{
    current_database: string;
    current_user: string;
    now: Date;
  }>(
    'SELECT current_database() AS current_database, current_user AS current_user, now() AS now',
  );

  const row = result.rows[0];
  if (row === undefined) {
    throw new Error('数据库连通性查询未返回任何行');
  }

  const now = row.now;
  const timeIso = now instanceof Date ? now.toISOString() : String(now);

  return {
    database: row.current_database,
    user: row.current_user,
    timeIso,
  };
}

import { config } from 'dotenv';
import { Pool } from 'pg';

config();

let pool: Pool | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url === undefined || url.length === 0) {
    throw new Error('缺少环境变量 DATABASE_URL');
  }
  return url;
}

/**
 * 复用的连接池；首次调用时从 `process.env.DATABASE_URL` 创建。
 */
export function getPool(): Pool {
  if (pool === undefined) {
    pool = new Pool({ connectionString: requireDatabaseUrl() });
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

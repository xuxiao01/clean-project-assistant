import { config } from 'dotenv';

config();

import { testDbConnection } from '../lib/db.js';

async function main(): Promise<void> {
  try {
    const info = await testDbConnection();
    console.log('[test-db] 连接成功');
    console.log('[test-db] 当前数据库:', info.database);
    console.log('[test-db] 当前用户:', info.user);
    console.log('[test-db] 数据库时间(UTC):', info.timeIso);
    process.exit(0);
  } catch (e) {
    console.error('[test-db] 连接失败:', e);
    process.exit(1);
  }
}

void main();

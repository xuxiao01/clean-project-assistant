import type { Pool, PoolClient } from 'pg';
import type { DocumentRow } from '../types/db.js';

type Db = Pool | PoolClient;

export async function findDocumentBySourcePath(
  db: Db,
  sourcePath: string,
): Promise<DocumentRow | null> {
  const result = await db.query<DocumentRow>(
    `SELECT id, source_path, content_hash, title, created_at, updated_at
     FROM documents
     WHERE source_path = $1`,
    [sourcePath],
  );
  return result.rows[0] ?? null;
}

export interface UpsertDocumentInput {
  source_path: string;
  content_hash: string;
  title: string | null;
}

/**
 * 按 `source_path` 插入或更新文档，返回 `id`（UUID 字符串）。
 */
export async function upsertDocument(
  db: Db,
  input: UpsertDocumentInput,
): Promise<{ id: string }> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO documents (source_path, content_hash, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (source_path) DO UPDATE SET
       content_hash = EXCLUDED.content_hash,
       title = EXCLUDED.title
     RETURNING id`,
    [input.source_path, input.content_hash, input.title],
  );

  const row = result.rows[0];
  if (row === undefined) {
    throw new Error('upsert documents 未返回 id');
  }
  return { id: row.id };
}

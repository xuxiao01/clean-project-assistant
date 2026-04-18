import type { Pool, PoolClient } from 'pg';
import { formatVectorLiteral } from '../lib/pgVector.js';
import type { KnowledgeChunkInsertRow } from '../types/db.js';

type Db = Pool | PoolClient;

export async function deleteChunksByDocumentId(
  db: Db,
  documentId: string,
): Promise<number> {
  const result = await db.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [
    documentId,
  ]);
  return result.rowCount ?? 0;
}

/**
 * 批量插入 chunk；单条 SQL 多行 VALUES，参数化防注入。
 */
export async function insertChunksForDocument(
  db: Db,
  documentId: string,
  rows: KnowledgeChunkInsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const valuesSql: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const row of rows) {
    const vecLiteral = formatVectorLiteral(row.embedding);
    valuesSql.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}::vector, $${i++}, $${i++}::jsonb)`,
    );
    params.push(
      documentId,
      row.chunk_index,
      row.content,
      row.chunk_content_hash,
      vecLiteral,
      row.embedding_model,
      row.metadata,
    );
  }

  const sql = `INSERT INTO knowledge_chunks (
    document_id,
    chunk_index,
    content,
    chunk_content_hash,
    embedding,
    embedding_model,
    metadata
  ) VALUES ${valuesSql.join(', ')}`;

  await db.query(sql, params);
}

export interface SearchedChunkRow {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  /** 余弦相似度，值越大越相关 */
  score: number;
}

/**
 * 使用 pgvector 余弦距离检索 Top-K（`<=>`），并转换成相似度分数（`1 - distance`）。
 */
export async function searchChunksByEmbedding(
  db: Db,
  queryEmbedding: number[],
  topK: number,
  embeddingModel: string,
): Promise<SearchedChunkRow[]> {
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error('topK 必须是正整数');
  }

  const vectorLiteral = formatVectorLiteral(queryEmbedding);
  const result = await db.query<{
    id: number;
    content: string;
    metadata: Record<string, unknown> | null;
    distance: number;
  }>(
    `SELECT
       id,
       content,
       metadata,
       (embedding <=> $1::vector) AS distance
     FROM knowledge_chunks
     WHERE embedding_model = $2
     ORDER BY embedding <=> $1::vector ASC
     LIMIT $3`,
    [vectorLiteral, embeddingModel, topK],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    content: row.content,
    metadata: row.metadata ?? {},
    score: 1 - row.distance,
  }));
}

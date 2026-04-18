import { getPool } from '../lib/db.js';
import {
  deleteChunksByDocumentId,
  insertChunksForDocument,
} from '../repositories/knowledgeChunksRepository.js';
import { upsertDocument } from '../repositories/documentsRepository.js';
import type { KnowledgeChunkInsertRow } from '../types/db.js';

export interface ReplaceKnowledgeForDocumentInput {
  source_path: string;
  content_hash: string;
  title: string | null;
  chunks: KnowledgeChunkInsertRow[];
}

/**
 * 事务内：upsert 文档 → 删除该文档旧 chunks → 批量插入新 chunks。
 * 供后续「读文件 → 切分 → embedding」灌库流程调用。
 */
export async function replaceKnowledgeForDocument(
  input: ReplaceKnowledgeForDocumentInput,
): Promise<{ documentId: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id: documentId } = await upsertDocument(client, {
      source_path: input.source_path,
      content_hash: input.content_hash,
      title: input.title,
    });

    await deleteChunksByDocumentId(client, documentId);
    await insertChunksForDocument(client, documentId, input.chunks);

    await client.query('COMMIT');
    return { documentId };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('ROLLBACK 失败', rollbackErr);
    }
    throw e;
  } finally {
    client.release();
  }
}

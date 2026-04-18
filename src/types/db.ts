/** 与 `documents` 表查询结果对应 */
export interface DocumentRow {
  id: string;
  source_path: string;
  content_hash: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

/** 批量写入 `knowledge_chunks` 时的一行 */
export interface KnowledgeChunkInsertRow {
  chunk_index: number;
  content: string;
  chunk_content_hash: string;
  embedding: number[];
  embedding_model: string;
  metadata: Record<string, unknown>;
}

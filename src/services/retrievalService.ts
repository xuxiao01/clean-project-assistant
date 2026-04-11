import { embedText } from '../embeddings/embedder.js';
import { getVectorStore } from '../stores/vectorStore.js';

/** RAG 默认取回片段数（路由与后续配置可共用） */
export const RAG_DEFAULT_TOP_K = 5;

/** 检索命中的一条 chunk（不含 embedding，便于日志与下游 prompt 组装） */
export interface RetrievalChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  /** 与查询向量的余弦相似度，越大越相关 */
  score: number;
}

/**
 * 对用户问题做 embedding，在内存向量库中按余弦相似度取 Top-K。
 *
 * @example 调试（需已启动灌库，且配置了 ZHIPU_API_KEY）
 * ```ts
 * import { retrieveTopKChunks } from './services/retrievalService.js';
 * const hits = await retrieveTopKChunks('清洁工如何接单', 3);
 * console.log(hits.map((h) => ({ id: h.id, score: h.score })));
 * ```
 */
export async function retrieveTopKChunks(
  question: string,
  topK: number,
): Promise<RetrievalChunk[]> {
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error('topK 必须是正整数');
  }

  const q = question.trim();
  if (q.length === 0) {
    throw new Error('question 不能为空');
  }

  const queryEmbedding = await embedText(q);
  const hits = getVectorStore().search(queryEmbedding, topK);

  return hits.map((h) => ({
    id: h.record.id,
    content: h.record.content,
    metadata: h.record.metadata,
    score: h.score,
  }));
}

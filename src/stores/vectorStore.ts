import type { VectorRecord, VectorSearchHit } from '../types/index.js';

function assertPositiveIntTopK(topK: number): void {
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error('topK 必须是正整数');
  }
}

/**
 * 内存向量库骨架：`addDocuments` 追加记录；
 * `search` 当前为占位实现（忽略 queryEmbedding，按插入顺序返回前 topK 条），
 * 后续模块再换成真实相似度检索。
 */
export class MemoryVectorStore {
  private readonly records: VectorRecord[] = [];

  addDocuments(docs: VectorRecord[]): void {
    this.records.push(...docs);
  }

  search(_queryEmbedding: number[], topK: number): VectorSearchHit[] {
    assertPositiveIntTopK(topK);
    const slice = this.records.slice(0, topK);
    return slice.map((record) => ({ record, score: 1 }));
  }
}

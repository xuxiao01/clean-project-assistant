import type { VectorRecord, VectorSearchHit } from '../types/index.js';

function assertPositiveIntTopK(topK: number): void {
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error('topK 必须是正整数');
  }
}

/** 余弦相似度，范围约 [-1, 1]；任一向量为零向量时返回 0 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `余弦相似度计算失败：维度不一致（查询 ${a.length}，文档 ${b.length}）`,
    );
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) {
    return 0;
  }
  return dot / denom;
}

/**
 * 内存向量库：`addDocuments` 追加记录；`search` 按与查询向量的余弦相似度排序取 Top-K。
 */
export class MemoryVectorStore {
  private readonly records: VectorRecord[] = [];

  /** 清空内存记录（启动时重新灌库前调用，避免重复追加） */
  clear(): void {
    this.records.length = 0;
  }

  addDocuments(docs: VectorRecord[]): void {
    this.records.push(...docs);
  }

  get size(): number {
    return this.records.length;
  }

  search(queryEmbedding: number[], topK: number): VectorSearchHit[] {
    assertPositiveIntTopK(topK);
    if (this.records.length === 0) {
      return [];
    }

    const scored: VectorSearchHit[] = this.records.map((record) => ({
      record,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }));

    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, topK);
  }
}

let sharedStore: MemoryVectorStore | null = null;

/** 进程内单例，供启动灌库与后续检索共用 */
export function getVectorStore(): MemoryVectorStore {
  sharedStore ??= new MemoryVectorStore();
  return sharedStore;
}

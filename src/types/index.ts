/** 文本切分后的片段，供后续向量与检索使用 */
export interface TextChunk {
  id: string;
  content: string;
  chunkIndex: number;
}

/** 存入向量库的一条记录（后续由真实 embedding 填充） */
export interface VectorRecord {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

/** 检索单条结果（占位 search 时 score 为固定值，接入真实相似度后再语义化） */
export interface VectorSearchHit {
  record: VectorRecord;
  score: number;
}

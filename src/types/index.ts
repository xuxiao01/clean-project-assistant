/** 文本切分后的片段，供后续向量与检索使用 */
export interface TextChunk {
  id: string;
  content: string;
  chunkIndex: number;
}

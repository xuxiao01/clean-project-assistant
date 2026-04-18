/**
 * 将 number[] 格式化为 pgvector 可识别的文本字面量，例如 `[0.1,0.2]`。
 */
export function formatVectorLiteral(embedding: number[]): string {
  if (embedding.length === 0) {
    throw new Error('embedding 不能为空数组');
  }
  for (let i = 0; i < embedding.length; i += 1) {
    const n = embedding[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new Error(`embedding[${i}] 不是有限数值`);
    }
  }
  return `[${embedding.join(',')}]`;
}

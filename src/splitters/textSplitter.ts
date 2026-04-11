import type { TextChunk } from '../types/index.js';

export interface SplitTextOptions {
  /** 每个片段最大字符数（按 JS UTF-16 码元计） */
  chunkSize: number;
  /** 相邻片段重叠字符数，须小于 chunkSize */
  overlap: number;
}

function assertPositiveInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是正整数`);
  }
}

function assertNonNegativeInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} 必须是非负整数`);
  }
}

/**
 * 按固定窗口切分长文本，相邻窗口可重叠。
 * 不做语义/段落边界识别，优先简单可预期。
 */
export function splitText(text: string, options: SplitTextOptions): TextChunk[] {
  const { chunkSize, overlap } = options;
  assertPositiveInt('chunkSize', chunkSize);
  assertNonNegativeInt('overlap', overlap);
  if (overlap >= chunkSize) {
    throw new Error('overlap 必须小于 chunkSize');
  }

  if (text.length === 0) {
    return [];
  }

  const step = chunkSize - overlap;
  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end);
    chunks.push({
      id: `chunk-${chunkIndex}`,
      content,
      chunkIndex,
    });
    chunkIndex += 1;
    if (end >= text.length) {
      break;
    }
    start += step;
  }

  return chunks;
}

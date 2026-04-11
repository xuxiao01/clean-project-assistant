import { env } from '../config/env.js';

const ZHIPU_EMBEDDINGS_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

function embeddingModelFromEnv(): string {
  const m = process.env.ZHIPU_EMBEDDING_MODEL?.trim();
  return m !== undefined && m.length > 0 ? m : 'embedding-2';
}

export class EmbeddingError extends Error {
  override readonly name = 'EmbeddingError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractEmbeddingVector(data: unknown): number[] {
  if (!isRecord(data)) {
    throw new EmbeddingError('智谱嵌入响应格式异常：根节点不是对象');
  }

  if (isRecord(data.error)) {
    const msg =
      typeof data.error.message === 'string'
        ? data.error.message
        : JSON.stringify(data.error);
    throw new EmbeddingError(`智谱嵌入 API 错误：${msg}`);
  }

  const list = data.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new EmbeddingError('智谱嵌入响应缺少 data 或为空');
  }

  const first = list[0];
  if (!isRecord(first)) {
    throw new EmbeddingError('智谱嵌入 data[0] 格式异常');
  }

  const embedding = first.embedding;
  if (!Array.isArray(embedding)) {
    throw new EmbeddingError('智谱嵌入缺少 embedding 数组');
  }

  const out: number[] = [];
  for (let i = 0; i < embedding.length; i += 1) {
    const n = embedding[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new EmbeddingError(`embedding[${i}] 不是有限数值`);
    }
    out.push(n);
  }

  if (out.length === 0) {
    throw new EmbeddingError('智谱返回的向量为空');
  }

  return out;
}

/**
 * 对单条文本生成 embedding 向量（与 chat 共用智谱 API Key）。
 * chunk 与用户 query 均通过本函数向量化，请勿在其它模块直接请求嵌入接口。
 *
 * @example
 * ```ts
 * import { embedText } from './embeddings/embedder.js';
 * const v = await embedText('清洁工接单流程是什么？');
 * console.log(v.length);
 * ```
 */
export async function embedText(text: string): Promise<number[]> {
  const input = text.trim();
  if (input.length === 0) {
    throw new EmbeddingError('嵌入文本不能为空');
  }

  const model = embeddingModelFromEnv();

  let res: Response;
  try {
    res = await fetch(ZHIPU_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.zhipuApiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new EmbeddingError('调用智谱嵌入 API 网络失败', { cause: e });
  }

  const bodyText = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText) as unknown;
  } catch (e) {
    throw new EmbeddingError(
      `智谱嵌入响应不是合法 JSON（HTTP ${res.status}）：${bodyText.slice(0, 400)}`,
      { cause: e },
    );
  }

  if (!res.ok) {
    const msg =
      isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string'
        ? raw.error.message
        : JSON.stringify(raw).slice(0, 500);
    throw new EmbeddingError(`智谱嵌入 HTTP ${res.status}：${msg}`);
  }

  return extractEmbeddingVector(raw);
}

import { env } from '../config/env.js';
import type { EmbeddingModelInfo, LlmProviderId } from '../types/llm.js';

const ZHIPU_EMBEDDINGS_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_EMBEDDING_DIMENSION = 1024;

/** 与写入 `knowledge_chunks.embedding_model` 的取值保持一致 */
export function getEmbeddingModelId(): string {
  if (env.llmProvider === 'gemini') {
    return env.geminiEmbeddingModel;
  }
  return env.zhipuEmbeddingModel;
}

export function getEmbeddingProviderId(): LlmProviderId {
  return env.llmProvider;
}

export function getEmbeddingModelInfo(): EmbeddingModelInfo {
  return {
    provider: getEmbeddingProviderId(),
    model: getEmbeddingModelId(),
  };
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

function extractGeminiEmbedding(data: unknown): number[] {
  if (!isRecord(data)) {
    throw new EmbeddingError('Gemini 嵌入响应格式异常：根节点不是对象');
  }

  if (isRecord(data.error)) {
    const msg =
      typeof data.error.message === 'string'
        ? data.error.message
        : JSON.stringify(data.error);
    throw new EmbeddingError(`Gemini 嵌入 API 错误：${msg}`);
  }

  if (!isRecord(data.embedding) || !Array.isArray(data.embedding.values)) {
    throw new EmbeddingError('Gemini 嵌入响应缺少 embedding.values');
  }

  const values = (data.embedding as Record<string, unknown>).values;
  if (!Array.isArray(values)) {
    throw new EmbeddingError('Gemini 嵌入响应 embedding.values 不是数组');
  }

  const out: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const n = values[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new EmbeddingError(`Gemini embedding[${i}] 不是有限数值`);
    }
    out.push(n);
  }
  if (out.length === 0) {
    throw new EmbeddingError('Gemini 返回的向量为空');
  }
  return out;
}

function assertEmbeddingDimension(
  vector: number[],
  expected: number,
  provider: string,
  model: string,
): void {
  if (vector.length !== expected) {
    throw new EmbeddingError(
      `${provider} embedding 维度异常：模型 ${model} 返回 ${vector.length}，期望 ${expected}`,
    );
  }
}

/**
 * 对单条文本生成 embedding 向量（按当前 provider 调用对应模型）。
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

  const model = getEmbeddingModelId();
  if (env.llmProvider === 'gemini') {
    const apiKey = env.geminiApiKey;
    if (apiKey === undefined) {
      throw new EmbeddingError('未配置 GEMINI_API_KEY');
    }

    const url = `${GEMINI_BASE_URL}/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: input }],
          },
          // 工程硬约束：Gemini embedding 必须显式对齐 1024 维，禁止默认维度写库。
          outputDimensionality: GEMINI_EMBEDDING_DIMENSION,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      throw new EmbeddingError('调用 Gemini 嵌入 API 网络失败', { cause: e });
    }

    const bodyText = await res.text();
    let raw: unknown;
    try {
      raw = JSON.parse(bodyText) as unknown;
    } catch (e) {
      throw new EmbeddingError(
        `Gemini 嵌入响应不是合法 JSON（HTTP ${res.status}）：${bodyText.slice(0, 400)}`,
        { cause: e },
      );
    }

    if (!res.ok) {
      const msg =
        isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string'
          ? raw.error.message
          : JSON.stringify(raw).slice(0, 500);
      throw new EmbeddingError(`Gemini 嵌入 HTTP ${res.status}：${msg}`);
    }

    const vector = extractGeminiEmbedding(raw);
    assertEmbeddingDimension(
      vector,
      GEMINI_EMBEDDING_DIMENSION,
      'Gemini',
      model,
    );
    return vector;
  }

  const apiKey = env.zhipuApiKey;
  if (apiKey === undefined) {
    throw new EmbeddingError('未配置 ZHIPU_API_KEY');
  }

  let res: Response;
  try {
    res = await fetch(ZHIPU_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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

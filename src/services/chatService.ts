import { env } from '../config/env.js';
import type { ChatModelInfo } from '../types/llm.js';

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class ChatServiceError extends Error {
  override readonly name = 'ChatServiceError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractChoiceText(data: unknown): string {
  if (!isRecord(data)) {
    throw new ChatServiceError('响应格式异常：根节点不是对象');
  }

  if (isRecord(data.error)) {
    const msg =
      typeof data.error.message === 'string'
        ? data.error.message
        : JSON.stringify(data.error);
    throw new ChatServiceError(`智谱 API 错误：${msg}`);
  }

  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ChatServiceError('智谱未返回 choices');
  }

  const first = choices[0];
  if (!isRecord(first)) {
    throw new ChatServiceError('响应格式异常：choices[0] 不是对象');
  }

  const message = first.message;
  if (!isRecord(message) || typeof message.content !== 'string') {
    throw new ChatServiceError('响应格式异常：缺少 message.content');
  }

  const text = message.content.trim();
  if (text.length === 0) {
    throw new ChatServiceError('模型返回的文本为空');
  }

  return text;
}

function extractGeminiText(data: unknown): string {
  if (!isRecord(data)) {
    throw new ChatServiceError('Gemini 响应格式异常：根节点不是对象');
  }

  if (isRecord(data.error)) {
    const msg =
      typeof data.error.message === 'string'
        ? data.error.message
        : JSON.stringify(data.error);
    throw new ChatServiceError(`Gemini API 错误：${msg}`);
  }

  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ChatServiceError('Gemini 未返回 candidates');
  }
  const first = candidates[0];
  if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) {
    throw new ChatServiceError('Gemini 响应格式异常：缺少 candidates[0].content.parts');
  }

  for (const part of first.content.parts) {
    if (isRecord(part) && typeof part.text === 'string' && part.text.trim().length > 0) {
      return part.text.trim();
    }
  }

  throw new ChatServiceError('Gemini 返回内容为空');
}

export function getChatModelInfo(): ChatModelInfo {
  if (env.llmProvider === 'gemini') {
    return { provider: 'gemini', model: env.geminiChatModel };
  }
  return { provider: 'zhipu', model: env.zhipuChatModel };
}

async function generateByZhipu(prompt: string): Promise<string> {
  const apiKey = env.zhipuApiKey;
  if (apiKey === undefined) {
    throw new ChatServiceError('未配置 ZHIPU_API_KEY');
  }

  let res: Response;
  try {
    res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.zhipuChatModel,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new ChatServiceError('调用智谱 API 网络失败', { cause: e });
  }

  const bodyText = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText) as unknown;
  } catch (e) {
    throw new ChatServiceError(
      `智谱响应不是合法 JSON（HTTP ${res.status}）：${bodyText.slice(0, 400)}`,
      { cause: e },
    );
  }

  if (!res.ok) {
    const msg =
      isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string'
        ? raw.error.message
        : JSON.stringify(raw).slice(0, 500);
    throw new ChatServiceError(`智谱 HTTP ${res.status}：${msg}`);
  }

  return extractChoiceText(raw);
}

async function generateByGemini(prompt: string): Promise<string> {
  const apiKey = env.geminiApiKey;
  if (apiKey === undefined) {
    throw new ChatServiceError('未配置 GEMINI_API_KEY');
  }

  const model = env.geminiChatModel;
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new ChatServiceError('调用 Gemini API 网络失败', { cause: e });
  }

  const bodyText = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText) as unknown;
  } catch (e) {
    throw new ChatServiceError(
      `Gemini 响应不是合法 JSON（HTTP ${res.status}）：${bodyText.slice(0, 400)}`,
      { cause: e },
    );
  }

  if (!res.ok) {
    const msg =
      isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string'
        ? raw.error.message
        : JSON.stringify(raw).slice(0, 500);
    throw new ChatServiceError(`Gemini HTTP ${res.status}：${msg}`);
  }

  return extractGeminiText(raw);
}

/**
 * 单次文本生成：根据当前 provider 将完整 prompt 发给对应模型并返回文本。
 */
export async function generateTextFromPrompt(prompt: string): Promise<string> {
  if (env.llmProvider === 'gemini') {
    return generateByGemini(prompt);
  }
  return generateByZhipu(prompt);
}

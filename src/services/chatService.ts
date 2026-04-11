import { env } from '../config/env.js';

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

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

/**
 * 单次文本生成：将完整 prompt 发给智谱 GLM，返回模型文本。
 *
 * @example
 * ```ts
 * import { generateTextFromPrompt } from '../services/chatService.js';
 * const answer = await generateTextFromPrompt(question);
 * res.json({ success: true, data: { answer } });
 * ```
 */
export async function generateTextFromPrompt(prompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.zhipuApiKey}`,
      },
      body: JSON.stringify({
        model: env.zhipuModel,
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

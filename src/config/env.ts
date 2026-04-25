import { config } from 'dotenv';
import type { LlmProviderId } from '../types/llm.js';

config();

function requireNonEmpty(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `缺少必需环境变量 "${name}"。请复制 .env.example 为 .env 并填写。`,
    );
  }
  return value.trim();
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return 3000;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`无效的 PORT "${raw}"，应为 1–65535 的整数。`);
  }
  return port;
}

function optionalNonEmpty(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

function parseProvider(raw: string | undefined): LlmProviderId {
  const normalized = optionalNonEmpty(raw) ?? 'zhipu';
  if (normalized === 'zhipu' || normalized === 'gemini') {
    return normalized;
  }
  throw new Error(`无效的 LLM_PROVIDER "${normalized}"，仅支持 zhipu 或 gemini。`);
}

/** 启动时加载；缺少必填变量时会抛错 */
const llmProvider = parseProvider(process.env.LLM_PROVIDER);

export const env = {
  port: parsePort(process.env.PORT),
  /** PostgreSQL 连接串（必填；知识灌库与向量检索均依赖数据库） */
  databaseUrl: requireNonEmpty('DATABASE_URL'),
  /** 单活 provider：zhipu 或 gemini */
  llmProvider,
  /** 智谱 AI API Key（provider=zhipu 时必填） */
  zhipuApiKey: llmProvider === 'zhipu' ? requireNonEmpty('ZHIPU_API_KEY') : optionalNonEmpty(process.env.ZHIPU_API_KEY),
  /** 智谱聊天模型 */
  zhipuChatModel: optionalNonEmpty(process.env.ZHIPU_CHAT_MODEL)
    ?? optionalNonEmpty(process.env.ZHIPU_MODEL)
    ?? 'glm-4-flash-250414',
  /** 智谱 embedding 模型 */
  zhipuEmbeddingModel: optionalNonEmpty(process.env.ZHIPU_EMBEDDING_MODEL) ?? 'embedding-2',
  /** Gemini API Key（provider=gemini 时必填） */
  geminiApiKey: llmProvider === 'gemini' ? requireNonEmpty('GEMINI_API_KEY') : optionalNonEmpty(process.env.GEMINI_API_KEY),
  /** Gemini 聊天模型 */
  geminiChatModel: optionalNonEmpty(process.env.GEMINI_CHAT_MODEL) ?? 'gemini-1.5-flash',
  /**
   * Gemini embedding 模型（固定走 1024 维对齐策略，禁止默认维度写库）
   * 约束：请求时必须显式传 outputDimensionality=1024。
   */
  geminiEmbeddingModel: optionalNonEmpty(process.env.GEMINI_EMBEDDING_MODEL) ?? 'text-embedding-004',
} as const;

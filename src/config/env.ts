import { config } from 'dotenv';

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

/** 启动时加载；缺少必填变量时会抛错 */
export const env = {
  port: parsePort(process.env.PORT),
  /** PostgreSQL 连接串（必填；知识灌库与向量检索均依赖数据库） */
  databaseUrl: requireNonEmpty('DATABASE_URL'),
  /** 智谱 AI API Key（必填，见 https://open.bigmodel.cn） */
  zhipuApiKey: requireNonEmpty('ZHIPU_API_KEY'),
  /** 智谱模型 id，可通过 ZHIPU_MODEL 覆盖 */
  zhipuModel: optionalNonEmpty(process.env.ZHIPU_MODEL) ?? 'glm-4-flash-250414',
} as const;

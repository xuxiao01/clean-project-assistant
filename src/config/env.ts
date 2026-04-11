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

/** 启动时加载；缺少 GEMINI_API_KEY 或非空校验失败会抛错 */
export const env = {
  port: parsePort(process.env.PORT),
  geminiApiKey: requireNonEmpty('GEMINI_API_KEY'),
} as const;

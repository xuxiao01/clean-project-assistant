import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 相对本文件定位项目根下的默认知识库路径（`tsx` 与编译后的 `dist` 均适用） */
const DEFAULT_PROJECT_KNOWLEDGE_PATH = path.join(
  __dirname,
  '../../docs/project-knowledge.md',
);

/**
 * 读取 `docs/project-knowledge.md` 的完整文本（UTF-8）。
 * 文件不存在或不可读时，由 `readFile` 抛出错误。
 *
 * @example
 * ```ts
 * const markdown = await loadProjectKnowledge();
 * console.log(markdown.length);
 * ```
 */
export async function loadProjectKnowledge(
  filePath: string = DEFAULT_PROJECT_KNOWLEDGE_PATH,
): Promise<string> {
  return readFile(filePath, 'utf8');
}

export function getDefaultProjectKnowledgePath(): string {
  return DEFAULT_PROJECT_KNOWLEDGE_PATH;
}

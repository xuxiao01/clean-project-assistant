import { createHash } from 'node:crypto';

/** UTF-8 文本的 SHA-256 十六进制小写串，与 documents / knowledge_chunks 的 content_hash 约定一致 */
export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

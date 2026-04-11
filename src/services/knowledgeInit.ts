import { loadProjectKnowledge } from '../loaders/documentLoader.js';
import { splitText } from '../splitters/textSplitter.js';

/** Demo 用固定参数，后续可由配置或模块 11+ 替换 */
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/**
 * 启动时加载 `docs/project-knowledge.md` 并切分为 chunks；仅打日志，不入库、不 embedding。
 */
export async function runKnowledgePreprocessOnStartup(): Promise<void> {
  const markdown = await loadProjectKnowledge();
  console.log(
    '[knowledge] 文档读取成功：docs/project-knowledge.md，长度',
    markdown.length,
    '字符',
  );

  const chunks = splitText(markdown, {
    chunkSize: CHUNK_SIZE,
    overlap: CHUNK_OVERLAP,
  });
  console.log('[knowledge] 切分完成，chunk 数量:', chunks.length);

  if (chunks.length > 0) {
    const head = chunks[0].content.slice(0, 120).replace(/\s+/g, ' ');
    console.log(
      '[knowledge] 示例 chunk-0 开头:',
      head + (chunks[0].content.length > 120 ? '…' : ''),
    );
  }
}

import { embedText } from '../embeddings/embedder.js';
import { loadProjectKnowledge } from '../loaders/documentLoader.js';
import { splitText } from '../splitters/textSplitter.js';
import { getVectorStore } from '../stores/vectorStore.js';
import type { VectorRecord } from '../types/index.js';

/** Demo 用固定参数，后续可由配置或后续模块替换 */
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

const KNOWLEDGE_SOURCE = 'docs/project-knowledge.md';

/**
 * 启动时：加载知识库 Markdown → 切分 → 逐条 embedding → 写入内存向量库。
 */
export async function runKnowledgePreprocessOnStartup(): Promise<void> {
  const markdown = await loadProjectKnowledge();
  console.log(
    '[knowledge] 文档读取成功：',
    KNOWLEDGE_SOURCE,
    '，长度',
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

  const store = getVectorStore();
  store.clear();

  if (chunks.length === 0) {
    console.log('[knowledge] 无 chunk，跳过向量化与入库');
    return;
  }

  const records: VectorRecord[] = [];
  let embeddingDim = 0;

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    if (embeddingDim === 0) {
      embeddingDim = embedding.length;
    } else if (embedding.length !== embeddingDim) {
      throw new Error(
        `向量维度不一致：${chunk.id} 为 ${embedding.length}，期望 ${embeddingDim}`,
      );
    }

    records.push({
      id: chunk.id,
      content: chunk.content,
      embedding,
      metadata: {
        chunkIndex: chunk.chunkIndex,
        source: KNOWLEDGE_SOURCE,
      },
    });
  }

  store.addDocuments(records);

  console.log(
    '[knowledge] 已向量化并写入内存向量库，条数:',
    store.size,
    '，向量维度:',
    embeddingDim,
  );
}

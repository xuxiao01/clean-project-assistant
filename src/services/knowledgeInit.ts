import {
  embedText,
  getEmbeddingModelId,
  getEmbeddingProviderId,
} from '../embeddings/embedder.js';
import { sha256Hex } from '../lib/hash.js';
import { loadProjectKnowledge } from '../loaders/documentLoader.js';
import { splitText } from '../splitters/textSplitter.js';
import type { KnowledgeChunkInsertRow } from '../types/db.js';
import { replaceKnowledgeForDocument } from './knowledgeDocumentDbService.js';

/** Demo 用固定参数，后续可由配置或后续模块替换 */
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

const KNOWLEDGE_SOURCE = 'docs/project-knowledge.md';

function extractTitleFromMarkdown(markdown: string): string | null {
  const first = markdown.split(/\r?\n/, 1)[0]?.trim() ?? '';
  if (first.startsWith('#')) {
    const t = first.replace(/^#+\s*/, '').trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

/**
 * 启动时：加载知识库 Markdown → 切分 → 逐条 embedding → 写入 PostgreSQL（documents + knowledge_chunks）。
 * 向量检索仅使用数据库，不再使用进程内内存向量库。
 */
export async function runKnowledgePreprocessOnStartup(): Promise<void> {
  const markdown = await loadProjectKnowledge();
  const documentContentHash = sha256Hex(markdown);
  const title = extractTitleFromMarkdown(markdown);

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

  if (chunks.length === 0) {
    console.log('[knowledge] 无 chunk，跳过向量化');
    await replaceKnowledgeForDocument({
      source_path: KNOWLEDGE_SOURCE,
      content_hash: documentContentHash,
      title,
      chunks: [],
    });
    console.log('[knowledge] 已同步 PostgreSQL（空 chunks）');
    return;
  }

  const pgRows: KnowledgeChunkInsertRow[] = [];
  let embeddingDim = 0;
  const embeddingModel = getEmbeddingModelId();
  const embeddingProvider = getEmbeddingProviderId();

  const metadataBase = {
    source_path: KNOWLEDGE_SOURCE,
    title,
  };

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    if (embeddingDim === 0) {
      embeddingDim = embedding.length;
    } else if (embedding.length !== embeddingDim) {
      throw new Error(
        `向量维度不一致：${chunk.id} 为 ${embedding.length}，期望 ${embeddingDim}`,
      );
    }

    pgRows.push({
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      chunk_content_hash: sha256Hex(chunk.content),
      embedding,
      embedding_model: embeddingModel,
      metadata: { ...metadataBase },
    });
  }

  console.log(
    '[knowledge] 已向量化，provider:',
    embeddingProvider,
    '，model:',
    embeddingModel,
    '，条数:',
    pgRows.length,
    '，向量维度:',
    embeddingDim,
  );

  const { documentId } = await replaceKnowledgeForDocument({
    source_path: KNOWLEDGE_SOURCE,
    content_hash: documentContentHash,
    title,
    chunks: pgRows,
  });
  console.log(
    '[knowledge] 已写入 PostgreSQL，document_id:',
    documentId,
    '，chunks:',
    pgRows.length,
  );
}

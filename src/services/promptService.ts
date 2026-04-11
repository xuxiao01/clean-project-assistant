import type { RetrievalChunk } from './retrievalService.js';

/**
 * 将用户问题与检索到的文档片段组装为发给对话模型的完整 prompt。
 * 约束模型仅依据所给文档作答；文档不足时须明确说明未提及。
 */
export function buildRagPrompt(
  question: string,
  chunks: RetrievalChunk[],
): string {
  const q = question.trim();
  if (q.length === 0) {
    throw new Error('question 不能为空');
  }

  const referenceBlock =
    chunks.length === 0
      ? '（当前未检索到任何文档片段。请严格按下方规则回复，不要编造项目事实。）'
      : chunks
          .map((c, index) => {
            const scoreLabel = Number.isFinite(c.score)
              ? c.score.toFixed(4)
              : String(c.score);
            return [
              `### 片段 ${index + 1}`,
              `- id: ${c.id}`,
              `- 相似度: ${scoreLabel}`,
              '',
              c.content.trim(),
            ].join('\n');
          })
          .join('\n\n---\n\n');

  return [
    '你是「清洁项目」知识库问答助手。下面提供的是从项目知识文档中检索出的参考片段与用户问题。',
    '',
    '【你必须遵守】',
    '1. 只根据「参考文档」中的内容回答；不要凭文档以外的信息捏造项目规则、流程或数据。',
    '2. 若文档中没有足够依据回答该问题，必须明确说明，例如：「根据提供的文档，未提及该内容」或「文档中未找到相关说明」，并可简要概括文档里实际能支持的信息（若有）。',
    '3. 使用简体中文，表述简洁清楚。',
    '',
    '【用户问题】',
    q,
    '',
    '【参考文档】',
    referenceBlock,
  ].join('\n');
}

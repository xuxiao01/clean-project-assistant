import { Router, type Request, type Response } from 'express';
import { EmbeddingError } from '../embeddings/embedder.js';
import { ChatServiceError, generateTextFromPrompt } from '../services/chatService.js';
import { buildRagPrompt } from '../services/promptService.js';
import { RAG_DEFAULT_TOP_K, retrieveTopKChunks } from '../services/retrievalService.js';

export const chatRouter = Router();

chatRouter.post('/chat', async (req: Request, res: Response) => {
  const raw = req.body?.question;
  const question = typeof raw === 'string' ? raw.trim() : '';

  if (!question) {
    res.status(400).json({
      success: false,
      error: { message: 'question 不能为空' },
    });
    return;
  }

  try {
    const chunks = await retrieveTopKChunks(question, RAG_DEFAULT_TOP_K);
    const prompt = buildRagPrompt(question, chunks);
    const answer = await generateTextFromPrompt(prompt);

    res.json({
      success: true,
      data: {
        answer,
        references: chunks.map((c) => ({
          id: c.id,
          content: c.content,
          score: c.score,
          metadata: c.metadata,
        })),
      },
    });
  } catch (e) {
    if (e instanceof ChatServiceError || e instanceof EmbeddingError) {
      res.status(502).json({
        success: false,
        error: { message: e.message },
      });
      return;
    }
    console.error('POST /api/chat unexpected error', e);
    res.status(500).json({
      success: false,
      error: { message: '服务器内部错误' },
    });
  }
});

import { Router, type Request, type Response } from 'express';
import { ChatServiceError, generateTextFromPrompt } from '../services/chatService.js';

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
    const answer = await generateTextFromPrompt(question);
    res.json({
      success: true,
      data: { answer },
    });
  } catch (e) {
    if (e instanceof ChatServiceError) {
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

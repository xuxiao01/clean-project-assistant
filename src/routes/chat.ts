import { Router, type Request, type Response } from 'express';

const FIXED_ANSWER = '这是一个测试回复';

export const chatRouter = Router();

chatRouter.post('/chat', (req: Request, res: Response) => {
  const raw = req.body?.question;
  const question = typeof raw === 'string' ? raw.trim() : '';

  if (!question) {
    res.status(400).json({
      success: false,
      error: { message: 'question 不能为空' },
    });
    return;
  }

  res.json({
    success: true,
    data: { answer: FIXED_ANSWER },
  });
});

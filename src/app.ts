import express, { type Request, type Response } from 'express';

export function createApp(): express.Application {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  return app;
}

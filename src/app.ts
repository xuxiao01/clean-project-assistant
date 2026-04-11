import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { chatRouter } from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  app.use('/api', chatRouter);

  app.use(express.static(path.join(__dirname, '../public')));

  console.log('[app] GET /health, POST /api/chat, static ../public');

  return app;
}

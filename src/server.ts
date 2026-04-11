import { env } from './config/env.js';
import { createApp } from './app.js';
import { runKnowledgePreprocessOnStartup } from './services/knowledgeInit.js';

async function main(): Promise<void> {
  const app = createApp();
  await runKnowledgePreprocessOnStartup();

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

void main().catch((e) => {
  console.error('[server] 启动失败', e);
  process.exit(1);
});

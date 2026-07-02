import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { runMigrations } from '@jaa/storage';
import { registerProfileRoutes } from './routes/profile.js';
import { registerDocumentRoutes } from './routes/documents.js';
import { registerSnippetRoutes } from './routes/snippets.js';
import { registerQuestionRoutes } from './routes/questions.js';
import { registerApplicationRoutes } from './routes/applications.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerLlmRoutes } from './routes/llm.js';
import { registerRunnerRoutes } from './routes/runner.js';
import { registerWorkdayRoutes } from './routes/workday.js';
import { registerBackupRoutes } from './routes/backup.js';
import { registerExtensionRoutes } from './routes/extension.js';
import { mkdirSync } from 'fs';
import { getDataDir } from '@jaa/storage';

const PORT = parseInt(process.env.API_PORT ?? '3001', 10);

async function main() {
  mkdirSync(`${getDataDir()}/uploads`, { recursive: true });
  runMigrations();

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }));

  await registerProfileRoutes(app);
  await registerDocumentRoutes(app);
  await registerSnippetRoutes(app);
  await registerQuestionRoutes(app);
  await registerApplicationRoutes(app);
  await registerSettingsRoutes(app);
  await registerLlmRoutes(app);
  await registerRunnerRoutes(app);
  await registerWorkdayRoutes(app);
  await registerBackupRoutes(app);
  await registerExtensionRoutes(app);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`API running at http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

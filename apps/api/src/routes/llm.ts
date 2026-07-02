import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@jaa/storage';
import { LlmRouter, defaultRouterConfig, generateAnswer, createProvider } from '@jaa/llm';
import { profileToSummary } from '@jaa/profile';
import { retrieveChunks } from '@jaa/rag';
import { categorizeQuestion, matchProfileField } from '@jaa/form-engine';
import { decrypt } from './settings.js';

function getRouter(): LlmRouter {
  const settings = getDb().select().from(schema.settings).all();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const env = {
    ...process.env,
    OPENAI_API_KEY: map.openai_api_key ? decrypt(map.openai_api_key) : process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: map.anthropic_api_key ? decrypt(map.anthropic_api_key) : process.env.ANTHROPIC_API_KEY,
    LLM_MODE: map.llm_mode ?? 'balanced',
    OLLAMA_BASE_URL: map.ollama_base_url ?? process.env.OLLAMA_BASE_URL,
  };

  return new LlmRouter(defaultRouterConfig(env));
}

export async function registerLlmRoutes(app: FastifyInstance) {
  app.post('/llm/test', async (req) => {
    const body = req.body as { prompt?: string };
    const router = getRouter();
    const result = await router.generation.generateText({
      prompt: body.prompt ?? 'Say hello in one sentence.',
    });
    return result;
  });

  app.post('/llm/generate-answer', async (req) => {
    const body = req.body as { question: string; jobDescription?: string };
    const db = getDb();
    const profile = db.select().from(schema.profiles).limit(1).get();
    const category = categorizeQuestion(body.question);

    const snippets = db.select().from(schema.snippets).all()
      .filter((s) => s.category === category || s.body.toLowerCase().includes(body.question.toLowerCase().slice(0, 20)))
      .slice(0, 5);

    const chunks = db.select().from(schema.documentChunks).all().map((c) => ({
      id: c.id,
      documentId: c.documentId ?? undefined,
      section: c.section ?? undefined,
      content: c.content,
      embedding: c.embedding ?? undefined,
    }));

    const retrieved = retrieveChunks(body.question, chunks, 5);

    const router = getRouter();
    const result = await generateAnswer(router, {
      question: body.question,
      profileSummary: profile ? profileToSummary(profile) : '',
      snippets: snippets.map((s) => ({ id: s.id, title: s.title, body: s.body })),
      jobDescription: body.jobDescription,
      retrievedChunks: retrieved.map((r) => r.chunk),
    });

    return result;
  });

  app.post('/llm/classify-field', async (req) => {
    const body = req.body as { label: string };
    const profileField = matchProfileField(body.label);
    return {
      category: categorizeQuestion(body.label),
      profileField,
      confidence: profileField ? 0.9 : 0.5,
    };
  });
}

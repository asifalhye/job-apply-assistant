import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { normalizeQuestion, nowIso, getDb, schema } from '@jaa/storage';
import { categorizeQuestion } from '@jaa/form-engine';

export async function registerExtensionRoutes(app: FastifyInstance) {
  app.get('/extension/health', async () => ({ connected: true }));

  app.post('/extension/observe', async (req) => {
    const body = req.body as {
      url: string;
      fields: { label: string; value?: string; type?: string }[];
    };

    const db = getDb();
    const now = nowIso();

    for (const field of body.fields) {
      const normalized = normalizeQuestion(field.label);
      const existing = db.select().from(schema.questions).all().find((q) => q.normalizedText === normalized);

      if (existing) {
        db.update(schema.questions)
          .set({ timesSeen: (existing.timesSeen ?? 1) + 1, lastSeenAt: now })
          .where(eq(schema.questions.id, existing.id))
          .run();
      } else {
        db.insert(schema.questions).values({
          originalText: field.label,
          normalizedText: normalized,
          category: categorizeQuestion(field.label),
          timesSeen: 1,
          firstSeenAt: now,
          lastSeenAt: now,
        }).run();
      }

      if (field.value && field.value.length > 20) {
        db.insert(schema.snippets).values({
          title: field.label.slice(0, 100),
          body: field.value,
          tags: ['observed'],
          category: categorizeQuestion(field.label),
          sourceType: 'observed',
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }

    return { observed: body.fields.length };
  });

  app.post('/extension/suggest', async (req) => {
    const body = req.body as { label: string; jobDescription?: string };
    const res = await fetch(`http://localhost:${process.env.API_PORT ?? 3001}/llm/generate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: body.label, jobDescription: body.jobDescription }),
    });
    return res.json();
  });
}

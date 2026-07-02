import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso, normalizeQuestion } from '@jaa/storage';
import { clusterQuestions, simpleEmbed } from '@jaa/rag';

export async function registerQuestionRoutes(app: FastifyInstance) {
  app.get('/questions', async (req) => {
    const q = (req.query as { q?: string }).q?.toLowerCase();
    const all = getDb().select().from(schema.questions).all();
    if (!q) return all;
    return all.filter((item) => item.originalText.toLowerCase().includes(q) || item.normalizedText.includes(q));
  });

  app.post('/questions/upsert', async (req) => {
    const body = req.body as { originalText: string; category?: string };
    const normalized = normalizeQuestion(body.originalText);
    const now = nowIso();
    const db = getDb();

    const existing = db.select().from(schema.questions).where(eq(schema.questions.normalizedText, normalized)).get();
    if (existing) {
      db.update(schema.questions)
        .set({ timesSeen: (existing.timesSeen ?? 1) + 1, lastSeenAt: now, category: body.category ?? existing.category })
        .where(eq(schema.questions.id, existing.id))
        .run();
      return db.select().from(schema.questions).where(eq(schema.questions.id, existing.id)).get();
    }

    const result = db.insert(schema.questions).values({
      originalText: body.originalText,
      normalizedText: normalized,
      category: body.category,
      timesSeen: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    }).run();

    return db.select().from(schema.questions).where(eq(schema.questions.id, Number(result.lastInsertRowid))).get();
  });

  app.post('/questions/cluster', async () => {
    const questions = getDb().select().from(schema.questions).all();
    const input = questions.map((q) => ({
      id: q.id,
      normalizedText: q.normalizedText,
      embedding: simpleEmbed(q.normalizedText),
    }));
    const clusters = clusterQuestions(input);
    const db = getDb();
    const result: { clusterId: string; questionIds: number[] }[] = [];

    for (const [clusterId, ids] of clusters) {
      for (const id of ids) {
        db.update(schema.questions).set({ clusterId }).where(eq(schema.questions.id, id)).run();
      }
      result.push({ clusterId, questionIds: ids });
    }
    return result;
  });
}

import type { FastifyInstance } from 'fastify';
import { eq, like, or } from 'drizzle-orm';
import { getDb, schema, nowIso } from '@jaa/storage';

export async function registerSnippetRoutes(app: FastifyInstance) {
  app.get('/snippets', async (req) => {
    const q = (req.query as { q?: string; category?: string }).q;
    const category = (req.query as { category?: string }).category;
    let query = getDb().select().from(schema.snippets);

    const all = query.all();
    return all.filter((s) => {
      if (category && s.category !== category) return false;
      if (q) {
        const lower = q.toLowerCase();
        return s.title.toLowerCase().includes(lower) || s.body.toLowerCase().includes(lower);
      }
      return true;
    });
  });

  app.post('/snippets', async (req) => {
    const body = req.body as {
      title: string;
      body: string;
      tags?: string[];
      category?: string;
    };
    const now = nowIso();
    const result = getDb().insert(schema.snippets).values({
      title: body.title,
      body: body.body,
      tags: body.tags ?? [],
      category: body.category ?? 'misc',
      sourceType: 'user',
      createdAt: now,
      updatedAt: now,
    }).run();
    return getDb().select().from(schema.snippets).where(eq(schema.snippets.id, Number(result.lastInsertRowid))).get();
  });

  app.put('/snippets/:id', async (req) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    const body = req.body as Partial<{ title: string; body: string; tags: string[]; category: string }>;
    getDb().update(schema.snippets).set({ ...body, updatedAt: nowIso() }).where(eq(schema.snippets.id, id)).run();
    return getDb().select().from(schema.snippets).where(eq(schema.snippets.id, id)).get();
  });

  app.delete('/snippets/:id', async (req) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    getDb().delete(schema.snippets).where(eq(schema.snippets.id, id)).run();
    return { success: true };
  });
}

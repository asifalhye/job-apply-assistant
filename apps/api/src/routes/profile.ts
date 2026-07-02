import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso } from '@jaa/storage';

export async function registerProfileRoutes(app: FastifyInstance) {
  app.get('/profile', async () => {
    const db = getDb();
    const profile = db.select().from(schema.profiles).limit(1).get();
    return profile ?? null;
  });

  app.put('/profile', async (req) => {
    const db = getDb();
    const body = req.body as Record<string, unknown>;
    const existing = db.select().from(schema.profiles).limit(1).get();
    const now = nowIso();

    if (existing) {
      db.update(schema.profiles)
        .set({ ...body, updatedAt: now } as never)
        .where(eq(schema.profiles.id, existing.id))
        .run();
      return db.select().from(schema.profiles).where(eq(schema.profiles.id, existing.id)).get();
    }

    db.insert(schema.profiles).values({ ...body, createdAt: now, updatedAt: now } as never).run();
    return db.select().from(schema.profiles).limit(1).get();
  });
}

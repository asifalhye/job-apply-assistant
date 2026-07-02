import type { FastifyInstance } from 'fastify';
import { getDb, schema, getDataDir, nowIso } from '@jaa/storage';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export async function registerBackupRoutes(app: FastifyInstance) {
  app.get('/backup/export', async () => {
    const backupDir = join(getDataDir(), 'backups');
    mkdirSync(backupDir, { recursive: true });
    const filename = `jaa-backup-${Date.now()}.json`;
    const filepath = join(backupDir, filename);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profiles: getDb().select().from(schema.profiles).all(),
      documents: getDb().select().from(schema.documents).all(),
      snippets: getDb().select().from(schema.snippets).all(),
      questions: getDb().select().from(schema.questions).all(),
      applications: getDb().select().from(schema.applications).all(),
    };

    writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    return { filepath, filename, recordCounts: {
      profiles: exportData.profiles.length,
      snippets: exportData.snippets.length,
      questions: exportData.questions.length,
      applications: exportData.applications.length,
    }};
  });

  app.post('/backup/import', async (req, reply) => {
    const body = req.body as { filepath?: string; data?: Record<string, unknown> };
    let importData: Record<string, unknown>;

    if (body.filepath) {
      try {
        importData = JSON.parse(readFileSync(body.filepath, 'utf8'));
      } catch {
        return reply.status(400).send({ error: 'Invalid backup file path' });
      }
    } else if (body.data) {
      importData = body.data;
    } else {
      return reply.status(400).send({ error: 'Provide filepath or data' });
    }

    const db = getDb();
    const now = nowIso();

    for (const profile of (importData.profiles as Record<string, unknown>[]) ?? []) {
      const existing = db.select().from(schema.profiles).limit(1).get();
      if (existing) {
        db.update(schema.profiles).set({ ...profile, updatedAt: now } as never).run();
      } else {
        db.insert(schema.profiles).values({ ...profile, createdAt: now, updatedAt: now } as never).run();
      }
    }

    for (const snippet of (importData.snippets as Record<string, unknown>[]) ?? []) {
      db.insert(schema.snippets).values({ ...snippet, createdAt: now, updatedAt: now } as never).run();
    }

    for (const question of (importData.questions as Record<string, unknown>[]) ?? []) {
      try {
        db.insert(schema.questions).values({ ...question, firstSeenAt: now, lastSeenAt: now } as never).run();
      } catch {
        // skip duplicates
      }
    }

    return {
      imported: {
        profiles: ((importData.profiles as unknown[]) ?? []).length,
        snippets: ((importData.snippets as unknown[]) ?? []).length,
        questions: ((importData.questions as unknown[]) ?? []).length,
      },
    };
  });
}

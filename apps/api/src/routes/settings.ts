import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso } from '@jaa/storage';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? 'change-me-to-a-long-random-string';
  return scryptSync(secret, 'jaa-salt', 32);
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, dataHex] = payload.split(':');
  const decipher = createDecipheriv('aes-256-cbc', getKey(), Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/settings', async () => {
    const rows = getDb().select().from(schema.settings).all();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key.includes('api_key') || row.key.includes('password')) {
        settings[row.key] = row.value ? '***set***' : '';
      } else {
        settings[row.key] = row.value;
      }
    }
    return settings;
  });

  app.put('/settings', async (req) => {
    const body = req.body as Record<string, string>;
    const db = getDb();
    const now = nowIso();

    for (const [key, value] of Object.entries(body)) {
      if (value === '***set***') continue;
      const stored = key.includes('api_key') || key.includes('password') ? encrypt(value) : value;
      const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
      if (existing) {
        db.update(schema.settings).set({ value: stored, updatedAt: now }).where(eq(schema.settings.key, key)).run();
      } else {
        db.insert(schema.settings).values({ key, value: stored, updatedAt: now }).run();
      }
    }
    return { success: true };
  });

  app.get('/settings/raw/:key', async (req) => {
    const key = (req.params as { key: string }).key;
    const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
    if (!row) return null;
    if (key.includes('api_key') || key.includes('password')) {
      return { value: decrypt(row.value) };
    }
    return { value: row.value };
  });
}

import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso } from '@jaa/storage';
import { WorkdayAdapter } from '@jaa/ats-adapters';
import { encrypt } from './settings.js';

export async function registerWorkdayRoutes(app: FastifyInstance) {
  app.get('/workday/accounts', async () => {
    return getDb().select().from(schema.workdayAccounts).all().map((a) => ({
      ...a,
      encryptedCredentials: a.encryptedCredentials ? '***' : null,
    }));
  });

  app.post('/workday/accounts', async (req) => {
    const body = req.body as {
      tenantId: string;
      companyName?: string;
      email: string;
      password?: string;
      accountStatus?: string;
    };
    const now = nowIso();
    const db = getDb();

    const existing = db.select().from(schema.workdayAccounts).where(eq(schema.workdayAccounts.tenantId, body.tenantId)).get();
    const creds = body.password ? encrypt(JSON.stringify({ email: body.email, password: body.password })) : undefined;

    if (existing) {
      db.update(schema.workdayAccounts).set({
        companyName: body.companyName ?? existing.companyName,
        email: body.email,
        accountStatus: body.accountStatus ?? existing.accountStatus,
        encryptedCredentials: creds ?? existing.encryptedCredentials,
        updatedAt: now,
        lastUsedAt: now,
      }).where(eq(schema.workdayAccounts.id, existing.id)).run();
      return db.select().from(schema.workdayAccounts).where(eq(schema.workdayAccounts.id, existing.id)).get();
    }

    const result = db.insert(schema.workdayAccounts).values({
      tenantId: body.tenantId,
      companyName: body.companyName,
      email: body.email,
      accountStatus: body.accountStatus ?? 'created',
      encryptedCredentials: creds,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    }).run();

    return db.select().from(schema.workdayAccounts).where(eq(schema.workdayAccounts.id, Number(result.lastInsertRowid))).get();
  });

  app.post('/workday/detect-tenant', async (req) => {
    const body = req.body as { url: string };
    const tenantId = WorkdayAdapter.extractTenantId(body.url);
    return { tenantId, url: body.url };
  });
}

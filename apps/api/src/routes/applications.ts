import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso, normalizeQuestion } from '@jaa/storage';

export async function registerApplicationRoutes(app: FastifyInstance) {
  app.get('/applications', async () => {
    return getDb().select().from(schema.applications).all();
  });

  app.get('/applications/:id', async (req) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    const app_record = getDb().select().from(schema.applications).where(eq(schema.applications.id, id)).get();
    const fields = getDb().select().from(schema.applicationFields).where(eq(schema.applicationFields.applicationId, id)).all();
    const events = getDb().select().from(schema.fieldFillEvents).where(eq(schema.fieldFillEvents.applicationId, id)).all();
    return { ...app_record, fields, events };
  });

  app.post('/applications', async (req) => {
    const body = req.body as { jobUrl: string; company?: string; roleTitle?: string; atsType?: string };
    const now = nowIso();
    const result = getDb().insert(schema.applications).values({
      jobUrl: body.jobUrl,
      company: body.company,
      roleTitle: body.roleTitle,
      atsType: body.atsType,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }).run();
    return getDb().select().from(schema.applications).where(eq(schema.applications.id, Number(result.lastInsertRowid))).get();
  });

  app.post('/applications/:id/fields', async (req) => {
    const applicationId = parseInt((req.params as { id: string }).id, 10);
    const body = req.body as {
      fieldLabel: string;
      fieldType?: string;
      proposedValue?: string;
      finalValue?: string;
      fillMethod?: string;
      confidence?: number;
      userEdited?: boolean;
      validationPassed?: boolean;
    };
    const now = nowIso();
    const normalized = normalizeQuestion(body.fieldLabel);

    getDb().insert(schema.applicationFields).values({
      applicationId,
      fieldLabel: body.fieldLabel,
      fieldType: body.fieldType,
      normalizedQuestion: normalized,
      proposedValue: body.proposedValue,
      finalValue: body.finalValue ?? body.proposedValue,
      fillMethod: body.fillMethod,
      confidence: body.confidence,
      userEdited: body.userEdited ?? false,
      validationPassed: body.validationPassed,
      createdAt: now,
    }).run();

    getDb().insert(schema.fieldFillEvents).values({
      applicationId,
      fieldLabel: body.fieldLabel,
      fieldType: body.fieldType,
      selectedValue: body.finalValue ?? body.proposedValue,
      fillMethod: body.fillMethod,
      confidence: body.confidence,
      userEdited: body.userEdited ?? false,
      validationPassed: body.validationPassed,
      createdAt: now,
    }).run();

    return { success: true };
  });

  app.post('/applications/:id/learn', async (req) => {
    const applicationId = parseInt((req.params as { id: string }).id, 10);
    const body = req.body as { fieldLabel: string; correctedValue: string; saveAsSnippet?: boolean };
    const now = nowIso();
    const db = getDb();
    const normalized = normalizeQuestion(body.fieldLabel);

    const question = db.select().from(schema.questions).where(eq(schema.questions.normalizedText, normalized)).get();
    let snippetId: number | undefined;

    if (body.saveAsSnippet !== false) {
      const result = db.insert(schema.snippets).values({
        title: body.fieldLabel.slice(0, 100),
        body: body.correctedValue,
        tags: ['learned'],
        category: 'misc',
        sourceType: 'learned',
        createdAt: now,
        updatedAt: now,
      }).run();
      snippetId = Number(result.lastInsertRowid);
    }

    if (question) {
      db.insert(schema.questionAnswers).values({
        questionId: question.id,
        snippetId,
        applicationId,
        answerText: body.correctedValue,
        source: 'user-edit',
        accepted: true,
        createdAt: now,
      }).run();
    }

    return { success: true, snippetId };
  });
}

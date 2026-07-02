import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso, normalizeQuestion } from '@jaa/storage';
import { getProfileFieldValue } from '@jaa/profile';
import {
  detectAtsType,
  GreenhouseAdapter,
  AshbyAdapter,
  WorkdayAdapter,
  LeverAdapter,
  GenericAdapter,
} from '@jaa/ats-adapters';
import type { AtsAdapter } from '@jaa/ats-adapters';
import { matchProfileField, categorizeQuestion, SENSITIVE_CATEGORIES, fuzzyMatchScore } from '@jaa/form-engine';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let currentApplicationId: number | null = null;

function getAdapter(type: string): AtsAdapter {
  switch (type) {
    case 'greenhouse': return new GreenhouseAdapter();
    case 'ashby': return new AshbyAdapter();
    case 'workday': return new WorkdayAdapter();
    case 'lever': return new LeverAdapter();
    default: return new GenericAdapter();
  }
}

async function ensureBrowser() {
  if (!browser) {
    try {
      browser = await chromium.launch({ headless: false });
    } catch (err) {
      const message = String(err);
      if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
        throw new Error(
          'Playwright Chromium is not installed. Stop the app and run: npm run playwright:install — then restart with npm run dev'
        );
      }
      throw err;
    }
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  }
  if (!page && context) {
    page = await context.newPage();
  }
}

export async function registerRunnerRoutes(app: FastifyInstance) {
  app.get('/runner/preflight', async () => {
    try {
      const executable = chromium.executablePath();
      return { ready: true, executable };
    } catch {
      return {
        ready: false,
        fix: 'Run: npm run playwright:install',
      };
    }
  });

  app.post('/runner/start', async (req, reply) => {
    const body = req.body as { jobUrl: string };
    try {
      await ensureBrowser();
    } catch (err) {
      return reply.status(503).send({
        error: 'browser_not_installed',
        message: String(err),
      });
    }
    if (!page) return reply.status(500).send({ error: 'Browser not ready' });

    await page.goto(body.jobUrl, { waitUntil: 'networkidle', timeout: 90000 }).catch(async () => {
      await page!.goto(body.jobUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    });
    const content = await page.content();
    const atsType = detectAtsType(body.jobUrl, content);
    const adapter = getAdapter(atsType);
    const jobInfo = await adapter.extractJobInfo(page);
    const fields = await adapter.extractFields(page);

    const now = nowIso();
    const db = getDb();
    const result = db.insert(schema.applications).values({
      jobUrl: body.jobUrl,
      company: jobInfo.company,
      roleTitle: jobInfo.roleTitle,
      atsType,
      jobDescription: jobInfo.description,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    }).run();

    currentApplicationId = Number(result.lastInsertRowid);

    const profile = db.select().from(schema.profiles).limit(1).get();
    const snippets = db.select().from(schema.snippets).all();

    const proposed = fields.map((field) => {
      const category = categorizeQuestion(field.label);
      if (SENSITIVE_CATEGORIES.has(category)) {
        return { ...field, proposedValue: '', confidence: 0, fillMethod: 'manual-required' };
      }

      const profileField = matchProfileField(field.label);
      if (profileField && profile) {
        const val = getProfileFieldValue(profile, profileField);
        if (val) return { ...field, proposedValue: val, confidence: 0.95, fillMethod: 'profile' };
      }

      const bestSnippet = snippets
        .map((s) => ({ s, score: fuzzyMatchScore(field.label, s.title + ' ' + s.body) }))
        .sort((a, b) => b.score - a.score)[0];

      if (bestSnippet && bestSnippet.score > 0.4) {
        return { ...field, proposedValue: bestSnippet.s.body, confidence: bestSnippet.score, fillMethod: 'snippet' };
      }

      return { ...field, proposedValue: '', confidence: 0, fillMethod: 'needs-generation' };
    });

    return {
      applicationId: currentApplicationId,
      atsType,
      jobInfo,
      fields: proposed,
      pageTitle: await page.title(),
      hint: fields.length === 0
        ? 'No fields detected. Scroll to the Apply form in the browser, then click Start again.'
        : undefined,
    };
  });

  app.post('/runner/fill', async (req) => {
    if (!page || !currentApplicationId) return { error: 'No active session' };

    const body = req.body as {
      fields: { id: string; label: string; type: string; proposedValue: string; selector?: string }[];
    };

    const appRecord = getDb().select().from(schema.applications).where(eq(schema.applications.id, currentApplicationId)).get();
    const adapter = getAdapter(appRecord?.atsType ?? 'generic');
    const results = [];

    for (const field of body.fields) {
      if (!field.proposedValue) continue;
      const result = await adapter.fillField(page, {
        id: field.id,
        label: field.label,
        type: field.type as never,
        required: false,
        selector: field.selector,
      }, field.proposedValue);

      getDb().insert(schema.applicationFields).values({
        applicationId: currentApplicationId,
        fieldLabel: field.label,
        fieldType: field.type,
        normalizedQuestion: normalizeQuestion(field.label),
        proposedValue: field.proposedValue,
        finalValue: result.value ?? field.proposedValue,
        fillMethod: result.method,
        confidence: result.confidence,
        validationPassed: result.success,
        createdAt: nowIso(),
      }).run();

      getDb().insert(schema.fieldFillEvents).values({
        applicationId: currentApplicationId,
        fieldLabel: field.label,
        fieldType: field.type,
        selectedValue: result.value ?? field.proposedValue,
        fillMethod: result.method,
        confidence: result.confidence,
        validationPassed: result.success,
        createdAt: nowIso(),
      }).run();

      const normalized = normalizeQuestion(field.label);
      const existingQ = getDb().select().from(schema.questions).where(eq(schema.questions.normalizedText, normalized)).get();
      if (!existingQ) {
        getDb().insert(schema.questions).values({
          originalText: field.label,
          normalizedText: normalized,
          category: categorizeQuestion(field.label),
          timesSeen: 1,
          firstSeenAt: nowIso(),
          lastSeenAt: nowIso(),
        }).run();
      }

      results.push({ field: field.label, ...result });
    }

    const primaryResume = getDb().select().from(schema.documents).where(eq(schema.documents.isPrimary, true)).get()
      ?? getDb().select().from(schema.documents).all().find((d) => d.type === 'resume');

    if (primaryResume && adapter.uploadResume) {
      const uploadResult = await adapter.uploadResume(page, primaryResume.filePath);
      results.push({ field: 'Resume Upload', ...uploadResult });
    }

    return { results, message: 'Fill complete. Review before submitting. Auto-submit is disabled.' };
  });

  app.get('/runner/status', async () => {
    if (!page) return { active: false };
    return {
      active: true,
      applicationId: currentApplicationId,
      url: page.url(),
      title: await page.title(),
    };
  });

  app.post('/runner/stop', async () => {
    if (browser) {
      await browser.close();
      browser = null;
      context = null;
      page = null;
    }
    currentApplicationId = null;
    return { stopped: true };
  });
}

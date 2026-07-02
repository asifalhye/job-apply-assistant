import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema, nowIso, getDataDir } from '@jaa/storage';
import { chunkText, parseResumeSections, simpleEmbed } from '@jaa/rag';
import { createWriteStream, readFileSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';

async function extractText(filePath: string, mimeType?: string | null): Promise<string> {
  const buf = readFileSync(filePath);
  if (mimeType?.includes('pdf')) {
    // Basic PDF text extraction fallback — full parser can be added later
    return buf.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').slice(0, 50000);
  }
  return buf.toString('utf8');
}

export async function registerDocumentRoutes(app: FastifyInstance) {
  app.get('/documents', async () => {
    return getDb().select().from(schema.documents).all();
  });

  app.post('/documents/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const type = (req.query as { type?: string }).type ?? 'other';
    const filename = `${Date.now()}-${data.filename}`;
    const filePath = join(getDataDir(), 'uploads', filename);
    await pipeline(data.file, createWriteStream(filePath));

    const now = nowIso();
    const parsedText = await extractText(filePath, data.mimetype);
    const parsedSections = parseResumeSections(parsedText);

    const result = getDb().insert(schema.documents).values({
      name: data.filename,
      type,
      filePath,
      mimeType: data.mimetype,
      isPrimary: type === 'resume',
      parsedText,
      parsedSections,
      createdAt: now,
      updatedAt: now,
    }).run();

    const docId = Number(result.lastInsertRowid);
    indexDocument(docId, parsedText, parsedSections);

    return getDb().select().from(schema.documents).where(eq(schema.documents.id, docId)).get();
  });

  app.delete('/documents/:id', async (req) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    getDb().delete(schema.documents).where(eq(schema.documents.id, id)).run();
    getDb().delete(schema.documentChunks).where(eq(schema.documentChunks.documentId, id)).run();
    return { success: true };
  });

  app.post('/documents/:id/primary', async (req) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    getDb().update(schema.documents).set({ isPrimary: false }).run();
    getDb().update(schema.documents).set({ isPrimary: true, updatedAt: nowIso() }).where(eq(schema.documents.id, id)).run();
    return getDb().select().from(schema.documents).where(eq(schema.documents.id, id)).get();
  });

  app.post('/documents/reindex', async () => {
    const docs = getDb().select().from(schema.documents).all();
    for (const doc of docs) {
      if (doc.parsedText) {
        getDb().delete(schema.documentChunks).where(eq(schema.documentChunks.documentId, doc.id)).run();
        indexDocument(doc.id, doc.parsedText, doc.parsedSections ?? {});
      }
    }
    return { indexed: docs.length };
  });
}

function indexDocument(docId: number, text: string, sections: Record<string, string>) {
  const now = nowIso();
  const db = getDb();

  for (const [section, content] of Object.entries(sections)) {
    for (const chunk of chunkText(content)) {
      db.insert(schema.documentChunks).values({
        documentId: docId,
        section,
        content: chunk,
        embedding: simpleEmbed(chunk),
        createdAt: now,
      }).run();
    }
  }

  if (Object.keys(sections).length === 0) {
    for (const chunk of chunkText(text)) {
      db.insert(schema.documentChunks).values({
        documentId: docId,
        section: 'general',
        content: chunk,
        embedding: simpleEmbed(chunk),
        createdAt: now,
      }).run();
    }
  }
}

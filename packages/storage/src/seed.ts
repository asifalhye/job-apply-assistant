import { runMigrations } from './migrate.js';
import { getDb, schema } from './db.js';
import { eq } from 'drizzle-orm';

runMigrations();

const db = getDb();
const now = new Date().toISOString();

const existing = db.select().from(schema.profiles).all();
if (existing.length === 0) {
  db.insert(schema.profiles).values({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    customFields: {},
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log('Seeded empty profile.');
}

const defaultSettings: Record<string, string> = {
  llm_provider: 'stub',
  llm_model: 'stub',
  llm_mode: 'balanced',
  classification_provider: 'stub',
  classification_model: 'stub',
  generation_provider: 'stub',
  generation_model: 'stub',
  ollama_base_url: 'http://localhost:11434',
  auto_fill: 'false',
  onboarding_complete: 'false',
};

for (const [key, value] of Object.entries(defaultSettings)) {
  const found = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  if (!found) {
    db.insert(schema.settings).values({ key, value, updatedAt: now }).run();
  }
}

console.log('Seed complete.');

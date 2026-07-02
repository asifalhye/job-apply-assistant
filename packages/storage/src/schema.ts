import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  websiteUrl: text('website_url'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),
  pronouns: text('pronouns'),
  workAuthorization: text('work_authorization'),
  requiresSponsorship: integer('requires_sponsorship', { mode: 'boolean' }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  earliestStartDate: text('earliest_start_date'),
  willingToRelocate: integer('willing_to_relocate', { mode: 'boolean' }),
  customFields: text('custom_fields', { mode: 'json' }).$type<Record<string, string>>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // resume | cover_letter | portfolio | other
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  parsedText: text('parsed_text'),
  parsedSections: text('parsed_sections', { mode: 'json' }).$type<Record<string, string>>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const snippets = sqliteTable('snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  category: text('category').notNull().default('misc'),
  sourceType: text('source_type').default('user'),
  confidence: real('confidence').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originalText: text('original_text').notNull(),
  normalizedText: text('normalized_text').notNull().unique(),
  category: text('category'),
  timesSeen: integer('times_seen').default(1),
  canonicalSnippetId: integer('canonical_snippet_id'),
  clusterId: text('cluster_id'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company'),
  roleTitle: text('role_title'),
  jobUrl: text('job_url').notNull(),
  atsType: text('ats_type'),
  status: text('status').default('draft'),
  jobDescription: text('job_description'),
  checkpoint: text('checkpoint', { mode: 'json' }).$type<Record<string, unknown>>(),
  submittedAt: text('submitted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const applicationFields = sqliteTable('application_fields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type'),
  normalizedQuestion: text('normalized_question'),
  proposedValue: text('proposed_value'),
  finalValue: text('final_value'),
  fillMethod: text('fill_method'),
  confidence: real('confidence'),
  userEdited: integer('user_edited', { mode: 'boolean' }).default(false),
  validationPassed: integer('validation_passed', { mode: 'boolean' }),
  createdAt: text('created_at').notNull(),
});

export const fieldFillEvents = sqliteTable('field_fill_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type'),
  selectedValue: text('selected_value'),
  fillMethod: text('fill_method'),
  confidence: real('confidence'),
  userEdited: integer('user_edited', { mode: 'boolean' }).default(false),
  validationPassed: integer('validation_passed', { mode: 'boolean' }),
  createdAt: text('created_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workdayAccounts = sqliteTable('workday_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id').notNull().unique(),
  companyName: text('company_name'),
  email: text('email'),
  accountStatus: text('account_status').default('unknown'),
  encryptedCredentials: text('encrypted_credentials'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const documentChunks = sqliteTable('document_chunks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').notNull(),
  snippetId: integer('snippet_id'),
  section: text('section'),
  content: text('content').notNull(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  createdAt: text('created_at').notNull(),
});

export const questionAnswers = sqliteTable('question_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionId: integer('question_id').notNull(),
  snippetId: integer('snippet_id'),
  applicationId: integer('application_id'),
  answerText: text('answer_text').notNull(),
  source: text('source').notNull(),
  accepted: integer('accepted', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type Snippet = typeof snippets.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type WorkdayAccount = typeof workdayAccounts.$inferSelect;

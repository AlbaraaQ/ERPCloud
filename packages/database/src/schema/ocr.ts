import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { baseAuditColumns } from '../columns.js';

import { tenants } from './platform.js';
import { files } from './platform-services.js';

/** OCR work items — Future enhancement 02. */
export const ocrJobs = pgTable(
  'ocr_jobs',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    entityType: text('entity_type').notNull(),
    status: text('status').notNull().default('queued'),
    extracted: jsonb('extracted').$type<Record<string, unknown>>().notNull().default({}),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    provider: text('provider').notNull().default('mock'),
    error: text('error'),
    /** Deterministic fixture input for the mock provider; never sent to a real provider. */
    inputHint: text('input_hint'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...baseAuditColumns(),
  },
  (table) => ({
    ocrJobsTenantStatusIdx: index('ocr_jobs_tenant_status_created_at_idx').on(
      table.tenantId,
      table.status,
      table.createdAt,
    ),
    ocrJobsTenantFileIdx: index('ocr_jobs_tenant_file_idx').on(table.tenantId, table.fileId),
  }),
);

export type OcrJob = typeof ocrJobs.$inferSelect;
export type NewOcrJob = typeof ocrJobs.$inferInsert;

#!/usr/bin/env node
/**
 * Live verification for future enhancement 02 — OCR purchase invoices.
 *
 * The provider is intentionally the deterministic mock in this phase. The script exercises
 * the real HTTP upload/job/review/create-draft flow, then removes its rows through the
 * migrator connection so repeated verification does not pollute the demo tenant.
 *
 * Usage: node scripts/verify-ocr.mjs
 */
// `pg` is an API dependency; use the workspace link so this standalone script needs no root dependency.
import pg from '../apps/api/node_modules/pg/lib/index.js';

import { loadEnvFiles } from './dotenv.mjs';

loadEnvFiles();

const base = process.env.API_BASE ?? 'http://127.0.0.1:3000/api/v1';
const tenantCode = process.env.VERIFY_TENANT ?? 'demo';
const email = process.env.VERIFY_EMAIL ?? 'owner@demo.test';
const password = process.env.DEMO_OWNER_PASSWORD ?? '';
let token = '';
let failures = 0;
let checks = 0;
const cleanupErrors = [];
const created = { fileIds: [], jobIds: [], invoiceIds: [], partyIds: [] };

function check(label, condition, detail = '') {
  checks += 1;
  if (condition) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: method.toUpperCase(),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(`${method} ${path} → ${response.status} ${payload.code ?? ''} ${payload.detail ?? ''}`);
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload.data ?? payload;
}

async function refused(method, path, body) {
  try {
    await request(method, path, body);
    return { status: 200, code: '' };
  } catch (error) {
    return { status: error.status ?? 0, code: error.code ?? '' };
  }
}

async function createReadyJob(sourceText, name, checkReservation = false) {
  const reservation = await request('post', '/ocr/presign', {
    name,
    mime: 'application/pdf',
    sizeBytes: 1024,
  });
  if (checkReservation) check('إصدار presign للملف', Boolean(reservation.fileId && reservation.uploadUrl));
  created.fileIds.push(reservation.fileId);
  await request('post', `/files/${reservation.fileId}/finalize`, {});
  const ready = await request('get', `/files/${reservation.fileId}`);
  check('حفظ الملف كـ ready', ready.status === 'ready', reservation.fileId);
  const job = await request('post', '/ocr/jobs', {
    fileId: reservation.fileId,
    entityType: 'purchase_invoice',
    sourceText,
  });
  created.jobIds.push(job.id);
  return job;
}

async function cleanupDatabase() {
  if (created.jobIds.length === 0 && created.fileIds.length === 0 && created.invoiceIds.length === 0 && created.partyIds.length === 0) return;
  const url = process.env.DATABASE_MIGRATOR_URL ?? process.env.DATABASE_URL;
  if (!url) {
    cleanupErrors.push('DATABASE_MIGRATOR_URL/DATABASE_URL is not configured');
    return;
  }
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('BEGIN');
    if (created.invoiceIds.length) await client.query('DELETE FROM purchase_invoices WHERE id = ANY($1::uuid[])', [created.invoiceIds]);
    if (created.jobIds.length) {
      await client.query("DELETE FROM outbox_jobs WHERE payload->>'jobId' = ANY($1::text[])", [created.jobIds]);
      await client.query('DELETE FROM ocr_jobs WHERE id = ANY($1::uuid[])', [created.jobIds]);
    }
    if (created.fileIds.length) await client.query('DELETE FROM files WHERE id = ANY($1::uuid[])', [created.fileIds]);
    if (created.partyIds.length) await client.query('DELETE FROM parties WHERE id = ANY($1::uuid[])', [created.partyIds]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    cleanupErrors.push(error instanceof Error ? error.message : String(error));
  } finally {
    await client.end().catch(() => undefined);
  }
}

try {
  const login = await request('post', '/auth/login', { tenantCode, email, password });
  token = login.accessToken ?? login.token ?? '';
  check('تسجيل الدخول', Boolean(token), tenantCode);

  const stamp = Date.now().toString().slice(-8);
  const firstText = [
    'Supplier: OCR Verification Supplier',
    `Invoice Number: OCR-${stamp}`,
    'Invoice Date: 2026-09-20',
    'Subtotal: 100.00',
    'Tax: 15.00',
    'Total: 115.00',
  ].join('\n');
  const first = await createReadyJob(firstText, `verify-ocr-${stamp}.pdf`, true);
  check('إنشاء مهمة OCR mock', first.status === 'done' && first.provider === 'mock', `${first.status} / ${first.provider}`);
  check(
    'استخراج المورد والمرجع والتاريخ والثقة',
    first.extracted.supplierName === 'OCR Verification Supplier' &&
      first.extracted.invoiceNumber === `OCR-${stamp}` &&
      first.extracted.invoiceDate === '2026-09-20' &&
      (first.confidence ?? 0) >= 0.9,
    `${first.confidence ?? 0}`,
  );

  const fetched = await request('get', `/ocr/jobs/${first.id}`);
  check('قراءة حالة المهمة بالمعرّف', fetched.id === first.id && fetched.status === 'done');

  const arabic = await createReadyJob(
    'اسم المورد: مورد التحقق\nرقم الفاتورة: ٤٢\nتاريخ الفاتورة: ٢٠/٠٩/٢٠٢٦\nالإجمالي: ١١٥٫٠٠',
    `verify-ocr-ar-${stamp}.pdf`,
  );
  check(
    'دعم العربية والأرقام العربية',
    arabic.extracted.supplierName === 'مورد التحقق' &&
      arabic.extracted.invoiceDate === '2026-09-20' &&
      arabic.extracted.total === '115.00',
  );

  const rejected = await refused('post', '/ocr/presign', {
    name: `verify-ocr-${stamp}.txt`,
    mime: 'text/plain',
    sizeBytes: 10,
  });
  check('رفض نوع ملف غير مدعوم', rejected.status === 422 && rejected.code === 'VALIDATION_FAILED', `${rejected.status} ${rejected.code}`);

  const party = await request('post', '/parties', {
    kind: 'supplier',
    name: 'OCR Verification Supplier',
    taxNo: `VERIFY-OCR-${stamp}`,
  });
  created.partyIds.push(party.id);
  const branches = await request('get', '/branches');
  const invoice = await request('post', '/purchases/invoices/from-ocr', {
    ocrJobId: first.id,
    branchId: branches[0]?.id,
    partyId: party.id,
    lines: [],
  });
  created.invoiceIds.push(invoice.id);
  check(
    'إنشاء مسودة رأسية من OCR',
    invoice.status === 'draft' &&
      invoice.lines.length === 0 &&
      invoice.supplierReferenceNo === `OCR-${stamp}` &&
      invoice.subtotal === '100.0000' &&
      invoice.total === '115.0000',
    `${invoice.id} · ${invoice.lines.length} بند`,
  );
} catch (error) {
  failures += 1;
  console.error(`  ✗ verification aborted — ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await cleanupDatabase();
}

console.log(`\nOCR verification: ${checks - failures}/${checks}`);
if (cleanupErrors.length > 0) {
  console.error(`Cleanup failed: ${cleanupErrors.join('; ')}`);
  process.exitCode = 1;
}
if (failures > 0) process.exitCode = 1;

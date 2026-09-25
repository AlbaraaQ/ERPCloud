import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  DomainError,
  errorCodes,
  jobTypes,
  ocrExtractedSchema,
  type OcrJobDto,
  type OcrJobCreateRequest,
  type OcrPresignRequest,
  type OcrExtracted,
  type PurchaseInvoiceFromOcrRequest,
} from '@erp/contracts';
import {
  files,
  newId,
  ocrJobs,
  parties,
  withTenantTx,
  type DatabaseHandle,
} from '@erp/database';

import { DATABASE_HANDLE } from '../../database/database.module.js';
import {
  FilesService,
  JobHandlerRegistry,
  OutboxService,
  QUEUE_PORT,
  type QueuePort,
} from '../platform-services/index.js';
import { PurchasesService, type PurchaseHeaderDraftInput, type PurchaseInvoiceInput } from '../purchases/purchases.service.js';

import { emptyExtraction, OCR_PROVIDER, type OcrProvider } from './ocr.provider.js';

const SUPPORTED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/bmp',
  'image/gif',
]);

@Injectable()
export class OcrService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_HANDLE) private readonly database: DatabaseHandle,
    private readonly files: FilesService,
    private readonly outbox: OutboxService,
    private readonly registry: JobHandlerRegistry,
    private readonly purchases: PurchasesService,
    @Inject(QUEUE_PORT) private readonly queue: QueuePort,
    @Inject(OCR_PROVIDER) private readonly provider: OcrProvider,
  ) {}

  /** OCR uses the frozen `maintenance` queue; no sixth queue is introduced. */
  onModuleInit(): void {
    this.registry.register('maintenance', jobTypes.OCR_PROCESS, (context) => {
      const jobId = typeof context.payload.jobId === 'string' ? context.payload.jobId : '';
      if (!jobId) throw new DomainError(errorCodes.VALIDATION_FAILED, 'OCR job payload is missing jobId', 422);
      return this.process(context.tenantId, jobId);
    });
  }

  async presign(tenantId: string, actorUserId: string, input: OcrPresignRequest) {
    if (!SUPPORTED_MIMES.has(input.mime.toLowerCase())) {
      throw new DomainError(
        errorCodes.VALIDATION_FAILED,
        'OCR accepts PDF or image files only',
        422,
        { field: 'mime' },
      );
    }
    return this.files.presign(tenantId, actorUserId, input);
  }

  async createJob(tenantId: string, actorUserId: string, input: OcrJobCreateRequest): Promise<OcrJobDto> {
    const file = await this.files.read(tenantId, input.fileId);
    if (file.status !== 'ready') {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'Finalize the upload before creating an OCR job', 422, {
        field: 'fileId',
      });
    }
    if (!SUPPORTED_MIMES.has(file.mime.toLowerCase())) {
      throw new DomainError(errorCodes.VALIDATION_FAILED, 'OCR accepts PDF or image files only', 422, {
        field: 'fileId',
      });
    }

    const id = newId();
    await withTenantTx(this.database.db, tenantId, async (tx) => {
      await tx.insert(ocrJobs).values({
        id,
        tenantId,
        fileId: input.fileId,
        entityType: input.entityType,
        status: 'queued',
        extracted: emptyExtraction(),
        provider: this.provider.name,
        inputHint: input.sourceText ?? null,
        createdBy: actorUserId,
      });
      await this.outbox.enqueueInTx(tx, {
        tenantId,
        queue: 'maintenance',
        type: jobTypes.OCR_PROCESS,
        payload: { jobId: id, fileId: input.fileId },
      });
    });

    // A developer install normally has no Redis. The mock provider can still give the
    // user a useful review immediately; the durable outbox row remains as the handoff
    // proof and a Redis-backed worker will process real providers asynchronously.
    if (this.provider.name === 'mock' && !(this.queue.isEnabled() && (await this.queue.ping()))) {
      await this.process(tenantId, id);
    }
    return this.get(tenantId, id);
  }

  async get(tenantId: string, id: string): Promise<OcrJobDto> {
    const [row] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx.select().from(ocrJobs).where(and(eq(ocrJobs.tenantId, tenantId), eq(ocrJobs.id, id))),
    );
    if (!row) throw new DomainError('OCR_JOB_NOT_FOUND', 'OCR job was not found', 404);
    return toDto(row);
  }

  /** Idempotent worker operation: only a queued row can be claimed. */
  async process(tenantId: string, id: string): Promise<void> {
    const [claimed] = await withTenantTx(this.database.db, tenantId, async (tx) =>
      tx
        .update(ocrJobs)
        .set({ status: 'processing', startedAt: new Date(), error: null, updatedAt: new Date() })
        .where(and(eq(ocrJobs.tenantId, tenantId), eq(ocrJobs.id, id), eq(ocrJobs.status, 'queued')))
        .returning(),
    );
    if (!claimed) return;

    try {
      const [file] = await withTenantTx(this.database.db, tenantId, (tx) =>
        tx.select({ name: files.name, mime: files.mime }).from(files).where(and(eq(files.tenantId, tenantId), eq(files.id, claimed.fileId))),
      );
      if (!file) throw new DomainError('OCR_FILE_NOT_FOUND', 'The OCR source file was not found', 404);
      const extracted = await this.provider.extract({
        fileName: file.name,
        mime: file.mime,
        sourceText: claimed.inputHint,
      });
      const confidence = confidenceOf(extracted);
      await withTenantTx(this.database.db, tenantId, (tx) =>
        tx
          .update(ocrJobs)
          .set({
            status: 'done',
            extracted,
            confidence: confidence.toFixed(4),
            completedAt: new Date(),
            updatedAt: new Date(),
            inputHint: null,
          })
          .where(and(eq(ocrJobs.tenantId, tenantId), eq(ocrJobs.id, id))),
      );
    } catch (error) {
      await withTenantTx(this.database.db, tenantId, (tx) =>
        tx
          .update(ocrJobs)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(ocrJobs.tenantId, tenantId), eq(ocrJobs.id, id))),
      );
      throw error;
    }
  }

  async createPurchaseFromOcr(
    tenantId: string,
    jobId: string,
    input: PurchaseInvoiceFromOcrRequest,
  ) {
    const job = await this.get(tenantId, jobId);
    if (job.entityType !== 'purchase_invoice') {
      throw new DomainError('OCR_ENTITY_TYPE_INVALID', 'This OCR job is not a purchase invoice', 422);
    }
    if (job.status !== 'done') {
      throw new DomainError('OCR_JOB_NOT_READY', 'Wait for OCR to finish before creating a purchase draft', 409);
    }

    const extracted = job.extracted;
    const partyId = input.partyId ?? (await this.matchSupplier(tenantId, input.supplierName ?? extracted.supplierName));
    if (!partyId) {
      throw new DomainError('OCR_SUPPLIER_REVIEW_REQUIRED', 'Select the supplier before creating the purchase draft', 422);
    }

    const headerInput: Omit<PurchaseHeaderDraftInput, 'subtotal' | 'taxTotal' | 'total'> = {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      partyId,
      costCenterId: input.costCenterId,
      kind: 'purchase',
      supplierReferenceNo: input.supplierReferenceNo ?? extracted.invoiceNumber ?? undefined,
      supplierReferenceDate: input.supplierReferenceDate ?? extracted.invoiceDate ?? undefined,
      currency: input.currency ?? extracted.currency ?? undefined,
      priceIncludesVat: input.priceIncludesVat,
      invoiceDiscount: input.invoiceDiscount,
      landedCostAlloc: input.landedCostAlloc,
    };
    if (input.lines.length === 0) {
      return this.purchases.createHeaderDraft(tenantId, {
        ...headerInput,
        subtotal: extracted.subtotal ?? undefined,
        taxTotal: extracted.taxTotal ?? undefined,
        total: extracted.total ?? undefined,
      });
    }
    const purchaseInput: PurchaseInvoiceInput = {
      ...headerInput,
      lines: input.lines.map((line) => ({
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxGroupId: line.taxGroupId,
        discountRate: line.discountRate,
      })),
    };
    return this.purchases.create(tenantId, purchaseInput);
  }

  private async matchSupplier(tenantId: string, supplierName: string | null): Promise<string | undefined> {
    if (!supplierName?.trim()) return undefined;
    const wanted = normalizeName(supplierName);
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select({ id: parties.id, name: parties.name })
        .from(parties)
        .where(and(eq(parties.tenantId, tenantId), inArray(parties.kind, ['supplier', 'both'])))
        .limit(500),
    );
    const exact = rows.find((row) => normalizeName(row.name) === wanted);
    return exact?.id;
  }
}

function confidenceOf(extracted: OcrExtracted): number {
  const values = Object.values(extracted.fields)
    .filter((field) => field.value !== null)
    .map((field) => field.confidence);
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeName(value: string): string {
  return value.normalize('NFKC').replace(/[\u064B-\u065F]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function toDto(row: typeof ocrJobs.$inferSelect): OcrJobDto {
  const extracted = ocrExtractedSchema.safeParse(row.extracted);
  return {
    id: row.id,
    fileId: row.fileId,
    entityType: row.entityType as OcrJobDto['entityType'],
    status: row.status as OcrJobDto['status'],
    extracted: extracted.success ? extracted.data : emptyExtraction(),
    confidence: row.confidence === null ? null : Number(row.confidence),
    provider: row.provider,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

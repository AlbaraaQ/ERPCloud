import { z } from 'zod';

import { filePresignSchema } from './platform/files.js';
import { uuidSchema } from './ids.js';

/** OCR document kinds supported by the first purchase-invoice slice. */
export const ocrEntityTypeSchema = z.enum(['purchase_invoice', 'expense']);
export type OcrEntityType = z.infer<typeof ocrEntityTypeSchema>;

export const ocrJobStatusSchema = z.enum(['queued', 'processing', 'done', 'failed']);
export type OcrJobStatus = z.infer<typeof ocrJobStatusSchema>;

/** The OCR upload route deliberately does not accept an arbitrary attachment target. */
export const ocrPresignSchema = filePresignSchema
  .omit({ entity: true, entityId: true })
  .strict();
export type OcrPresignRequest = z.infer<typeof ocrPresignSchema>;

export const ocrJobCreateSchema = z
  .object({
    fileId: uuidSchema,
    entityType: ocrEntityTypeSchema.default('purchase_invoice'),
    /** Optional fixture text for the deterministic mock provider and local verification. */
    sourceText: z.string().trim().max(20_000).optional(),
  })
  .strict();
export type OcrJobCreateRequest = z.infer<typeof ocrJobCreateSchema>;

export const ocrFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type OcrField = z.infer<typeof ocrFieldSchema>;

export const ocrExtractedSchema = z.object({
  supplierName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  subtotal: z.string().nullable(),
  taxTotal: z.string().nullable(),
  total: z.string().nullable(),
  currency: z.string().nullable(),
  fields: z.record(ocrFieldSchema),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.string(),
      unitPrice: z.string(),
      taxRate: z.string(),
      total: z.string(),
      itemId: uuidSchema.nullable().optional(),
    }),
  ),
  rawText: z.string().optional(),
});
export type OcrExtracted = z.infer<typeof ocrExtractedSchema>;

export const ocrJobDtoSchema = z.object({
  id: uuidSchema,
  fileId: uuidSchema,
  entityType: ocrEntityTypeSchema,
  status: ocrJobStatusSchema,
  extracted: ocrExtractedSchema,
  confidence: z.number().nullable(),
  provider: z.string(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type OcrJobDto = z.infer<typeof ocrJobDtoSchema>;

const ocrPurchaseLineSchema = z.object({
  itemId: uuidSchema,
  description: z.string().trim().max(500).optional(),
  quantity: z.string().trim().min(1).max(40),
  unitPrice: z.string().trim().min(1).max(40),
  taxRate: z.string().trim().max(40).optional(),
  taxGroupId: uuidSchema.optional(),
  discountRate: z.string().trim().max(40).optional(),
});

/**
 * OCR only fills the header. Item mapping is an explicit review action, so creating the
 * purchase draft requires at least one user-confirmed item line rather than inventing a
 * stock item from untrusted text.
 */
export const purchaseInvoiceFromOcrSchema = z
  .object({
    ocrJobId: uuidSchema,
    branchId: uuidSchema,
    warehouseId: uuidSchema.optional(),
    partyId: uuidSchema.optional(),
    supplierName: z.string().trim().max(300).optional(),
    costCenterId: uuidSchema.optional(),
    supplierReferenceNo: z.string().trim().max(200).optional(),
    supplierReferenceDate: z.string().trim().max(40).optional(),
    subtotal: z.string().trim().max(40).optional(),
    taxTotal: z.string().trim().max(40).optional(),
    total: z.string().trim().max(40).optional(),
    currency: z.string().trim().length(3).optional(),
    priceIncludesVat: z.boolean().optional(),
    invoiceDiscount: z.string().trim().max(40).optional(),
    landedCostAlloc: z.enum(['qty', 'value']).optional(),
    lines: z.array(ocrPurchaseLineSchema).default([]),
  })
  .strict();
export type PurchaseInvoiceFromOcrRequest = z.infer<typeof purchaseInvoiceFromOcrSchema>;

export const OCR_PERMISSION = 'purchase.ocr.use' as const;

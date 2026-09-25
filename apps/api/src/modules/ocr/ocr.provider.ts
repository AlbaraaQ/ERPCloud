import { Injectable } from '@nestjs/common';
import { ocrExtractedSchema, type OcrExtracted } from '@erp/contracts';

export type OcrProviderInput = {
  fileName: string;
  mime: string;
  /** Only the mock adapter consumes this deterministic fixture text. */
  sourceText?: string | null;
};

export interface OcrProvider {
  readonly name: string;
  extract(input: OcrProviderInput): Promise<OcrExtracted>;
}

export const OCR_PROVIDER = Symbol('OCR_PROVIDER');

/**
 * A small, deterministic provider used by the first slice and by the six-case test
 * fixture. It intentionally accepts text rather than pretending that a regex is OCR for
 * arbitrary pixels. The provider boundary is the seam for Document AI/Textract/Azure;
 * production adapters can fetch the finalized object and return the same DTO.
 */
@Injectable()
export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock';

  async extract(input: OcrProviderInput): Promise<OcrExtracted> {
    const text = input.sourceText?.trim() ?? '';
    const parsed = parseStructuredJson(text) ?? parseLabeledText(text);
    return ocrExtractedSchema.parse({ ...parsed, rawText: text || undefined });
  }
}

export function emptyExtraction(): OcrExtracted {
  return {
    supplierName: null,
    invoiceNumber: null,
    invoiceDate: null,
    subtotal: null,
    taxTotal: null,
    total: null,
    currency: null,
    fields: {
      supplierName: { value: null, confidence: 0 },
      invoiceNumber: { value: null, confidence: 0 },
      invoiceDate: { value: null, confidence: 0 },
      subtotal: { value: null, confidence: 0 },
      taxTotal: { value: null, confidence: 0 },
      total: { value: null, confidence: 0 },
      currency: { value: null, confidence: 0 },
    },
    lines: [],
  };
}

function parseStructuredJson(text: string): OcrExtracted | undefined {
  if (!text.startsWith('{')) return undefined;
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const base = emptyExtraction();
    const field = (key: keyof OcrExtracted, aliases: string[] = []): string | null => {
      const keys = [key, ...aliases];
      for (const candidate of keys) {
        const raw = value[candidate];
        if (typeof raw === 'string' && raw.trim()) return raw.trim();
        if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
      }
      return null;
    };
    const supplierName = field('supplierName', ['supplier', 'vendor', 'المورد']);
    const invoiceNumber = field('invoiceNumber', ['invoiceNo', 'invoice_no', 'reference', 'رقم الفاتورة']);
    const invoiceDate = field('invoiceDate', ['date', 'تاريخ الفاتورة']);
    const subtotal = moneyValue(field('subtotal', ['net', 'قبل الضريبة']));
    const taxTotal = moneyValue(field('taxTotal', ['tax', 'vat', 'الضريبة']));
    const grandTotalValue = moneyValue(field('total', ['grandTotal', 'الإجمالي']));
    const currency = field('currency', ['عملة']);
    const lines = Array.isArray(value.lines) ? parseJsonLines(value.lines) : [];
    return withFields({ ...base, supplierName, invoiceNumber, invoiceDate: normalizeDate(invoiceDate), subtotal, taxTotal, total: grandTotalValue, currency, lines });
  } catch {
    return undefined;
  }
}

function parseLabeledText(text: string): OcrExtracted {
  const base = emptyExtraction();
  const supplierName = labeled(text, ['supplier name', 'supplier', 'vendor', 'اسم المورد', 'المورد']);
  const invoiceNumber = labeled(text, [
    'invoice number',
    'invoice no',
    'invoice #',
    'reference',
    'رقم فاتورة المورد',
    'رقم الفاتورة',
    'رقم الفاتورة',
  ]);
  const invoiceDate = normalizeDate(labeled(text, ['invoice date', 'date', 'تاريخ فاتورة المورد', 'تاريخ الفاتورة']));
  const subtotal = moneyValue(labeled(text, ['subtotal', 'net', 'قبل الضريبة', 'المجموع قبل الضريبة']));
  const taxTotal = moneyValue(labeled(text, ['tax total', 'tax', 'vat', 'الضريبة', 'ضريبة القيمة المضافة']));
  const grandTotalValue = moneyValue(labeled(text, ['grand total', 'total', 'الإجمالي', 'المجموع']));
  const currency = labeled(text, ['currency', 'العملة']);
  const lines = parseLines(text);
  return withFields({ ...base, supplierName, invoiceNumber, invoiceDate, subtotal, taxTotal, total: grandTotalValue, currency, lines });
}

function withFields(
  value: OcrExtracted,
  confidence = 0.94,
): OcrExtracted {
  const values: Array<[keyof OcrExtracted, string | null]> = [
    ['supplierName', value.supplierName],
    ['invoiceNumber', value.invoiceNumber],
    ['invoiceDate', value.invoiceDate],
    ['subtotal', value.subtotal],
    ['taxTotal', value.taxTotal],
    ['total', value.total],
    ['currency', value.currency],
  ];
  const fields = Object.fromEntries(
    values.map(([key, fieldValue]) => [key, { value: fieldValue, confidence: fieldValue ? confidence : 0 }]),
  );
  return { ...value, fields };
}

function labeled(text: string, labels: string[]): string | null {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  for (const row of rows) {
    const lower = row.toLocaleLowerCase();
    const label = labels.find((candidate) => lower.startsWith(candidate.toLocaleLowerCase()));
    if (!label) continue;
    const value = row.slice(label.length).replace(/^[\s:：=\-#]+/, '').trim();
    if (value) return value;
  }
  return null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const normalized = toWesternDigits(value).trim();
  const iso = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, '0')}-${iso[3]!.padStart(2, '0')}`;
  const european = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (european) return `${european[3]}-${european[2]!.padStart(2, '0')}-${european[1]!.padStart(2, '0')}`;
  return value;
}

function moneyValue(value: string | null): string | null {
  if (!value) return null;
  const digits = toWesternDigits(value).replace(/٫/g, '.').replace(/٬/g, ',').replace(/[^\d,.-]/g, '');
  if (!digits) return null;
  const normalized = digits.includes('.')
    ? digits.replace(/,/g, '')
    : digits.replace(/,(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? normalized : null;
}

function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function parseLines(text: string): OcrExtracted['lines'] {
  return text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => /^(?:line|item|صنف|بند)\s*[:|]/i.test(row))
    .map((row) => row.replace(/^(?:line|item|صنف|بند)\s*[:|]/i, '').split(/[|;]/).map((part) => part.trim()))
    .map(([description, quantity, unitPrice, taxRate]) => ({
      description: description ?? '',
      quantity: moneyValue(quantity ?? '') ?? '1',
      unitPrice: moneyValue(unitPrice ?? '') ?? '0',
      taxRate: moneyValue(taxRate ?? '') ?? '0',
      total: '0',
    }))
    .filter((line) => line.description.length > 0);
}

function parseJsonLines(rows: unknown[]): OcrExtracted['lines'] {
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    return [{
      description: String(item.description ?? item.name ?? ''),
      quantity: moneyValue(String(item.quantity ?? '1')) ?? '1',
      unitPrice: moneyValue(String(item.unitPrice ?? item.price ?? '0')) ?? '0',
      taxRate: moneyValue(String(item.taxRate ?? item.tax ?? '0')) ?? '0',
      total: moneyValue(String(item.total ?? '0')) ?? '0',
      ...(typeof item.itemId === 'string' ? { itemId: item.itemId } : {}),
    }];
  }).filter((line) => line.description.length > 0);
}

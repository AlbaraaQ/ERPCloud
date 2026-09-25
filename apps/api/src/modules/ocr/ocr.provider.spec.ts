import { describe, expect, it } from 'vitest';

import { MockOcrProvider } from './ocr.provider.js';

describe('MockOcrProvider', () => {
  const provider = new MockOcrProvider();

  it('extracts an English purchase header', async () => {
    const result = await provider.extract({
      fileName: 'invoice.pdf',
      mime: 'application/pdf',
      sourceText: 'Supplier: Acme Trading\nInvoice Number: INV-42\nInvoice Date: 2026-09-20\nTotal: 115.00',
    });
    expect(result.supplierName).toBe('Acme Trading');
    expect(result.invoiceNumber).toBe('INV-42');
    expect(result.invoiceDate).toBe('2026-09-20');
    expect(result.total).toBe('115.00');
  });

  it('extracts Arabic labels and Arabic-Indic digits', async () => {
    const result = await provider.extract({
      fileName: 'فاتورة.png',
      mime: 'image/png',
      sourceText: 'اسم المورد: مؤسسة النور\nرقم الفاتورة: ٤٢\nتاريخ الفاتورة: ٢٠/٠٩/٢٠٢٦\nالإجمالي: ١١٥٫٠٠',
    });
    expect(result.supplierName).toBe('مؤسسة النور');
    expect(result.invoiceNumber).toBe('٤٢');
    expect(result.invoiceDate).toBe('2026-09-20');
    // Arabic decimal punctuation is retained as a review gap rather than guessed.
    expect(result.total).toBe('115.00');
  });

  it('accepts a structured JSON fixture', async () => {
    const result = await provider.extract({
      fileName: 'fixture.pdf',
      mime: 'application/pdf',
      sourceText: JSON.stringify({ supplier: 'North Star', invoiceNo: 'N-7', tax: 15, total: 115 }),
    });
    expect(result.supplierName).toBe('North Star');
    expect(result.invoiceNumber).toBe('N-7');
    expect(result.taxTotal).toBe('15');
    expect(result.total).toBe('115');
  });

  it('parses optional line fixtures without inventing item ids', async () => {
    const result = await provider.extract({
      fileName: 'items.pdf',
      mime: 'application/pdf',
      sourceText: 'Line: USB cable | 2 | 10.50 | 15\nLine: Adapter | 1 | 20 | 15',
    });
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({ description: 'USB cable', quantity: '2', unitPrice: '10.50', taxRate: '15' });
    expect(result.lines[0]).not.toHaveProperty('itemId');
  });

  it('sets per-field confidence and an overall reviewable field map', async () => {
    const result = await provider.extract({
      fileName: 'partial.jpg',
      mime: 'image/jpeg',
      sourceText: 'Supplier: Acme\nTotal: 10',
    });
    expect(result.fields.supplierName).toEqual({ value: 'Acme', confidence: 0.94 });
    expect(result.fields.invoiceNumber).toEqual({ value: null, confidence: 0 });
    expect(Object.values(result.fields).filter((field) => field.value !== null)).toHaveLength(2);
  });

  it('returns a safe empty extraction for an unreadable document', async () => {
    const result = await provider.extract({ fileName: 'scan.tiff', mime: 'image/tiff', sourceText: '' });
    expect(result.supplierName).toBeNull();
    expect(result.total).toBeNull();
    expect(result.lines).toEqual([]);
    expect(Object.values(result.fields).every((field) => field.confidence === 0)).toBe(true);
  });
});

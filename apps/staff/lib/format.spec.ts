import { describe, expect, it } from 'vitest';

import { decimalValue, moneyText, qtyText } from './format.js';

/**
 * اختبارات انحدار سلوكيّة — لا تقرأ نصّ المصدر.
 *
 * العلل الثلاثة التي كشفتها هذه الاختبارات كلّها كانت تمرّ والبوابة خضراء، لأنّ
 * ما كان موجودًا قبلها يقرأ الملفّ ويتأكّد أنّه «يحوي» عبارات، فلا يشغّل الكود
 * أبدًا. فهذه تُشغّله.
 */
describe('admin formatting kit', () => {
  it('formats money from decimal strings', () => {
    expect(moneyText('12.345', 'SAR', 'en-US')).toContain('12.35');
  });
  it('formats quantities without floating point drift', () => {
    expect(qtyText('1.23456')).toBe('1.2346');
  });

  describe('decimalValue — the guard that keeps a page from blanking out', () => {
    /**
     * `/pos/offline` كان يمرّر `tendered` إلى `new Decimal(raw ?? 0)`. حقل النقد
     * يبدأ فارغًا، و`''` ليس `null` فـ`??` لا يمسكه، و`new Decimal('')` يرمي
     * `DecimalError: Invalid argument:` — فتنهار الصفحة قبل أن يُدخل الكاشير شيئًا.
     */
    it('treats an empty cash field as zero instead of throwing', () => {
      expect(decimalValue('').toNumber()).toBe(0);
    });
    it('treats whitespace as zero', () => {
      expect(decimalValue('   ').toNumber()).toBe(0);
    });
    it('treats null and undefined as zero', () => {
      expect(decimalValue(null).toNumber()).toBe(0);
      expect(decimalValue(undefined).toNumber()).toBe(0);
    });
    /**
     * لصقًا من حقل يسمح بنصٍّ حرّ («—» من تقرير، «n/a»، أو رقم ملصق بحرف). كلّها
     * كانت ترمي أيضًا. حقل لا يُحلَّل في شاشة بيع يعني «لم يُدخَل»، لا «انهيار».
     */
    it('treats unparseable text as zero rather than throwing', () => {
      for (const junk of ['—', 'n/a', '12abc', 'abc', '-', '.', '1.2.3']) {
        expect(decimalValue(junk).toNumber(), junk).toBe(0);
      }
    });
    it('still parses real numbers exactly, with no float drift', () => {
      expect(decimalValue('12.5').toFixed(4)).toBe('12.5000');
      expect(decimalValue('0.1').plus('0.2').toFixed(4)).toBe('0.3000');
      expect(decimalValue(7).toNumber()).toBe(7);
      expect(decimalValue('-3.25').toNumber()).toBe(-3.25);
    });
    /**
     * `Decimal` يقبل `'Infinity'` و`'NaN'` نصًّا، فلا يرمي — لكنّهما غير منتهيين،
     * وتمريرهما إلى حساب فاتورة يُنتج `NaN` في المجموع لا رقمًا. الحارس يردّهما صفرًا.
     */
    it('rejects the non-finite values Decimal happily parses', () => {
      expect(decimalValue('Infinity').toNumber()).toBe(0);
      expect(decimalValue('-Infinity').toNumber()).toBe(0);
      expect(decimalValue('NaN').toNumber()).toBe(0);
    });
  });

  describe('moneyText and qtyText survive the same inputs', () => {
    it('renders an empty amount as zero rather than crashing', () => {
      expect(moneyText('', 'SAR', 'en-US')).toContain('0.00');
      expect(qtyText('')).toBe('0.0000');
    });
    it('renders unparseable text as zero rather than crashing', () => {
      expect(qtyText('—')).toBe('0.0000');
      expect(moneyText('n/a', 'SAR', 'en-US')).toContain('0.00');
    });
  });
});

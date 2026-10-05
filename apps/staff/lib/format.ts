import { Decimal } from 'decimal.js';

/**
 * يحوّل مدخلًا إلى `Decimal` بأمان — وهذا هو المفسّر الوحيد المسموح به في staff.
 *
 * حقل النقد وكميّة السطر وحقل السعر كلها تبدأ فارغة، و`''` ليس `null`: `??` لا
 * يمسكه، و`new Decimal('')` يرمي `DecimalError: Invalid argument:` فيسقط الصفحة
 * كلّها قبل أن يكتب المستخدم حرفًا واحدًا. وهذا ما حدث فعلًا في `/pos/offline`.
 *
 * والفراغ ليس الحالة الوحيدة: مسافات محيطة، ونصٌّ غير رقميّ («—»، «n/a»، «12abc»)
 * كلّها ترمي أيضًا. فالقاعدة: ما لا يُحلَّل إلى عدد منتهٍ يُعامل صفرًا — والحقل
 * الفارغ في نقطة بيع يعني «لم يُدخَل بعد»، لا «خطأ».
 */
export function decimalValue(raw: string | number | null | undefined): Decimal {
  if (raw === null || raw === undefined) return new Decimal(0);
  const text = typeof raw === 'string' ? raw.trim() : raw;
  if (text === '') return new Decimal(0);
  try {
    const parsed = new Decimal(text);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

export function moneyText(valueText: string, currency = 'SAR', locale = 'ar-SA'): string {
  const fixed = decimalValue(valueText).toFixed(2);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(fixed));
}

export function qtyText(valueText: string): string { return decimalValue(valueText).toFixed(4); }
export function persistColumns(key: string, columns: string[]): void { if (typeof localStorage !== 'undefined') localStorage.setItem(`erp:columns:${key}`, JSON.stringify(columns)); }
export function readColumns(key: string, fallback: string[]): string[] { if (typeof localStorage === 'undefined') return fallback; try { return JSON.parse(localStorage.getItem(`erp:columns:${key}`) ?? 'null') as string[] ?? fallback; } catch { return fallback; } }

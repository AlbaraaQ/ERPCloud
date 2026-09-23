# 02 — مسح الفواتير الذكي OCR

> الأولوية: P1 - 1 أسبوع
> السوق: Expensify / Dext / قيود (مسح الفاتورة)

## المشكلة
إدخال فاتورة شراء 20 بند يدوياً = 10 دقائق. المنافس يصورها بالموبايل وتُنشأ مسودة في ثوانٍ.

## النطاق

### يدخل
- رفع صورة/PDF فاتورة شراء/مصروف في `/purchases/invoices/new` زر "📷 مسح"
- خدمة OCR: استخراج (المورد، رقم الفاتورة، التاريخ، الإجمالي، الضريبة، البنود إن أمكن)
- جدول `ocr_jobs` (id, file_id, status: queued|processing|done|failed, extracted_json, confidence)
- واجهة مراجعة: يمين الصورة، يسار الحقول المستخرجة قابلة للتعديل
- دعم عربي + إنجليزي

### لا يدخل
- تدريب نموذج خاص — نستخدم API جاهز (Google Document AI / AWS Textract / Azure) مع مفتاح في `platform_settings`
- بنود كثيرة — نبدأ برأس الفاتورة + إجمالي، البنود مرحلة ثانية

## التصميم التقني

### ترحيل 0097
```sql
ocr_jobs (id, tenant_id, file_id, entity_type: purchase_invoice|expense, status, extracted: jsonb, confidence: numeric, created_by)
```

### API
- `POST /ocr/presign` — يرفع الصورة إلى files
- `POST /ocr/jobs` { fileId, entityType } → يضع في طابور
- `GET /ocr/jobs/:id` — حالة + نتيجة
- `POST /purchases/invoices/from-ocr` { ocrJobId } — ينشئ مسودة فاتورة

### تدفق
1. المستخدم يرفع صورة → `files/presign` → PUT → `finalize`
2. `POST /ocr/jobs` → ينشئ صف + يضع مهمة في طابور `ocr`
3. العامل ينادي مزود OCR (Document AI) → يحفظ JSON + confidence
4. الواجهة تستطلع كل 2 ثانية → تعرض الحقول
5. المستخدم يصحح → `from-ocr` ينشئ فاتورة شراء مسودة

### UI
- زر "📷 مسح فاتورة" في `/purchases/invoices`
- مكون `OcrReviewPanel`: صورة + حقول + نسبة ثقة ملونة (أخضر >90%، أصفر 70-90، أحمر <70)
- `/settings/ocr` — إعداد مزود OCR ومفتاح (منصة فقط)

### صلاحيات
- `purchase.ocr.use` جديدة

## معايير القبول
- [ ] صورة فاتورة عربية → يستخرج المورد والتاريخ والإجمالي بدقة ≥80%
- [ ] PDF متعدد الصفحات → يعالج أول صفحة
- [ ] ثقة <70% → يبرز الحقل بالأحمر
- [ ] اختبار `ocr.spec.ts` 6 حالات mock
- [ ] `verify-ocr.mjs` 10 نقاط

## الجهد
- Backend: 3 أيام (طابور + مزود + API)
- Frontend: 2 يوم (رفع + مراجعة)
- تكلفة: ~$0.01 لكل فاتورة مع Google

## ملاحظة سوق
قيود تبيع هذه الميزة بـ 99 ريال إضافي شهرياً — يمكن أن تكون باقة Pro.

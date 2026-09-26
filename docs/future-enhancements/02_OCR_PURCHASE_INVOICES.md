# 02 — مسح الفواتير الذكي OCR

> الأولوية: P1 - 1 أسبوع
> الحالة: **backend + staff review slice implemented; live provider verification requires configuration**
> السوق: Expensify / Dext / قيود (مسح الفاتورة)

## المشكلة
إدخال فاتورة شراء 20 بند يدوياً = 10 دقائق. المنافس يصورها بالموبايل وتُنشأ مسودة في ثوانٍ.

## النطاق

### يدخل
- رفع صورة/PDF فاتورة شراء في `/purchases/invoices/ocr` أو زر «قراءة فاتورة بالـ OCR» في قائمة الفواتير.
- استخراج المورد، رقم الفاتورة، التاريخ، الإجمالي قبل الضريبة، الضريبة، الإجمالي، العملة والبنود إن أعادها المزود.
- دعم عربي + إنجليزي عبر `languageHints: ['ar', 'en']` في محول المزود.
- معالجة الصفحة الأولى فقط من PDF متعدد الصفحات.
- واجهة مراجعة تعرض المستند والحقول وألوان الثقة: أخضر فوق 90%، أصفر من 70% إلى 90%، أحمر تحت 70%.
- إنشاء مسودة رأسية حتى قبل ربط البنود؛ ويمكن للمراجع ربط البنود بالأصناف قبل الحفظ.
- عزل كامل بـ RLS؛ لا يمر محتوى الملف عبر خادم API، بل يمرر العامل رابط تنزيل موقّعاً للمزود.

### لا يدخل
- تدريب نموذج خاص — المحول HTTP يقبل Google Document AI / AWS Textract / Azure أو خدمة داخلية متوافقة.
- ترحيل الفاتورة تلقائياً؛ OCR ينشئ مسودة فقط.

## التصميم التقني

### ترحيل 0097
```sql
ocr_jobs (
  id, tenant_id, file_id, entity_type, status,
  extracted jsonb, confidence numeric, provider, error,
  attempts, processed_at, draft_invoice_id, created_by
)
```

الحالات المسموحة: `queued | processing | done | failed`. الجدول مفعّل عليه `ENABLE + FORCE RLS`، وكل استعلام خدمة يمر عبر `withTenantTx`.

### API
- `POST /ocr/presign` — يتحقق من PDF/الصورة ويعيد رابط رفع إلى `files`.
- `POST /files/:id/finalize` — دورة الملفات المشتركة.
- `POST /ocr/jobs` `{ fileId, entityType: 'purchase_invoice' }` — ينشئ المهمة ويكتب outbox.
- `GET /ocr/jobs` و`GET /ocr/jobs/:id` — الحالة ونتيجة المراجعة ورابط المستند.
- `POST /purchases/invoices/from-ocr` — ينشئ مسودة، مع `branchId` وبيانات المراجع وبنود اختيارية.

### تدفق العامل
1. المستخدم يرفع المستند عبر `ocr/presign` ثم `PUT` ثم `files/:id/finalize`.
2. `POST /ocr/jobs` يكتب `ocr_jobs` وoutbox في المعاملة نفسها.
3. المهمة تستخدم طابور `maintenance` الحالي مع النوع `ocr.process`؛ لم نكسر عقد الطوابير الخمسة بإضافة طابور سادس.
4. العامل يطلب رابط تنزيل قصير العمر من `FilesService` ويمرره إلى `ConfiguredOcrProvider`.
5. المحول يرسل `firstPageOnly: true` و`languageHints` ويعيد JSON؛ `normaliseOcrPayload` هو حد التوافق للعربية/الإنجليزية والمزودين.
6. الواجهة تستطلع كل ثانيتين وتعرض اللون والثقة، ثم ينشئ المراجع مسودة غير مرحّلة.

### إعداد المزود
- `ocr.provider` (`http` أو `mock`) و`ocr.endpoint` إعدادان في إعدادات المنصة.
- `OCR_API_KEY` سر نشر من environment ولا يظهر في شاشة الإعدادات ولا يدخل payload المهمة.
- `mock` محول ثابت للاختبار/التحقق؛ الإنتاج يجب أن يضبط endpoint حقيقياً.

### UI
- `apps/staff/app/purchases/invoices/ocr/page.tsx`: رفع، استطلاع، معاينة، حقول الثقة وربط البنود.
- `apps/staff/app/purchases/invoices/page.tsx`: زر الدخول إلى المراجعة.

### صلاحيات
- `purchase.ocr.use` جديدة، مزروعة في migration 0097 ومضافة إلى أدوار `purchase_manager` و`purchase_user`.
- إنشاء المسودة يتطلب أيضاً `purchase.invoice.create`.

## معايير القبول
- [x] اختبار `apps/api/src/modules/ocr/ocr.spec.ts` بست حالات mock: عربي/إنجليزي، الصفحة الأولى، الأرقام والتاريخ، البنود، ألوان الثقة، والحقول المفقودة.
- [x] `scripts/verify-ocr.mjs` يتحقق من 10+ نقاط عبر presign → PUT → finalize → job → polling → result، مع تنظيف الملف.
- [x] ثقة أقل من 70% تُظهر اللون الأحمر، و70–90% أصفر، وفوق 90% أخضر.
- [x] PDF متعدد الصفحات يمرر الصفحة الأولى فقط إلى المحول ولا يخلط حقول الصفحة الثانية.
- [x] مسار header-only واضح: يكتب مسودة رأس بالقيم المستخرجة، ولا يسمح بترحيل مسودة ناقصة دون مراجعة البنود/المستودع حسب قواعد المشتريات الحالية.
- [ ] دقة عربية فعلية ≥80% — تعتمد على endpoint OCR خارجي مضبوط في بيئة النشر، ولا يُدّعى نجاحها بمحَوّل `mock`.

## التشغيل
```bash
# بعد تشغيل API والتخزين، وباختيار mock صراحةً لعدم الاتصال بمزود خارجي:
OCR_PROVIDER=mock node scripts/verify-ocr.mjs
```

## الجهد والتكلفة
- Backend: محول + طابور + API + RLS.
- Frontend: رفع + مراجعة + ربط أصناف.
- تكلفة المزود الفعلية تعتمد على Document AI/Textract/Azure؛ لا يفرض ERPCloud مزوداً بعينه.

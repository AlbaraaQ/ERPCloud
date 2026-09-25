# 02 — مسح الفواتير الذكي OCR

> الأولوية: P1 - 1 أسبوع
> السوق: Expensify / Dext / قيود (مسح الفاتورة)
> الحالة: **شريحة المراجعة والمسودة مكتملة** — migration 0097، API، طابور، واجهة Staff، اختبارات وسكربت تحقق حي. مزوّد OCR تجاري حقيقي مؤجّل خلف منفذ provider.

## المشكلة
إدخال فاتورة شراء 20 بند يدوياً = 10 دقائق. المنافس يصورها بالموبايل وتُنشأ مسودة في ثوانٍ.

## النطاق المنفّذ

### يدخل
- رفع PDF أو صورة من `/purchases/invoices/new` عبر زر `📷 قراءة فاتورة من ملف`.
- دورة الملفات الآمنة: `POST /ocr/presign` ثم PUT مباشر إلى التخزين ثم `/files/:id/finalize`.
- جدول `ocr_jobs` مع `tenant_id`, `file_id`, `entity_type`, `status`, `extracted`, `confidence`, `created_by`، وحالة/خطأ المزود.
- API للمهمة: إنشاء، قراءة الحالة والنتيجة، وإنشاء مسودة من نتيجة OCR.
- استخراج mock حتمي لرأس الفاتورة: المورد، رقم الفاتورة، التاريخ، الإجمالي، الضريبة، العملة، والإجمالي قبل الضريبة عند وجوده.
- مراجعة قابلة للتعديل مع ثقة لكل حقل: أخضر ≥85%، أصفر ≥60%، أحمر <60%.
- دعم نصوص fixture بالعربية والإنجليزية، وأرقام عربية-هندية، وملفات `image/*` و`application/pdf` عند presign.
- إنشاء **مسودة رأسية بلا بنود** عند عدم اكتمال ربط الأصناف؛ لا يخترع النظام `itemId` من نص غير موثوق. ويمكن إرسال بنود راجعها المستخدم في نفس الطلب.
- صلاحية `purchase.ocr.use` مع فحص `tenant.file.upload` عند إصدار presign.

### لا يدخل في هذه الشريحة
- تدريب نموذج خاص.
- تخزين مفاتيح مزود OCR في `platform_settings` أو إرسالها إلى الطابور.
- الاتصال التجاري الفعلي بـ Google Document AI / AWS Textract / Azure؛ نقطة التكامل موجودة في `OcrProvider`، والمزوّد الحالي `MockOcrProvider` صريح ومحدد للاختبار والتطوير.
- المطابقة التلقائية للبنود مع أصناف المخزون أو الترحيل المحاسبي؛ ربط البنود يظل قرار مراجعة.

## التصميم التقني

### ترحيل 0097

`packages/database/migrations/0097_ocr_purchase_invoices.sql` ينشئ:

```sql
ocr_jobs (
  id, tenant_id, file_id,
  entity_type, -- purchase_invoice | expense
  status,      -- queued | processing | done | failed
  extracted jsonb,
  confidence numeric,
  provider text,
  error text,
  input_hint text, -- fixture text للـmock فقط، يُمسح بعد النجاح
  created_by, created_at, started_at, completed_at
)
```

الجدول محمي بـRLS و`FORCE ROW LEVEL SECURITY`، ومضاف إلى `rlsProtectedTables`. ملف المصدر يبقى في جدول `files` ولا يُنسخ إلى `ocr_jobs`.

### API

- `POST /ocr/presign` — `{ name, mime, sizeBytes }`، يقبل PDF/صورة ويعيد `fileId` ورابط الرفع.
- `POST /ocr/jobs` — `{ fileId, entityType, sourceText? }`؛ `sourceText` fixture اختياري للمزوّد mock فقط.
- `GET /ocr/jobs/:id` — حالة المهمة والحقول المستخرجة والثقة.
- `POST /purchases/invoices/from-ocr` — `{ ocrJobId, branchId, partyId?, supplierName?, subtotal?, taxTotal?, total?, costCenterId?, lines? }`؛ القيم المراجعة للضريبة/الإجمالي تتغلب على الاستخراج، وإذا كانت `lines` فارغة ينشئ مسودة رأسية totals/ref/date فقط، وإذا أرسل المستخدم بنوداً يمررها إلى إنشاء فاتورة الشراء المعتاد.

كل المسارات محمية بـ`purchase.ocr.use`، ومسار الإنشاء من OCR يتطلب أيضاً `purchase.invoice.create`.

### الطابور والتدفق

1. المستخدم يختار PDF/صورة؛ API يحجز صف `files` بحالة `pending`.
2. المتصفح يرفع البايتات مباشرة إلى object storage ثم يستدعي `finalize`.
3. `POST /ocr/jobs` يكتب `ocr_jobs` و`outbox_jobs` في معاملة واحدة.
4. لا نضيف طابوراً سادساً: قائمة الطوابير مجمّدة؛ نوع المهمة `ocr.process` يعمل على `maintenance`.
5. العامل يسجل المهمة `queued → processing → done|failed` ويحسب confidence من الحقول. في تثبيت التطوير بلا Redis، يفحص API `queue.ping()` ويشغّل mock فوراً بدلاً من ترك الشاشة عالقة في `queued`؛ يبقى صف outbox دليلاً قابلاً لإعادة التسليم.
6. الشاشة تستطلع الحالة، تفتح الملف من رابط download الموقّع، وتضع المرجع/التاريخ في نموذج الفاتورة. الحقول المستخرجة للإجمالي والضريبة قابلة للتعديل للمراجعة، بينما البنود لا تُنشأ تلقائياً.

### UI

- الزر ولوحة `مراجعة الاستخراج` موجودان في `apps/staff/app/purchases/invoices/new/page.tsx`.
- اللوحة تعرض رابط الملف، provider/status، الحقول القابلة للتعديل، نسبة الثقة لكل حقل، وعدد البنود النصية إن وجد.
- لا توجد شاشة إعداد مزود تجاري في هذه الشريحة؛ هذا مقصود إلى حين اعتماد secret storage/منفذ إعداد المنصة.

### صلاحيات

- `purchase.ocr.use` مضافة إلى `packages/contracts/src/permissions.ts` وإلى seed idempotent داخل migration 0097.

## الاختبارات ومعايير القبول

- [x] `apps/api/src/modules/ocr/ocr.provider.spec.ts` — **6 حالات mock**: إنجليزي، عربي وأرقام عربية، JSON fixture، بنود اختيارية، confidence جزئي، ومستند غير مقروء.
- [x] `scripts/verify-ocr.mjs` — **10/10 نقاط** عبر HTTP: login، presign، finalize، job done، الحقول والثقة، GET بالمعرّف، العربية، رفض MIME، ومسودة رأسية بلا بنود. ينظف invoice/job/file/party عبر اتصال migrator.
- [x] RLS/schema tests وAPI build/lint وStaff build.
- [x] صورة/PDF مسموحان عند presign، والنص العربي/الإنجليزي يعمل في mock fixture.
- [ ] مزوّد تجاري فعلي يقرأ pixels ويطبق معالجة الصفحة الأولى في PDF متعدد الصفحات — مؤجّل صراحةً إلى قرار provider/secret storage. لذلك لا نعلن دقة OCR حقيقية للصورة قبل تركيب ذلك المزوّد؛ عتبة ≥80% الحالية مغطاة باختبار fixture لا بادعاء دقة نموذج خارجي.

## الجهد المتبقي

- **منفّذ:** backend 3 أيام (migration + API + outbox handler + mock provider)، frontend يومان (رفع + مراجعة)، واختبارات/تحقق حي.
- **متبقٍ اختيارياً:** adapter تجاري واحد، secret platform setting، تنزيل bytes للمعالج، واختبار عينات حقيقية عربية/إنجليزية قبل تفعيل provider في الإنتاج.
- **التكلفة:** لا توجد تكلفة خارجية مع mock؛ تكلفة Google/Textract/Azure تُقاس بعد اختيار المزود، لا تُفترض في هذه الشريحة.

## ملاحظة سوق
قيود تبيع هذه الميزة بـ99 ريال إضافي شهرياً — يمكن أن تكون باقة Pro بعد قياس تكلفة المزود التجاري الفعلي.

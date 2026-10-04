# 02 — Root Causes

الأسباب الجذرية، كلٌّ منها بكيفية إعادة إنتاجه. **كل استدلالٍ هنا قابل للتحقق**:
شغّل PostgreSQL المحلي، وطبّق الترحيلات، وابذر، وشغّل الـ API، ثم نفّذ الأوامر.

## إعداد بيئة الإنتاج (مرة واحدة)

```bash
pnpm env:setup          # يكتب .env بمفاتيح RS256 و AES-256-GCM وكلمات البذرة
pnpm db:local           # PostgreSQL 16 مضمّن بلا Docker — يبقى يعمل في المقدّمة
pnpm db:roles           # ينشئ erp_api / erp_migrator
pnpm db:migrate         # 112 ترحيلًا
pnpm db:seed            # ينشئ المستأجر demo والمستخدمين
pnpm --dir apps/api run start    # الـ API على :3000
```

> `pnpm db:local` هو الطريق الصحيح في بيئة بلا Docker. الـ API يتطلّب Redis أيضًا
> في بعض المسارات؛ ما دامت الاختبارات الأساسية تعمل بـ curl فغيابه غير مانع.

## RC-1 — المستأجر `demo` بلا اشتراك نشط، فكل رايات الوحدات مطفأة

**الأثر:** هذا **السبب الجذري الأول**. كل شاشة محميّةٌ براية وحدة تُعيد 404، فيظنّ
المستخدم أن الشاشة مفقودة. وهذا يفسّر مجتمعًا: فشل POS، والشاشات التي "لا تفتح".

**الدليل:**

```
GET /api/v1/billing/subscription  → 200 {"data":null}
GET /api/v1/settings              → 200 ... "feature.pos": false
                                        "feature.projects": false
                                        "feature.hrm": false
                                        "feature.niche": false
GET /api/v1/pos/settings          → 404 "POS pack is disabled for this tenant"
```

**السبب التقني:** `packages/database/src/seed-demo.ts:219` يضع `feature.pos: true`
ضمن **حقوق الخطة الاحترافية**، لكن ذلك لا يُطبَّق على جدول `tenant_settings` أبدًا.
تفعيل الاشتراك (`reviewActivation`) يُدخل صفًّا في `tenant_subscriptions` ولا يكتب
حقوقه في `tenant_settings`. فالمستأجر بلا اشتراك ⇒ كل الرايات `false`.

**الإصلاح:** عند تفعيل الاشتراك (يدويًّا أو عبر webhook) يجب **مزامنة الحقوق** مع
`tenant_settings`. وهذا تغيير في `apps/api` + `packages/database`.

## RC-2 — `throw new Error` في خدمة الفوترة يُنتج 500 بدل 403

**الأثر:** شاشة الترخيص معطّلة تمامًا لأي مستأجر عادي.

**الدليل (من سجل الـ API):**

```json
{"level":50,"context":"AllExceptionsFilter","code":"INTERNAL",
 "err":{"message":"Platform administrator access required",
        "stack":"Error: Platform administrator access required\n    at BillingService.listActivationRequests (.../billing.service.ts:47:15)"},
 "statusCode":500}
```

**السبب:** `apps/api/src/modules/platform/billing/billing.service.ts:47` يرمي
`Error` عاديًّا. الـ `AllExceptionsFilter` لا يعرف كيف يصنّفه، فيُعيد 500.
الموضعان المتأثران: `listActivationRequests` و`reviewActivation`.

**الإصلاح:** `DomainError('FORBIDDEN', …, 403)` — نفس النمط المستخدم في بقيّة
المشروع. تصحيح صغير، لكنه يحوّل "شاشة لا تعمل" إلى "شاشة ترفض بأدب".

## RC-3 — لا طرف «عميل عام» ولا «مورد عام» في البذرة

**الأثر:** دفتر الطرفين فارغ؛ POS بلا عميل افتراضي؛ ولا يمكن اختبار قاعدة
الفاتورة المبوّسة/القياسية لأن لا مشتري له رقم ضريبي أو يفتقده.

**الدليل:** `GET /api/v1/parties?limit=3 → 200 []`

**الإصلاح:** بذرةٌ تُنشئ طرفين نظاميَّين لكل مستأجر (أو لكل فرع): «عميل عام»
بلا رقم ضريبي، و«مورد عام». وواجهةٌ في POS تربط وضع "عميل نقدي" بهما عبر `partyId`
لا عبر `cashCustomerName` النصّي.

## RC-4 — منطق الفاتورة المبوّسة/القياسية سليم؛ الناقص هو الطرف

**الأثر:** البند 6 من قائمة المOwner منجزٌ في الخادم؛ ما يبدو ناقصًا هو أثر RC-3.

**الدليل:** `apps/api/src/modules/einvoicing/einvoicing.service.ts:492`

```ts
const profile: 'standard' | 'simplified' = buyer?.vatNo ? 'standard' : 'simplified';
```

**الخلاصة:** لا تغيير هنا. بعد RC-3 يصبح السلوك صحيحًا تلقائيًّا.

## RC-5 — لا endpoint لاستعادة كلمة السر

**الأثر:** لا يمكن لعميل نسى كلمته أن يستعيدها. **مانع نشر** لنظام متعدد المستأجرين.

**الدليل:** مسارات المصادحة المتاحة فقط:
`POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
`POST /auth/change-password`، و MFA: `enroll`, `enable`, `disable`.

**الإصلاح:** `POST /auth/forgot-password` + `POST /auth/reset-password` + جدول رموز
منتهية الصلاحية + قالب بريد. عمل خادم كامل، يحتاج CR لأنه endpoint جديد.

## RC-6 — `feature.*` مكتوبة في `tenant_settings` بلا آلية تمكين من الخطة

**الأثر:** لو فُعِّل اشتراك يدويًّا الآن، ستظل الشاشات تُعيد 404. هذا RC-1 من زاوية
الآلية: البذرة تكتب الرايات، لكن **لا شيء يُزامنها**.

**الإصلاح:** دالة `applyEntitlements(tenantId, planId)` تُستدعى من
`reviewActivation` ومن `handleStripeWebhook`، تكتب `tenant_settings` من `plan_entitlements`.

## RC-7 — صفحات «عن البرنامج» و«تحديث البرنامج» (مفهوم مكتبي)

**الأثر:** انطباع بأن المنتج برنامج يُثبَّت. يضرّ بمصداقية نظام سحابي.

**الدليل:** `apps/staff/app/support/about/page.tsx` — قسم «تحديث البرنامج» يقول حرفيًّا
«أعد تحميل الصفحة للحصول على آخر إصدار».

**الإصلاح:** حذف القسمين من الشاشة، أو حذف الشاشة كلها ونقل «حالة التنفيذ» إلى لوحة
التحكم. **يحتاج قرار المالك** (حذف شاشة = CR).

## RC-8 — الإشعارات فارغة لأن البذرة لا تكتب إشعارات

**الأثر:** مركز الإشعارات يفتح وفاضٍ. إن كان المالك يرى انهيارًا فسببه في المتصفح
ويحتاج فحصًا حيًّا.

**الدليل:** `GET /api/v1/notifications?limit=5 → 200 {"data":[]}`

**الإصلاح:** البذرة تكتب إشعارات للمستخدمين (ترحيب، تنبيه ميزانية، إعلان). وإذا كان
الانهيار متصفحيًًا فيُفحص بـ DevTools على `/notifications`.

## RC-9 — «طلب المساعدة» صفحة ثابتة بلا endpoint

**الدليل:** `apps/staff/app/support/help/page.tsx` (56 سطرًا) — لا نداء واحد لأي مسار.

**الإصلاح:** إما ربطها بنموذج تواصل حقيقي (`POST /leads` موجود في الـ API)، أو
تحويلها إلى مركز مساعدة ثابت صريح. **يحتاج قرار المالك.**

## RC-10 — `resend` غير مدعوم كمزوّد بريد

**الدليل:** `GET /api/v1/email/settings → "provider":"console"` — والمزوّد المدعوم
الوحيد المُعاد هو `console`.

**الإصلاح:** إضافة `resend` إلى `apps/api/src/modules/email/` (مزوّد + إعدادات +
اختبار إرسال)، وإلى واجهتي الإعدادات في staff و platform-admin.

## RC-11 — المساعد AI مُفعَّل بلا مزوّد

**الدليل:** `GET /api/v1/ai/settings → {"enabled":true,"provider":null}` مع أن
`PUT /ai/settings` مسجَّل ويعمل.

**الإصلاح:** حقل مفتاح المزوّد في النموذج، مشفَّرًا عبر `secret-box.ts` الموجود،
وربط الحالة بـ `provider` حتى لا يظهر «مُفعَّل» بلا مزوّد.

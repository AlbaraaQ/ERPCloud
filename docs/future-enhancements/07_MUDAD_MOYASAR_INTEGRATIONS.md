# 07 — تكامل مدد + ميسر + التأمينات

> الأولوية: P2 - 2 أسبوع
> السوق: قيود + جسر — ميزة HR قاتلة في السعودية

## المشكلة
الرواتب اليوم تحسب في HRM لكن رفعها لمدد يدوي. الدفع للعملاء برابط يدوي.

## النطاق

### أ. مدد (Mudad)
- تصدير ملف حماية أجور WPS بصيغة بنك (CSV معتمد)
- API مدد إن توفر (حالياً ملف) — نبدأ بتصدير + رفع يدوي + تتبع حالة
- جدول `payroll_wps_files` (id, payroll_run_id, file_id, status, bank_response)
- شاشة `/hrm/payroll/[id]/wps` — تصدير + تحميل + حالة

### ب. التأمينات الاجتماعية GOSI
- تصدير ملف تأمينات (موظفون + أجور)
- تنبيهات انتهاء إقامة/تأمين

### ج. ميسر / HyperPay / Tap
- إنشاء رابط دفع لفواتير المبيعات: `POST /payments/links` { invoice_id, amount, provider }
- جدول `payment_links` (id, invoice_id, provider, link_url, status: pending|paid|expired, external_id)
- Webhook يستقبل دفع → ينشئ سند قبض تلقائياً
- شاشة `/sales/invoices/[id]` زر `💳 إنشاء رابط دفع`
- بوابة العميل `/portal/invoices/[id]/pay` — يدفع

### لا يدخل
- API مباشر مع مدد (يحتاج اعتماد) — نبدأ ملف
- دفع رواتب عبر ميسر — مرحلة ثانية

## التصميم التقني

### ترحيل 0101
```sql
payroll_wps_files (id, tenant_id, payroll_run_id, file_id, bank_code, status, created_at)
payment_links (id, tenant_id, invoice_id, provider, amount, currency, link_url, external_id, status, paid_at, payload jsonb)
payment_provider_configs (id, tenant_id, provider, api_key_enc, is_active)
```

### API
- `GET /hrm/payroll/:id/wps-preview` — يعرض ملف WPS قبل التصدير
- `POST /hrm/payroll/:id/wps-export` → ينشئ CSV + file_id
- `POST /payments/providers` { provider, apiKey } — ربط ميسر
- `POST /payments/links` { invoice_id, provider } → ينشئ رابط عبر Moyasar API
- `POST /payments/webhooks/:provider` — يستقبل دفع
- `GET /payments/links?invoice_id=`

### تدفق ميسر
1. ربط ميسر في `/settings/payments`
2. فاتورة مبيعات → زر `إنشاء رابط دفع` → ينادي Moyasar `POST /v1/invoices` → يرجع link
3. إرسال الرابط للعميل واتساب/إيميل
4. العميل يدفع → ميسر يرسل webhook → نتحقق توقيع → ننشئ `vouchers` قبض + نربط بالفاتورة + نرسل إشعار

### UI
- `/hrm/payroll` زر `تصدير حماية أجور`
- `/settings/payments` — بطاقات مزودين
- في الفاتورة: قسم `روابط الدفع` + حالة
- بوابة العميل: صفحة دفع جميلة مع شعار المنشأة

### صلاحيات
- `payroll.wps.export` + `payments.links.manage`

## معايير القبول
- [ ] تصدير WPS لـ 10 موظفين → ملف CSV بصيغة معتمدة
- [ ] إنشاء رابط ميسر → دفع تجريبي → سند قبض ينشأ تلقائياً
- [ ] انتهاء إقامة موظف خلال 30 يوم → تنبيه في لوحة HRM
- [ ] اختبار `mudad-moyasar.spec.ts` 8 حالات mock
- [ ] `verify-mudad-moyasar.mjs` 12 نقطة

## الجهد
- Backend: 5 أيام (WPS + ميسر + webhooks)
- Frontend: 3 أيام

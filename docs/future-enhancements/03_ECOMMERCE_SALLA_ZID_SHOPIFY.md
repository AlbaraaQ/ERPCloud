# 03 — تكامل المتاجر الإلكترونية (سلة / زد / شوبيفاي)

> الأولوية: P1 - 2 أسبوع — **أعلى ROI في السعودية**
> السوق: كل منافس سعودي يملكها

## المشكلة
50% من عملاء ERP في السعودية يبيعون أونلاين. اليوم يدخلون الطلبات يدوياً مرتين (في سلة وفي ERP). المنافس يزامن تلقائياً.

## النطاق

### يدخل
- ربط متجر سلة/زد/شوبيفاي بـ OAuth / API Key
- جدول `ecommerce_stores` (id, tenant_id, provider: salla|zid|shopify, access_token_encrypted, status, last_sync_at)
- جدول `ecommerce_orders` (id, store_id, remote_id, order_no, status, payload: jsonb, erp_invoice_id)
- مزامنة: طلب جديد في المتجر → فاتورة مبيعات مسودة + حجز مخزون + عميل جديد إن لزم
- مزامنة مخزون: عند بيع في ERP → حدث stock → يحدث المخزون في المتجر
- شاشة `/settings/ecommerce` — ربط + حالة + سجل مزامنة
- شاشة `/sales/ecommerce-orders` — طلبات المتجر مع حالة المزامنة

### لا يدخل
- مزامنة منتجات كاملة بمتغيرات معقدة — نبدأ بطلبات فقط + مخزون بسيط
- إرجاع — مرحلة ثانية

## التصميم التقني

### ترحيل 0098
```sql
ecommerce_stores (id, tenant_id, provider, store_url, access_token_enc, refresh_token_enc, status: active|error, settings: jsonb)
ecommerce_orders (id, tenant_id, store_id, remote_id unique, remote_order_no, status: pending|imported|failed, payload, erp_invoice_id, error)
ecommerce_sync_logs (id, store_id, direction: in|out, entity: order|stock, status, message)
```

### API
- `GET /ecommerce/providers` — قائمة (salla, zid, shopify)
- `POST /ecommerce/stores` { provider, apiKey|code } — يربط
- `POST /ecommerce/stores/:id/sync` — مزامنة يدوية
- `POST /ecommerce/webhooks/:provider` — يستقبل webhook من سلة/زد (تحقق توقيع)
- `GET /ecommerce/orders?store_id=&status=`

### تدفق سلة (مثال)
1. تاجر يدخل `/settings/ecommerce` → يختار سلة → يدخل API Key (من لوحة سلة)
2. `POST /ecommerce/stores` → يختبر الاتصال `GET /api/v1/store/info` → يحفظ مشفر
3. سلة ترسل webhook `order.created` → `POST /ecommerce/webhooks/salla` → يتحقق توقيع → ينشئ `ecommerce_orders pending`
4. عامل `ecommerce-import` → يقرأ payload → ينشئ/يجد عميل → ينشئ فاتورة مبيعات مسودة → يربط
5. عند ترحيل فاتورة في ERP → عامل `ecommerce-stock` → ينقص المخزون في سلة `PUT /products/:id/quantity`

### أمان
- التوكن مشفر AES-256-GCM بمفتاح من `platform_settings.ecommerce_encryption_key`
- Webhook يتحقق من `X-Salla-Signature` / `X-Zid-Signature`

### UI
- `/settings/ecommerce` — بطاقات متاجر + زر ربط + حالة + آخر مزامنة
- `/sales/ecommerce-orders` — جدول طلبات مع أيقونة سلة/زد + حالة + رابط فاتورة ERP
- تسميات: "متجري في سلة" "مزامنة الطلبات"

### صلاحيات
- `ecommerce.manage` جديدة

## معايير القبول
- [ ] ربط متجر سلة تجريبي → جلب 5 طلبات
- [ ] طلب جديد في سلة → يظهر فاتورة مسودة في ERP خلال 60 ثانية
- [ ] بيع في ERP → ينقص المخزون في سلة
- [ ] فشل توكن → حالة error + تنبيه
- [ ] اختبار `ecommerce.spec.ts` 10 حالات mock
- [ ] `verify-ecommerce.mjs` 15 نقطة

## الجهد
- Backend: 6 أيام (3 مزودين + webhooks + عاملين)
- Frontend: 3 أيام
- اختبار مع سلة sandbox: 1 يوم

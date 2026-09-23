# 13 — سوق الإضافات + White-label بدومين خاص

> الأولوية: P3 - 3 أسابيع
> السوق: Shopify App Store / Odoo Apps — يمنع Churn ويزيد LTV

## المشكلة
العميل يطلب تخصيص صغير → نعدل كود أساسي → يصعب التحديث. الحل: إضافات معزولة.

## النطاق

### أ. سوق إضافات
- جدول `marketplace_apps` (id, code, name_ar, description, version, price_monthly, is_active, config_schema: jsonb)
- جدول `tenant_apps` (tenant_id, app_code, is_enabled, settings: jsonb, installed_at)
- API لتسجيل إضافة: كل إضافة هي module NestJS + شاشة staff اختيارية
- شاشة `/settings/marketplace` — متجر إضافات (تفعيل/إيقاف)
- أمثلة إضافات: سلة، زد، ميسر، OCR، توقيع، WMS

### ب. White-label
- دومين مخصص: `erp.customer.com` → يقرأ tenant من Host header
- جدول `tenant_domains` (id, tenant_id, domain, status: pending|active, ssl_status)
- شعار وألوان مخصصة لكل مستأجر (موجود جزئياً في `tenant_settings`)
- إعداد DNS + Let's Encrypt تلقائي (أو يدوي في البداية)
- شاشة `/settings/white-label` — رفع شعار + ألوان + دومين

### لا يدخل
- كود إضافات من طرف ثالث غير مراجع — نبدأ بإضافاتنا فقط
- SSL تلقائي كامل — نبدأ يدوي + توثيق

## التصميم التقني

### ترحيل 0107
```sql
marketplace_apps (id, code unique, name_ar, name_en, description_ar, icon, version, price_monthly, is_core, config_schema jsonb)
tenant_apps (tenant_id, app_code, is_enabled, settings jsonb, installed_at, unique(tenant_id,app_code))
tenant_domains (id, tenant_id, domain unique, status, ssl_status, verified_at)
tenant_branding (tenant_id, logo_file_id, primary_color, secondary_color, favicon_file_id)
```

### API
- `GET /marketplace/apps` — قائمة متاحة
- `POST /marketplace/apps/:code/install` — يفعل لمستأجر
- `DELETE /marketplace/apps/:code` — إلغاء
- `GET/POST /settings/white-label/domains` — إضافة دومين
- `POST /settings/white-label/domains/:id/verify` — يتحقق DNS TXT
- `GET/PUT /settings/white-label/branding`

### محرك الإضافات
- كل إضافة: `apps/api/src/modules/<app>/` + `apps/staff/app/<app>/` + ترحيل خاص
- عند تفعيل: يشغل ترحيل الإضافة + يسجل permissions + يظهر في navigation
- عند إيقاف: يخفي navigation لكن لا يحذف بيانات

### White-label تدفق
1. عميل يدخل `/settings/white-label` → يدخل `erp.company.com` → نعطيه TXT للتحقق
2. يضيف CNAME → `verify` → يتحقق DNS → status active
3. Nginx/Traefik يقرأ Host → يمرر `x-tenant-domain` → middleware يحل tenant_id من domain
4. شعار وألوان من `tenant_branding` تظهر في staff + portal + فواتير

### UI
- `/settings/marketplace` — شبكة إضافات مع أيقونات + سعر + زر تفعيل
- `/settings/white-label` — تبويب شعار/ألوان + تبويب دومينات
- `/platform/marketplace` — إدارة إضافات من المنصة (إنشاء + تسعير)

### صلاحيات
- `marketplace.manage` (منصة) + `tenant.apps.manage` (مستأجر)

## معايير القبول
- [ ] تفعيل إضافة سلة → تظهر شاشة `/settings/ecommerce`، إيقاف → تختفي
- [ ] إضافة دومين + تحقق TXT → يعمل
- [ ] شعار مخصص يظهر في الفاتورة المطبوعة
- [ ] اختبار `marketplace.spec.ts` 8 حالات

## الجهد
- Backend: 7 أيام (سوق + دومينات + branding)
- Frontend: 5 أيام
- DevOps: 2 يوم (Nginx + SSL)

## تسعير مقترح
- إضافات مدفوعة: سلة 49 ريال، ميسر 29، OCR 99 — تزيد MRR.

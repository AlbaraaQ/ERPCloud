# 14 — CRM متقدم + واتساب وتتبع

> الأولوية: P3 - 2.5 أسبوع
> السوق: Zoho CRM / HubSpot — مطلوب لفريق المبيعات

## المشكلة
عندك عملاء وفواتير لكن لا يوجد Pipeline مبيعات، ولا تتبع مكالمات/واتساب.

## النطاق

### يدخل
- جدول `crm_pipelines` (id, tenant_id, name, stages: jsonb [{ id, name, color, order }])
- جدول `crm_deals` (id, tenant_id, pipeline_id, stage_id, party_id, title, amount, probability, expected_close, owner_id, status: open|won|lost)
- جدول `crm_activities` (id, deal_id, type: call|meeting|whatsapp|email|note, description, at, user_id)
- تكامل واتساب: إرسال رسالة من صفقة + تسجيل رد webhook
- شاشة `/crm/pipelines` — Kanban سحب وإفلات للصفقات
- شاشة `/crm/deals/[id]` — تفاصيل + أنشطة + ملفات
- شاشة `/crm/activities` — سجل كل الأنشطة
- تنبؤ مبيعات: مجموع * احتمال

### لا يدخل
- تتبع إيميل فتح/نقر — مرحلة ثانية
- اتصال هاتفي مباشر — نبدأ تسجيل يدوي

## التصميم التقني

### ترحيل 0108
```sql
crm_pipelines (id, tenant_id, name, stages jsonb, is_default)
crm_deals (id, tenant_id, pipeline_id, stage_id, party_id, title, amount, probability int, expected_close date, owner_id, status, lost_reason, created_at)
crm_activities (id, tenant_id, deal_id, party_id, type, subject, description, at, user_id, meta jsonb)
crm_whatsapp_templates (id, tenant_id, name, body, variables jsonb)
```

### API
- `GET/POST /crm/pipelines`
- `GET/POST /crm/deals?pipeline_id=&stage_id=&owner_id=`
- `PUT /crm/deals/:id/move` { stage_id } — سحب Kanban
- `POST /crm/deals/:id/activities` { type, description }
- `POST /crm/deals/:id/whatsapp` { template_id, message } — يرسل عبر واتساب مزود
- `GET /crm/forecast` — تنبؤ حسب المراحل
- `POST /crm/webhooks/whatsapp` — يستقبل رد

### تدفق واتساب
1. صفقة → زر `واتساب` → يختار قالب `مرحبا {name} بخصوص {deal}` → يرسل عبر `whatsapp` module الموجود (R11)
2. العميل يرد → webhook → ينشئ `crm_activities` type whatsapp inbound
3. يظهر في بطاقة الصفقة كمحادثة

### UI
- `/crm/pipelines` — Kanban أعمدة = مراحل، بطاقات = صفقات، سحب لتغيير مرحلة + مبلغ إجمالي لكل عمود
- `/crm/deals/[id]` — رأس + أنشطة Timeline + ملفات + زر واتساب/مكالمة/مهمة
- `/crm/forecast` — رسم تنبؤ + جدول
- `/crm/activities` — Timeline كل الأنشطة

### صلاحيات
- `crm.deals.view|manage` + `crm.activities.manage`

## معايير القبول
- [ ] إنشاء pipeline 4 مراحل → إنشاء صفقة → سحبها لمرحلة ثانية → يتغير stage
- [ ] إرسال واتساب من صفقة → يظهر في الأنشطة
- [ ] تنبؤ = مجموع (amount * probability)
- [ ] اختبار `crm.spec.ts` 10 حالات

## الجهد
- Backend: 5 أيام (pipeline + deals + أنشطة + واتساب)
- Frontend: 5 أيام (Kanban + تفاصيل + تنبؤ)

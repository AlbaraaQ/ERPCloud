# 12 — لوحة مؤشرات BI قابلة للسحب (KPI Builder)

> الأولوية: P2 - 2 أسبوع
> السوق: NetSuite SuiteAnalytics / Zoho Analytics

## المشكلة
لوحة التحكم اليوم ثابتة (KPI ثابتة). كل مدير يريد لوحته الخاصة.

## النطاق

### يدخل
- جدول `dashboards` (id, tenant_id, user_id?, name, is_default, layout: jsonb)
- جدول `dashboard_widgets` (id, dashboard_id, type: kpi|chart|table|list, config: jsonb { report_key, filters, chart_type, refresh_interval }, position: jsonb { x,y,w,h })
- مكتبة ويدجتس جاهزة: مبيعات اليوم، عملاء متأخرون، أصناف ستنفد، تدفق نقدي، حضور، إلخ (20 ويدجت)
- محرر سحب وإفلات (GridStack أو dnd-kit)
- شاشة `/dashboards` — قائمة لوحات + منشئ
- شاشة `/` الرئيسية تصبح لوحة قابلة للتخصيص لكل مستخدم

### لا يدخل
- SQL مباشر من المستخدم — خطر، نستخدم تقارير موجودة فقط
- مشاركة لوحة بين مستأجرين — كل مستأجر لوحاته

## التصميم التقني

### ترحيل 0106
```sql
dashboards (id, tenant_id, user_id, name, is_default, layout jsonb, created_at)
dashboard_widgets (id, dashboard_id, type, title, config jsonb, position jsonb)
```

### API
- `GET/POST /dashboards`
- `POST /dashboards/:id/widgets` { type, config, position }
- `PUT /dashboards/:id/layout` { widgets: [{ id, position }] } — حفظ بعد سحب
- `GET /dashboards/:id/data` — يجيب بيانات كل ويدجت (ينادي التقارير)
- `GET /dashboards/widgets/catalog` — قائمة ويدجتس متاحة

### أنواع ويدجت
- `kpi`: { report: 'sales-summary', field: 'total', period: 'today', comparison: 'yesterday' }
- `chart`: { report: 'sales-chart', chart_type: 'bar|line|pie', group_by: 'branch' }
- `table`: { report: 'low-stock', limit: 5 }
- `list`: { report: 'overdue-invoices', limit: 5 }

### UI
- `/dashboards` — قائمة لوحات + زر `+ لوحة`
- `/dashboards/[id]` — شبكة قابلة للسحب، زر `+ ويدجت` يفتح كتالوج، كل ويدجت له `...` إعدادات + تحديث
- `/` — يعرض اللوحة الافتراضية للمستخدم
- تصدير لوحة PDF

### أداء
- كل ويدجت يخزن cache 5 دقائق في Redis `dashboard:widget:{id}:data`
- تحديث خلفية عبر طابور

## معايير القبول
- [ ] إنشاء لوحة + إضافة 3 ويدجتس + سحبها → يحفظ الترتيب
- [ ] ويدجت KPI يعرض رقم حقيقي + مقارنة
- [ ] لوحة افتراضية لكل مستخدم
- [ ] تصدير PDF
- [ ] اختبار `bi-dashboard.spec.ts` 8 حالات

## الجهد
- Backend: 4 أيام (لوحات + ويدجتس + cache)
- Frontend: 5 أيام (سحب وإفلات + كتالوج + رسوم)

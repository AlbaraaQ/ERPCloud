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
0106 مستخدم للمستودعات و0107 لبوابة الموردين، لذلك الترحيل الفعلي هو `0108_bi_dashboards.sql`.
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
- [x] إنشاء لوحة + إضافة 3 ويدجتس + سحبها → يحفظ الترتيب
- [x] ويدجت KPI يعرض رقم حقيقي + مقارنة
- [x] لوحة افتراضية لكل مستخدم
- [x] تصدير PDF
- [x] اختبار `bi-dashboard.spec.ts` 8 حالات

## حالة التنفيذ

- الترحيل `0108_bi_dashboards.sql`: `dashboards` و`dashboard_widgets` مع RLS، وفهرس فريد للوحة الافتراضية لكل مستخدم. مفتاح الويدجت من كتالوج ثابت، وعمود الإعداد لا يخزن SQL.
- الكتالوج 20 مؤشراً (مبيعات، ذمم، نقد، حضور، نواقص، قرب الانتهاء…). الأرقام تُحسب من جداول المستأجر نفسه، لا من جملة يكتبها المستخدم.
- أول زيارة تنشئ «لوحتي» بثلاثة مؤشرات. السحب يعيد الرص ويحفظ عبر `PUT /dashboards/:id/layout`.
- الكاش خمس دقائق بالمفتاح `dashboard:widget:{id}:data`. غياب Redis لا يوقف اللوحة: الأرقام تبقى في ذاكرة العملية.
- تصدير PDF يضمّن الأرقام. الخط المضمّن لا يرسم العربية، فالعناوين في الملف إنجليزية.
- الواجهات: `/dashboards` و`/dashboards/[id]`، والرئيسية `/` تعرض اللوحة الافتراضية.
- الصلاحيات: `dashboards.view` و`dashboards.manage`.
- التحقق: `apps/api/src/modules/dashboards/bi-dashboard.spec.ts` (8 حالات).
- الوثائق المرافقة: `docs/STATUS.md` صف `FE-12`، و`docs/DATABASE_DESIGN.md` §19، و`docs/API_CONTRACT.md` §20، و`apps/api/src/modules/dashboards/README.md`.

## الجهد
- Backend: 4 أيام (لوحات + ويدجتس + cache)
- Frontend: 5 أيام (سحب وإفلات + كتالوج + رسوم)

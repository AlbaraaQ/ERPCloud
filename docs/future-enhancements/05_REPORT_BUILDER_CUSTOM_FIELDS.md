# 05 — منشئ التقارير والحقول المخصصة (Report Builder + Custom Fields)

> الأولوية: P2 - 2.5 أسبوع
> السوق: Odoo Studio / Zoho Creator — يقلل طلبات التخصيص 70%

## المشكلة
اليوم 103 تقرير ثابت. كل عميل يطلب `أريد عمود تاريخ انتهاء الضمان في تقرير المبيعات`. الحل الحالي: تعديل كود. الحل المطلوب: العميل يضيف حقل ويبني تقريره بنفسه.

## النطاق

### يدخل
- حقول مخصصة: جدول `custom_fields` (id, tenant_id, entity: party|item|invoice|employee, key, label_ar, type: text|number|date|select|boolean, options: jsonb, required)
- قيم: `custom_field_values` (entity_id, field_id, value: jsonb)
- منشئ تقارير: `custom_reports` (id, tenant_id, name, base_entity, columns: jsonb[], filters: jsonb[], chart_type, is_public)
- UI `/settings/custom-fields` — إضافة حقل بلا كود
- UI `/reports/builder` — سحب أعمدة + فلاتر + معاينة + حفظ
- API يقرأ الحقول المخصصة تلقائياً في `GET /parties`, `/items`, etc.

### لا يدخل
- علاقات بين كيانات في التقرير (join معقد) — نبدأ بكيان واحد + حقوله المخصصة
- صيغ محسوبة — مرحلة ثانية

## التصميم التقني

### ترحيل 0100
```sql
custom_fields (id, tenant_id, entity, key unique per tenant+entity, label_ar, label_en, type, options jsonb, is_required, is_active, sort_order)
custom_field_values (id, tenant_id, entity_type, entity_id, field_id, value jsonb, unique(entity_type, entity_id, field_id))
custom_reports (id, tenant_id, name, base_entity, columns jsonb, filters jsonb, chart_type, is_public, created_by)
```

### API
- `GET/POST/PUT/DELETE /custom-fields?entity=party`
- `GET /custom-fields/:id/values?entity_id=`
- `POST /custom-reports` { base_entity: 'sales_invoice', columns: [{ field: 'total', agg: 'sum' }, { custom_field: 'warranty_date' }], filters: [{ field: 'date', op: 'between', value: [...] }] }
- `POST /custom-reports/:id/run` → يعيد صفوف + رسم
- تعديل كل `getParty`, `getItem` → يضم `customFields: { key: value }`

### منطق الأعمدة
```ts
columns = [
  { source: 'native', key: 'total', label: 'الإجمالي', agg: 'sum' },
  { source: 'custom', key: 'cf_warranty', label: 'الضمان' },
  { source: 'relation', key: 'party.name', label: 'العميل' }
]
```
يبني استعلام ديناميكي بـ `jsonb` آمن (لا SQL injection — قائمة بيضاء).

### UI
- `/settings/custom-fields` — جدول حقول + زر `+ حقل` + معاينة
- في بطاقة العميل/الصنف: قسم `حقول إضافية` يظهر تلقائياً
- `/reports/builder` — يسار: قائمة حقول قابلة للسحب، وسط: شبكة + فلاتر، يمين: رسم
- `/reports/custom` — قائمة تقاريري المحفوظة

### صلاحيات
- `custom_fields.manage` + `custom_reports.manage` / `custom_reports.view`

## معايير القبول
- [ ] إضافة حقل مخصص `تاريخ الضمان` للصنف → يظهر في بطاقة الصنف ويُحفظ
- [ ] بناء تقرير `مبيعات حسب الضمان` → يعمل + يصدّر CSV/PDF
- [ ] حقل select بخيارات → يظهر dropdown
- [ ] حقل مطلوب → يمنع الحفظ بدونه
- [ ] اختبار `custom-fields.spec.ts` 10 حالات
- [ ] `verify-custom-fields.mjs` 15 نقطة

## الجهد
- Backend: 6 أيام (حقول + قيم + تقارير ديناميكية)
- Frontend: 5 أيام (منشئ + حقول + builder)

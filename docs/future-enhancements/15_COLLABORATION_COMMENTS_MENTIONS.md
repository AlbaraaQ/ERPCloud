# 15 — تعاون وتعليقات ومنشن داخل المستند

> الأولوية: P3 - 1.5 أسبوع
> السوق: Notion / Odoo Discuss — يزيد التفاعل ويقلل واتساب خارجي

## المشكلة
المحاسب يريد سؤال زميله عن فاتورة → يرسل واتساب خارج النظام → يضيع السياق.

## النطاق

### يدخل
- جدول `comments` (id, tenant_id, entity_type, entity_id, user_id, body, mentions: uuid[], parent_id?, created_at)
- جدول `mentions` (comment_id, mentioned_user_id, is_read)
- إشعارات: عند `mention @محمد` → إشعار + إيميل
- UI: قسم `💬 تعليقات` في كل بطاقة (فاتورة، عميل، موظف، مهمة) — Timeline تعليقات + رد
- إشارات: كتابة `@` تفتح قائمة مستخدمين
- حل تعليق (Resolve) + تعديل/حذف

### لا يدخل
- تعليق على سطر فاتورة — نبدأ على رأس المستند
- دردشة عامة — نبدأ تعليقات سياقية

## التصميم التقني

### ترحيل 0109
```sql
comments (id, tenant_id, entity_type, entity_id, user_id, body text, parent_id, is_resolved bool, created_at, updated_at)
comment_mentions (id, comment_id, mentioned_user_id, is_read bool, read_at)
```

### API
- `GET /comments?entity_type=sales_invoice&entity_id=`
- `POST /comments` { entity_type, entity_id, body, parent_id? } — يحلل mentions `@[user_id]` أو `@name`
- `PUT /comments/:id/resolve` + `DELETE /comments/:id`
- `GET /comments/mentions?is_read=false` — وارد المنشن
- `POST /comments/mentions/:id/read`

### تحليل منشن
- Body يحتوي `@محمد` → يبحث عن مستخدمين اسمهم يحتوي محمد في نفس المستأجر → يقترح
- عند حفظ: يستخرج `@[uuid]` → ينشئ `comment_mentions` + يرسل إشعار `comment.mention`

### UI
- مكون `CommentsPanel` قابل لإعادة الاستخدام: يستقبل `entityType, entityId`
- في كل بطاقة: تبويب `تعليقات (3)` → قائمة + حقل كتابة + قائمة منشن عند `@`
- إشعار جرس + صفحة `/notifications` تظهر المنشن
- شارة `تم الحل` + تصفية `المفتوحة فقط`

### صلاحيات
- `comment.view` (كل من يرى المستند يرى تعليقاته) + `comment.manage` (يكتب)

## معايير القبول
- [ ] تعليق على فاتورة → يظهر لكل من يرى الفاتورة
- [ ] كتابة `@أحمد` → أحمد يستلم إشعار
- [ ] رد على تعليق → يظهر متداخل
- [ ] حل تعليق → يصبح رمادي
- [ ] اختبار `comments.spec.ts` 8 حالات

## الجهد
- Backend: 3 أيام (تعليقات + منشن + إشعارات)
- Frontend: 3 أيام (Panel + منشن + جرس)

# 04 — محرك سير الموافقات (Approval Workflow)

> الأولوية: P1 - 2 أسبوع
> السوق: Odoo / NetSuite / قيود (موافقات) — مطلوب لكل شركة متوسطة

## المشكلة
اليوم أي مستخدم بصلاحية `sales.invoice.post` يرحل فاتورة 1,000,000 ريال بدون موافقة. الشركات تريد `>10,000 → مدير مالي → مدير عام`.

## النطاق

### يدخل
- جدول `approval_workflows` (id, tenant_id, entity: sales_invoice|purchase_invoice|voucher|expense|leave, name, is_active)
- جدول `approval_steps` (id, workflow_id, order, role_code|user_id, condition: jsonb { min_amount, max_amount, branch_id }, action: approve|notify)
- جدول `approval_requests` (id, workflow_id, entity_id, status: pending|approved|rejected, current_step)
- جدول `approval_decisions` (id, request_id, step_id, user_id, decision: approved|rejected, comment, at)
- محرك: عند `POST /sales/invoices/:id/post` → يفحص هل يوجد workflow نشط → إن وجد → ينشئ request بدل الترحيل المباشر
- شاشة `/settings/approvals` — بناء مسار بالسحب
- شاشة `/approvals/inbox` — وارد الموافقات مع زر موافقة/رفض وتعليق
- إشعارات + واتساب عند وصول طلب

### لا يدخل
- محرر مرئي معقد (BPMN) — نبدأ بقائمة خطوات مرتبة
- موافقات متوازية — نبدأ متسلسلة

## التصميم التقني

### ترحيل 0099
```sql
approval_workflows (id, tenant_id, entity, name, is_active, created_at)
approval_steps (id, workflow_id, step_order, approver_role, approver_user_id, condition_json, is_required)
approval_requests (id, tenant_id, workflow_id, entity_type, entity_id, status, current_step_order, created_by, created_at)
approval_decisions (id, request_id, step_id, user_id, decision, comment, decided_at)
```

### API
- `GET/POST /approvals/workflows` CRUD
- `GET /approvals/workflows/:id/steps`
- `POST /approvals/workflows/:id/steps` { approver_role, condition: { min_amount } }
- `GET /approvals/inbox?status=pending` — طلباتي
- `POST /approvals/requests/:id/approve` { comment }
- `POST /approvals/requests/:id/reject` { comment }
- تعديل `sales.service post()` : إن وجد workflow → أنشئ request وأرجع 202 `APPROVAL_REQUIRED` بدل 200

### شرط مثال
```json
{ "min_amount": 10000, "branch_id": null, "cost_center_id": null }
```
المحرك يختار أول workflow نشط لنفس entity حيث الشرط ينطبق.

### UI
- `/settings/approvals` — قائمة مسارات + منشئ: `عندما [فاتورة مبيعات] > [10,000] → [مدير مالي] ثم [مدير عام]`
- `/approvals/inbox` — بطاقات: `فاتورة #123 بـ 25,000 من أحمد — بانتظار موافقتك`
- `/approvals/history` — سجل القرارات
- في شاشة الفاتورة: شارة `بانتظار موافقة` + زر `عرض المسار`

### صلاحيات
- `approval.manage` (إنشاء المسارات) + `approval.approve` (الموافقة)

## معايير القبول
- [ ] إنشاء workflow `فاتورة شراء >5000 → محاسب → مدير` → فاتورة 6000 → لا تترحل بل تنشئ request
- [ ] inbox يظهر للمحاسب فقط
- [ ] موافقة المحاسب → تنتقل للمدير → موافقته ترحل الفاتورة تلقائياً
- [ ] رفض → الفاتورة تبقى مسودة + إشعار لمنشئها
- [ ] اختبار `approval-workflow.spec.ts` 12 حالة
- [ ] `verify-approvals.mjs` 20 نقطة

## الجهد
- Backend: 5 أيام (محرك + تكامل مع 4 كيانات)
- Frontend: 4 أيام (منشئ + inbox + شارات)

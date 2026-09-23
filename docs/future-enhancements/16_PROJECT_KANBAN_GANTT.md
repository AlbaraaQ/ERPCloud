# 16 — إدارة مشاريع Kanban + Gantt + تتبع وقت

> الأولوية: P3 - 2.5 أسبوع
> السوق: Asana / Monday / Odoo Project — مطلوب لشركات المقاولات

## المشكلة
عندك `projects/stages` و `projects/boq` لكن لا يوجد Kanban، ولا Gantt، ولا تتبع وقت فعلي vs مخطط.

## النطاق

### يدخل
- جدول `project_tasks` (id, project_id, stage_id, title, assignee_id, status: todo|in_progress|done, priority, start_date, due_date, estimated_hours, actual_hours)
- جدول `project_time_logs` (id, task_id, user_id, hours, at, note)
- جدول `project_dependencies` (task_id, depends_on_task_id) — لـ Gantt
- شاشة `/projects/[id]/board` — Kanban أعمدة = مراحل، بطاقات = مهام، سحب
- شاشة `/projects/[id]/gantt` — رسم Gantt بسيط (مكتبة Frappe Gantt)
- شاشة `/projects/[id]/time` — تتبع وقت + مقارنة مخطط vs فعلي
- ربط BOQ: مهمة تستهلك بند BOQ → يظهر تكلفة فعلية

### لا يدخل
- موارد وWorkload — مرحلة ثانية
- تصدير MS Project — مرحلة ثانية

## التصميم التقني

### ترحيل 0110
```sql
project_tasks (id, tenant_id, project_id, stage_id, title, description, assignee_id, status, priority, start_date, due_date, estimated_hours numeric, actual_hours numeric default 0, sort_order)
project_time_logs (id, tenant_id, task_id, user_id, hours numeric, log_date date, note)
project_dependencies (id, task_id, depends_on_task_id, type: finish_to_start)
```

### API
- `GET/POST /projects/:id/tasks?stage_id=&assignee_id=&status=`
- `PUT /projects/tasks/:id/move` { stage_id, sort_order } — Kanban
- `POST /projects/tasks/:id/time-logs` { hours, note }
- `GET /projects/:id/gantt` — يعيد مهام + dependencies بصيغة Gantt
- `GET /projects/:id/cost` — مقارنة BOQ مخطط vs وقت فعلي + مصاريف

### منطق
- عند تحريك مهمة في Kanban → يحدث stage_id + sort_order
- Gantt: يحسب المسار الحرج بسيط (أطول سلسلة dependencies)
- تكلفة: actual_hours * معدل ساعة الموظف (من HRM) + مصاريف مرتبطة

### UI
- `/projects/[id]/board` — Kanban مثل Trello، بطاقة تظهر assignee + due + hours
- `/projects/[id]/gantt` — شريط زمني، سحب لتغيير تواريخ، خطوط dependencies
- `/projects/[id]/tasks/[taskId]` — تفاصيل + time logs + تعليقات (يستخدم CommentsPanel من 15)
- `/projects/[id]/cost` — جدول BOQ vs فعلي + رسم

### صلاحيات
- `projects.tasks.view|manage` + `projects.time_logs.manage`

## معايير القبول
- [ ] إنشاء 5 مهام في مشروع → تظهر في Kanban 3 أعمدة → سحب مهمة → يتغير stage
- [ ] Gantt يعرض مهام + dependencies + مسار حرج
- [ ] تسجيل وقت 2 ساعة على مهمة → actual_hours = 2 → تكلفة تحسب
- [ ] مقارنة BOQ vs فعلي
- [ ] اختبار `project-kanban.spec.ts` 10 حالات

## الجهد
- Backend: 5 أيام (مهام + وقت + Gantt)
- Frontend: 6 أيام (Kanban + Gantt + تكلفة)

## قيمة سوقية
شركات المقاولات تدفع 200-400 ريال إضافي لهذه اللوحة.

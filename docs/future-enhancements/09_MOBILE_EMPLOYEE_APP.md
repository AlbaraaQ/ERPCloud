# 09 — تطبيق الموظف (حضور GPS + إجازات + عهد)

> الأولوية: P2 - 2 أسبوع
> السوق: جسر / مسير — مطلوب لكل شركة

## المشكلة
الموظف اليوم لا يستطيع طلب إجازة أو تسجيل حضور من جواله. المدير لا يوافق من جواله.

## النطاق

### يدخل
- PWA موظف `/m` منفصل خفيف (أو نفس staff لكن `/employee/*`)
- تسجيل حضور: زر `حضور` + GPS + صورة سيلفي اختيارية → يتحقق من نطاق الفرع (geofence)
- طلبات: إجازة، استئذان، عهدة، سلفة — نموذج بسيط + مرفق
- وارد موافقاتي كمدير — موافقة/رفض بلمسة
- كشف راتبي، إجازاتي، عهدي
- إشعارات push (Web Push)

### لا يدخل
- تطبيق Native — نبدأ PWA
- محادثة — مرحلة ثانية

## التصميم التقني

### ترحيل 0103
```sql
attendance_logs (id, tenant_id, employee_id, type: check_in|check_out, at, lat, lng, selfie_file_id, branch_id, status: valid|outside_geofence)
employee_requests (id, tenant_id, employee_id, type: leave|permission|custody|advance, data jsonb, status: pending|approved|rejected, approver_id)
employee_geofences (id, branch_id, lat, lng, radius_meters)
```

### API
- `POST /employee/attendance` { type, lat, lng, selfieFileId? }
- `GET /employee/attendance/today`
- `POST /employee/requests` { type, from, to, reason, fileId? }
- `GET /employee/requests?status=pending` (لموظفي + لمدير)
- `POST /employee/requests/:id/approve|reject`
- `GET /employee/payslips` + `GET /employee/custodies`
- `POST /employee/push-subscription` — حفظ Web Push

### منطق الحضور
- الفرع له geofence (lat,lng,radius=200m)
- عند حضور: يحسب المسافة `haversine(lat,lng,branch)` → إذا > radius → `outside_geofence` + تنبيه للمدير لكن يسجل
- سيلفي اختيارية → تحفظ في files

### UI PWA
- `/m` — تسجيل دخول موظف (نفس auth لكن role employee)
- `/m/attendance` — زر كبير حضور/انصراف + خريطة صغيرة + سجل اليوم
- `/m/requests/new` — اختيار نوع + تواريخ + سبب
- `/m/approvals` — للمدير
- `/m/profile` — راتبي + إجازاتي + عهدي
- تصميم موبايل أولاً، أزرار كبيرة

### صلاحيات
- `employee.self.*` — كل موظف يرى نفسه فقط
- `employee.team.approve` — للمدير

## معايير القبول
- [ ] حضور من جوال داخل نطاق الفرع → يسجل valid
- [ ] حضور خارج النطاق → يسجل outside + تنبيه
- [ ] طلب إجازة → يظهر في inbox المدير → موافقة → يظهر في HRM
- [ ] PWA يعمل أوفلاين ويزامن الحضور
- [ ] إشعار push عند موافقة
- [ ] اختبار `mobile-employee.spec.ts` 10 حالات

## الجهد
- Backend: 4 أيام (حضور + طلبات + geofence)
- Frontend PWA: 5 أيام

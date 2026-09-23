# 11 — بوابة الموردين + توقيع إلكتروني

> الأولوية: P3 - 2 أسبوع
> السوق: Coupa / SAP Ariba (بوابة موردين) — ميزة B2B

## المشكلة
المورد يرسل عرض سعر PDF بالواتساب. لا يوجد مكان يرى فيه فواتيره ومدفوعاته.

## النطاق

### أ. بوابة موردين
- مثل بوابة العملاء لكن للمورد: `/supplier-portal`
- تسجيل دخول مورد (party portal user)
- يرى: فواتير الشراء الخاصة به، مدفوعاته، طلبات عروض أسعار، يرفع فاتورة
- يرد على طلب عرض سعر إلكترونياً

### ب. توقيع إلكتروني
- توقيع عروض أسعار وفواتير وعقود عبر رابط
- جدول `esign_requests` (id, entity_type, entity_id, signer_email, status: sent|viewed|signed|declined, signed_file_id, signed_at, ip)
- مزود: DocuSign / أو توقيع بسيط (رسم + OTP) — نبدأ بسيط
- شاشة `/sales/quotations/[id]/esign` — إرسال للتوقيع

### لا يدخل
- مزاد موردين — مرحلة ثانية
- توقيع معتمد قانونياً (XAdES) — نبدأ توقيع بسيط

## التصميم التقني

### ترحيل 0105
```sql
supplier_portal_users (id, tenant_id, party_id, email, password_hash, is_active)
supplier_portal_sessions ...
esign_requests (id, tenant_id, entity_type, entity_id, signer_name, signer_email, token_hash, status, signed_file_id, signed_at, ip, payload jsonb)
esign_events (id, request_id, event: sent|viewed|signed, at, ip)
```

### API
- `POST /supplier-portal/auth/login`
- `GET /supplier-portal/invoices` — فواتيره فقط
- `GET /supplier-portal/payments`
- `POST /supplier-portal/quotations/:id/respond` { price, note }
- `POST /esign/requests` { entity_type, entity_id, signer_email, message }
- `GET /esign/:token` — صفحة توقيع عامة
- `POST /esign/:token/sign` { signature_data, otp? }

### تدفق توقيع
1. مدير يفتح عرض سعر → زر `إرسال للتوقيع` → يدخل إيميل العميل
2. ينشئ `esign_requests` + token عشوائي 48 حرف → يرسل إيميل برابط `/esign/<token>`
3. العميل يفتح الرابط → يرى المستند → يرسم توقيعه + OTP → `POST /sign`
4. يحفظ PDF موقع + يحدث حالة عرض السعر → `signed`
5. إشعار للمنشئ

### UI
- `/supplier-portal/*` — بوابة موردين بتصميم بسيط
- `/sales/quotations/[id]` قسم `التوقيع الإلكتروني` + حالة
- `/esign/[token]` — صفحة توقيع عامة جميلة (شعار المنشأة + مستند + لوحة رسم)

### صلاحيات
- `supplier_portal.access` + `esign.manage`

## معايير القبول
- [ ] مورد يسجل دخول → يرى فواتيره فقط
- [ ] إرسال عرض سعر للتوقيع → العميل يوقع → حالة تتغير + PDF موقع
- [ ] رابط منتهي → 410
- [ ] اختبار `supplier-esign.spec.ts` 8 حالات

## الجهد
- Backend: 5 أيام (بوابة + توقيع)
- Frontend: 4 أيام

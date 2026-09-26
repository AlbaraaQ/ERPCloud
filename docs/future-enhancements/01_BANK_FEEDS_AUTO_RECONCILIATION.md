# 01 — التغذية البنكية والمطابقة التلقائية (Bank Feeds)

> الأولوية: P1 - 1.5 أسبوع
> الحالة: ✅ مكتملة — migration 0096 + API + 3 واجهات Staff + تحقق حي 15/15
> السوق: QuickBooks / Xero / قيود — كلهم يملكونها، نحن لا

## المشكلة
المحاسب اليوم يدخل كشف حساب البنك يدوياً في `/treasury/vouchers`. المنافس يستورد CSV/MT940 ويطابق تلقائياً 80% من الحركات.

## ما يملكه السوق وليس عندنا
- استيراد CSV / Excel / MT940 / CAMT.053
- مطابقة ذكية: `رقم الفاتورة في البيان = فاتورة` → اقتراح تسوية
- قواعد تعلم: `إذا الوصف يحتوي STC → مصروف اتصالات`
- تسوية بنكية (Bank Reconciliation) بفروق

## النطاق

### يدخل
- جدول `bank_statements` (كشف مستورد) + `bank_statement_lines`
- استيراد CSV بمعالج عملي (رفع النص → تحليل الأعمدة → مراجعة)؛ Excel/MT940/CAMT مؤجلة
- محرك مطابقة: فاتورة مبيعات/شراء، سند قبض/صرف، شيك
- شاشة `/treasury/bank-reconciliation` — يسار كشف البنك، يمين قيودنا، زر مطابقة
- تقرير تسوية بنكية مطبوع

### لا يدخل (مؤجل صريح)
- ربط مباشر API مع البنوك السعودية (يحتاج Open Banking ترخيص) — نبدأ بملف
- MT940/CAMT في R18 — نبدأ CSV/Excel فقط

## التصميم التقني

### ترحيل 0096
```sql
bank_accounts (id, tenant_id, bank_name, account_no, iban, currency, opening_balance, account_id, status)
bank_statements (id, tenant_id, bank_account_id, file_id, period_from, period_to, opening_balance, closing_balance, status, row_count)
bank_statement_lines (id, statement_id, txn_date, description, reference, amount, balance, matched_voucher_id, matched_invoice_id, matched_invoice_type, match_confidence, suggested_account_id, suggested_cost_center_id, status: pending|matched|ignored)
bank_reconciliation_rules (id, tenant_id, keyword, account_id, cost_center_id, priority, status)
```

جميع الجداول الأربعة تحمل `tenant_id` مع RLS و`FORCE ROW LEVEL SECURITY`. أسماء Drizzle المطابقة للعمود SQL `status` هي `status`، وليس `isActive`.

### API
- `GET/POST/PATCH/DELETE /treasury/bank-accounts` — إدارة الحسابات مع إخفاء IBAN في القائمة
- `POST /treasury/bank-statements/import` — تحليل CSV وإدخال الكشف والحركات في معاملة واحدة
- `GET /treasury/bank-statements` و`GET/DELETE /treasury/bank-statements/:id`
- `GET /treasury/bank-statements/:id/lines?filter[status]=pending`
- `POST /treasury/bank-statements/:id/match` `{ lineId, voucherId | invoiceId }`
- `POST /treasury/bank-statements/:id/auto-match` — يشغل المحرك ويقترح حساب القاعدة النصية دون ترحيل قيد
- `POST .../lines/:lineId/ignore` و`DELETE .../lines/:lineId/match` — تجاهل الحركة أو إلغاء المطابقة
- `GET/POST/PATCH/DELETE /treasury/bank-reconciliation-rules`
- `GET /treasury/bank-reconciliation?bank_account_id=&from=&to=` — تقرير قابل للطباعة من شاشة Staff

### منطق المطابقة
1. مبلغ مطابق تماماً + تاريخ ±3 أيام + مرجع (رقم فاتورة في الوصف) → ثقة 95%
2. مبلغ مطابق + مورد/عميل في الوصف → ثقة 80%
3. قواعد الكلمات المفتاحية → اقتراح حساب
4. يدوي — المستخدم يسحب

### UI
- `/treasury/bank-accounts` — قائمة حسابات بنكية
- `/treasury/bank-statements` — استيراد + قائمة
- `/treasury/bank-reconciliation` — شاشة مقسمة (مثل `frmBankReconciliation` إن وجد)
- تسميات عربية حرفية: "كشف حساب بنكي" "مطابقة" "تسوية"

### صلاحيات
- `treasury.bank.view` / `treasury.bank.manage` — جديدتان

## معايير القبول
- [x] رفع CSV 100 سطر → parser يحافظ على 100 سطر، وواجهة الاستيراد تحفظ `row_count` والحركات في DB
- [x] `auto-match` يحقق ≥60% في benchmark من 100 حركة داخل `bank-reconciliation.spec.ts`؛ live smoke candidate-backed run حقق 5/5
- [x] شاشة `/treasury/bank-reconciliation` تطبع تقرير PDF عبر browser print مع رصيد البنك والدفتر والفرق
- [x] اختبار `bank-reconciliation.spec.ts` — 8 حالات
- [x] سكربت `verify-bank-feeds.mjs` — 15 نقطة، مع تنظيف الحساب والكشف والقاعدة في `finally`

## الجهد
- Backend: 4 أيام (استيراد + مطابقة + قواعد)
- Frontend: 3 أيام (3 شاشات + معالج)
- اختبارات: 1 يوم

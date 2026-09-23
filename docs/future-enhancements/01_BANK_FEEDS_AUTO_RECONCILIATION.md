# 01 — التغذية البنكية والمطابقة التلقائية (Bank Feeds)

> الأولوية: P1 - 1.5 أسبوع
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
- استيراد CSV/Excel بمعالج 3 خطوات (رفع → مطابقة أعمدة → مراجعة)
- محرك مطابقة: فاتورة مبيعات/شراء، سند قبض/صرف، شيك
- شاشة `/treasury/bank-reconciliation` — يسار كشف البنك، يمين قيودنا، زر مطابقة
- تقرير تسوية بنكية مطبوع

### لا يدخل (مؤجل صريح)
- ربط مباشر API مع البنوك السعودية (يحتاج Open Banking ترخيص) — نبدأ بملف
- MT940/CAMT في R18 — نبدأ CSV/Excel فقط

## التصميم التقني

### ترحيل 0096
```sql
bank_accounts (id, tenant_id, bank_name, account_no, iban, opening_balance)
bank_statements (id, tenant_id, bank_account_id, file_id, period_from, period_to, status)
bank_statement_lines (id, statement_id, txn_date, description, amount, balance, matched_voucher_id, matched_invoice_id, status: pending|matched|ignored)
bank_reconciliation_rules (id, tenant_id, keyword, account_id, cost_center_id, priority)
```

### API
- `POST /treasury/bank-accounts` CRUD
- `POST /treasury/bank-statements/import` presign → finalize → parse
- `GET /treasury/bank-statements/:id/lines?filter[status]=pending`
- `POST /treasury/bank-statements/:id/match` { lineId, voucherId | invoiceId }
- `POST /treasury/bank-statements/:id/auto-match` — يشغل المحرك
- `GET /treasury/bank-reconciliation?bank_account_id=&from=&to=` — تقرير

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
- [ ] رفع CSV 100 سطر → يظهر 100 سطر في DB
- [ ] `auto-match` يطابق ≥60% في بيانات تجريبية
- [ ] شاشة التسوية تطبع PDF مع رصيد بنكي vs دفتري والفرق
- [ ] اختبار `bank-reconciliation.spec.ts` 8 حالات
- [ ] سكربت `verify-bank-feeds.mjs` 15 نقطة

## الجهد
- Backend: 4 أيام (استيراد + مطابقة + قواعد)
- Frontend: 3 أيام (3 شاشات + معالج)
- اختبارات: 1 يوم

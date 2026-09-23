# Phase 02 — Sales invoice engine (done 2026-09-10)

Desktop reference: `Class/InvoiceCalc.cs` (`SumTotal`/`SumCost`/`SumNet`), `SaveInvoice`
+ `BindToEntry` (`Sub_Code` 5-leg journal: customer Dr / sales Cr / discount-Dr contra /
VAT Cr / profit Dr–Cr), returns (`ReBindToEntry`), void (`DeleteInvTrans` flag-only).

Rule of the phase: **posting is one engine, not caller-supplied lines.** The draft
stays permissive; `POST /sales/invoices/:id/post` enforces the desktop gates and
writes stock + costs + journal in a single transaction.

## 2A. Invoice math — discount before VAT (desktop `SumTotal`)

`packages/contracts/src/invoice-math.ts` (`calculateInvoiceTotals`, shared by the API
and the staff screens, so both always agree):

- Line net = `qty × price − line discount`; header discount is spread over the
  lines pro-rata (`discountShare`) and **reduces the VAT base** (`taxable`), then
  `tax = taxable × rate / 100`.
- `subtotal` = Σ taxable (net of header discount); `total = subtotal + taxTotal +
  extraTax − withholding`. `priceIncludesVat` back-solves the taxable base.
- Reference case (locked in `sales-posting.spec.ts`): 2×500 − 20 @15% →
  subtotal `980.0000`, tax `147.0000`, total `1127.0000`.

## 2B. Posting engine — `post()` does SaveInvoice + BindToEntry

`apps/api/src/modules/sales/sales.service.ts`:

- **Gates (drafts may stay incomplete):** `SALES_QUOTATION_NOT_POSTABLE` (409),
  `SALES_WAREHOUSE_REQUIRED` (422, only when stocked `stock`-kind lines exist —
  service-only and description-only invoices post warehouse-free, incl. progress
  bills), `SALES_TOTAL_INVALID` (422, negative sale), `SALES_CUSTOMER_REQUIRED`
  (422), `SALES_FISCAL_PERIOD_REQUIRED` (422, legacy explicit-lines path only).
- **Numbering:** `SI-/SR-/CN-/DN-` + 6 digits from the branch sequence, allocated
  inside the posting transaction.
- **Stock (`recordAutoStock`, desktop `SumCost`):** sale lines relieve at average
  cost (`outAtAvg`); each line's `cost_total` is stamped from the movement's
  average; returns restore at the **source invoice's original unit cost**
  (`returnAtOriginalCost`, falling back to the current average when unknown) so
  returns stay value-neutral. Service items never touch the ledger.
- **Journal (`buildAutoJournal`, from the resolved posting profile — never from
  caller lines):** sale = Dr settlement / Cr sales gross / Dr discount-given /
  Cr VAT-output / Cr excise / Dr COGS–Cr inventory (zero legs skipped); returns
  and credit notes mirror every leg. Withholding invoices are refused with
  `SALES_WITHHOLDING_MANUAL_POSTING` (explicit lines required).
- **Settlement:** `PostingInput.settlement` (`credit`/`cash`/`bank`) +
  `settlementAccountId` (tenant-validated, `SALES_SETTLEMENT_ACCOUNT_*`).
  Cash/bank posts debit the till/bank with **no party subledger**, records the
  invoice's first payment row (`invoice_payments`, idempotent
  `sales-settle:<id>`), and lands the invoice `paid`. Returns always refund
  through the settlement account but never fabricate a payment row.
- **Legacy compatibility:** callers passing explicit `journalLines` /
  `inventoryLines` keep the old behaviour untouched (progress bills, POS
  back-office imports); `void()` keeps its ZATCA seal + paid guards.
- **Void:** reverses the journal (mirror entry linked by `reversalOf`), mirrors
  every stock movement (`sales_void`), then flips the status — the desktop only
  flagged the invoice and left the stock relieved. Guards:
  `SALES_VOID_REASON_REQUIRED`, `SALES_VOID_ZATCA_SEALED`, `SALES_VOID_HAS_PAYMENTS`.

## 2C. Tafqeet consolidation (amount in Arabic words)

The repo had two converters: a weak `amountToArabicWords` port and the superior
`apps/api/.../reporting/tafqeet.ts` (Decimal-safe, dual/plural scale grammar,
11 currencies, `… لا غير`). The weak port was **deleted**; the canon moved
verbatim to `packages/contracts/src/arabic-words.ts`
(`amountInArabicWords`/`integerInArabicWords`, exported from the contracts
index) with its spec; the API module is now a one-line re-export. 71/71
contracts specs green. **Do not re-port desktop `Number2Arabic.cs`.**

## 2D. Specs repaired honestly (no weakening)

Posting now requires a real ledger (chart + profile + fiscal year), so five
suites that posted on bare fixture tenants were upgraded to provision properly
(`provisionOrgDefaults` + fiscal year in `beforeAll`, reusing the provisioned
`MAIN` branch): `einvoicing`, `portal`, `printing-and-cards`,
`production-and-returns`, `warehouse-documents`. The phase-10 unit mock gained
the header fields the new gates require. Result: **73 files / 405 tests green**,
including the new `test/sales-posting.spec.ts` (8 tests: profile seeding,
discount-VAT totals, post engine, warehouse gate, negative-total gate, return
mirror, cash settlement, void reversal + paid-guard).

## 2E. Staff screens

- `sales/invoices/new`: salesman is now a real lookup (was a raw id input),
  warehouses are branch-scoped, a posting hint appears when stocked lines lack a
  warehouse, and the discount field notes that it reduces the VAT base. Totals
  come from the shared `calculateInvoiceTotals` — identical to the API.
- `sales/invoices/[id]`: the post action no longer builds journal/inventory
  lines in the browser (and no longer posts a second COGS journal). It sends
  `{ settlement, settlementAccountId, settlementCashLocationId }`; the engine
  does the rest. Cash/bank settlement shows a till/bank picker.

## 2F. Live verification (demo tenant, 2026-09-10)

2×500 − 20 @15% → `980/147/1127`, `SI-000001`, balanced journal
(`Dr 12310001 1127 / Cr 4100001 1000 / Dr 4100003 20 / Cr 2222001 147 /
Dr 3200004 80 / Cr 1270001 80`), stock 50→48 @40 avg, line cost `80.0000`;
cash sale landed `paid 115.0000` with a payment row; return posted `SR-000001`;
service invoice posted warehouse-free and voided cleanly; voiding a paid
invoice refused with `SALES_VOID_HAS_PAYMENTS`.

## Follow-ups (not this phase)

- ~~Voiding an invoice that already has returns posted against it is allowed and
  leaves a dangling `referenceInvoiceId` … Consider `SALES_VOID_HAS_RETURNS`.~~
  **Closed in §R2.3** — both directions are guarded (409 + the blocking documents
  are listed).
- Purchases `POST …/post` still takes caller-built lines (`purchases/invoices/[id]`
  page) — Phase 03 migrates it onto the same engine pattern (**R3**; the window to
  match is `frmInvPurch.xaml`/`frmPurchInv.xaml`, see §R2.1).
- ~~`apps/staff/lib/posting.ts` client-side builders (`salesJournalLines`,
  `inventoryLinesFor`, `cogsAmountFor`) are now unused by sales but still used
  by purchases/payroll — remove after Phase 03.~~ **Closed in §R2.5 (verified, not
  assumed):** the three dead builders are already gone; what remains
  (`periodForDate` · `POSTING_ACCOUNT_LABELS` · `PostingProfile`) is live in
  `hrm/payroll/[id]`, `projects/[id]` and `settings/posting-profiles`.

## R2 — مطابقة نافذة فاتورة البيع (تكملة المرحلة 02 · 2026-09-20)

المرحلة 02 بنت **المحرّك** ولم تفتح النافذة المكتبية؛ §4.2 في `AUDIT_PHASES_01_04.md`
سجّل النقص: «لا جدول أعمدة، ولا تسميات، ولا قرار موثّق فيما استُبدل». هذا القسم يسدّ
النقص: جدولُ مصادرٍ بأسطرها، وجدولُ تسمياتٍ حرفيّ مطبَّق على الشاشتين، وحارسا سلسلة
المستندات، وسكربتُ تحقّقٍ حيّ يعيد أرقام §2F بضغطة.

### R2.1 المصادر (ملفات `Desktop_ERP`، تُقرأ بـ`git ls-files`)

| الملف | الأسطر | ما أُخذ منه |
|---|---|---|
| `Form_WPF/frmInvSale.xaml` | 1273 | النافذة كلها: العنوان · الحقول (`💳 طريقة الدفع` L414 · `👤 العميل` L459 · `🏪 المستودع` L482 · `🏛️ البنك` L488 · `📱 الجوال` L546) · أعمدة البنود L695–L831 · لوحة الإجماليات L942–L1023 · الأزرار L1197–L1266 |
| `Form_WPF/frmInvSale.xaml.cs` | 3875 | `btnSave`/`btnSavePrint`/`btnDelete` ومعالجاتها · شروط الإرجاع L1685–L1740 («الفاتورة تم إرجاعها سابقاً أو بعض الأصناف» L1702 · «يجب ربط الفاتورة برقم فاتورة المبيعات أو الرقم غير صحيح» L1716 · «فاتورة المبيعات خارج الفترة المحاسبية…» L1726 · «لا يمكن حفظ الفاتورة بدون أصناف» L1739) · توزيع أرقام الإجماليات L1420–L1432 |
| `Class/InvoiceOper.cs` | 5519 | `SaveInvoice` L1310 · `SendZatca` L2209 · `BindToEntry` L2252 · `isReturned` L812 · `IsHasRefrence` L958 · `DeleteInvoice` L4419 (حذفٌ ناعم: `Inv.IS_Deleted=1` + `Entry.IS_Deleted=1, state=2`) · الترقيم `InvoiceNo` L2789 و`OrderNo` L2743 |
| `Class/ItemOper.cs` | `CalcTotal` L1533 | نصيب السطر من خصم الرأس = `الخصم × إجمالي السطر ÷ الإجمالي`، والضريبة تُحسب على الصافي بعده |
| `Form_WPF/frmInvPurch.xaml` · `frmPurchInv.xaml` | L1056–L1101 | **المرآة لـR3** — لوحة إجمالياتها الصفوف الخمسة نفسها بلا رموز («المجموع :» · «الخصم :» · «الإجمالي :» · «الضريبة :» · «الصافي :»)، وأزرارها «🗑️ حذف» L1406 و«💾 حفظ» L1428. *(اسم النافذة ليس `frmInvPurchase.xaml` كما ورد في §6 — الملفُّ الموجود فعلاً هو هذان.)* |

### R2.2 جدول التسميات — النص الحرفي وأين طُبِّق

| التسمية الحرفية | السطر | موضعها في السحابة |
|---|---|---|
| `🧾 فاتورة مبيعات` | `frmInvSale.xaml:347` | عنوان `sales/invoices/new` و`sales/invoices/[id]` (ومسار الطباعة يعرض ورقة المستند نفسها) |
| `🔄 مرتجع` | :355 | `POST /sales/invoices/:id/return` (لا زرَّ في الشاشة بعد — §R2.5) |
| `🔖 رقم المرجع:` | :405 | `🔖 رقم المرجع` في بطاقة الفاتورة، ويُحلّ المعرّف إلى رقم الفاتورة الأصلية |
| `💳 طريقة الدفع:` | :414 | `💳 طريقة الدفع` قبل الترحيل، وخياراتها الثلاثة بنصّها: `آجلة`/`نقدية`/`بنك` (:418–:420) |
| `📋 الحالة:` | :423 | `📋 الحالة` (`statusLabel`) |
| `👤 العميل:` | :459 | `👤 العميل` في شاشة الإنشاء (قائمة `parties?kind=customer`) |
| `🏦 الصندوق:` (:476) · `🏛️ البنك:` (:488) | :476 · :488 | التسمية تتبدّل مع `💳 طريقة الدفع`: `نقدية` ⇒ `🏦 الصندوق`، `بنك` ⇒ `🏛️ البنك` |
| `🏪 المستودع:` | :482 | `🏪 المستودع` (والشرط: فاتورة بأصناف مخزنية بلا مستودع تُرفض `SALES_WAREHOUSE_REQUIRED`) |
| `👨‍💼 المندوب:` | :521 | `👨‍💼 المندوب` |
| `💵 عميل نقدي:` | :540 | `💵 عميل نقدي` (يظهر فقط حين لا عميل مسجّل) |
| `📱 الجوال:` | :546 | `📱 الجوال` |
| `📦 الصنف` · `الوحدة` · `الكمية` · `السعر` · `المجموع` · `الخصم` · `الضريبة` · `الإجمالي` · `الصافي` | :695 · :759 · :769 · :779 · :789 · :799 · :811 · :821 · :831 | أعمدة `InvoiceLines` (شاشة الإنشاء) وجدول بنود `sales/invoices/[id]` |
| `📊 المجموع:` · `🔻 الخصم:` · `💵 الإجمالي:` · `🧾 الضريبة:` · `✅ الصافي:` | :942 · :948 · :955 · :961 · :967 | `TotalsPanel` (وبنفس الترتيب في جدول البنود وبطاقة الفاتورة) |
| `🔻 خصم:` | :989 | `🔻 خصم` في شاشة الإنشاء (يُخفّض به وعاء الضريبة) |
| `💚 المدفوع:` · `🔴 المتبقي:` | :1011 · :1023 | بطاقة الفاتورة |
| `💰 تسديد` | :1197 | زرّ تسجيل الدفعة في `[id]` |
| `🖨️ طباعة` | :1254 | زرّ `/print/sales-invoice/:id` في `[id]` |
| `💾🖨️ حفظ + طباعة` | :1257 | زرٌّ ثانٍ في شاشة الإنشاء: يحفظ ثم يفتح ورقة الطباعة |
| `🗑️ حذف` | :1260 | `🗑️ إلغاء الفاتورة` في `[id]` — الإلغاء هو مقابل الحذف الناعم (§R2.5) |
| `💾 حفظ` | :1263 | زرّ الحفظ في شاشة الإنشاء |
| `➕ جديد` | :1266 | `/sales/invoices/new` (المسار نفسه) |

**والترتيب ليس تجميلاً:** في الديسكتوب «الإجمالي» هو الصافي **بعد الخصم وقبل الضريبة**
و«الصافي» هو الإجمالي **مع الضريبة** (`frmInvSale.xaml.cs:1429–1432`: `txtNetWithoutVAT =
Invoic.Total` ثم `txtNet = Invoic.Net`). وهو نفسه ترتيب `calculateInvoiceTotals` في
السحابة (`net` ثم `total`)، فطابقت الأعمدة حقولَ الـDTO واحداً بواحد.

### R2.3 حارسا سلسلة المستندات (متابعة `SALES_VOID_HAS_RETURNS` المعلَنة في §2B)

النافذة المكتبية تمنع إرجاع فاتورةٍ مُرجَعة سابقاً (`isReturned` L812 ← «الفاتورة تم
إرجاعها سابقاً أو بعض الأصناف» L1702) وتشترط ربط المرتجع برقم فاتورته (`IsHasRefrence`
L958 ← الرسالة L1716)، لكنها تسمح بحذف فاتورةٍ عليها مرتجعٌ قائم فيبقى مرجعٌ معلّق. في
السحابة صار الوجهان حارسين على المحرّك:

| الرمز | الحالة | متى | ما يحمله |
|---|:--:|---|---|
| `SALES_VOID_HAS_RETURNS` | 409 | إلغاء فاتورةٍ عليها مستندٌ مشتقّ **مُرحَّل** (`referenceInvoiceId = id AND status='posted'`) | `errors[0] = { references: [{ id, number, kind }], count }` — يُسمّي الحاجز لا يُلوّح به |
| `SALES_REFERENCE_VOIDED` | 409 | ترحيل مستندٍ مشتقّ (`sale_return`/`credit_note`) فاتورتُه الأصلية مُلغاة | يُفحص **قبل أي كتابة** فلا قيدَ ولا حركةَ مخزون |

والشرط على المُرحَّل وحده: المرتجع **المسودّة** أثرُه صفر (لا قيد ولا مخزون) فلا يحجب
الإلغاء؛ ولو رُحِّل بعده سدّه `SALES_REFERENCE_VOIDED`. الحاجزان معاً يقفلان الحلقة:
لا فاتورةَ ملغاة يشير إليها مستندٌ قائم، ولا مستندَ يُرحَّل إلى فاتورةٍ ملغاة.

### R2.4 سكربت التحقّق الحيّ — `scripts/verify-sales-engine.mjs`

**40 فحصاً في 9 أقسام**، يُعاد تشغيله بلا تنظيف فيعيد كل عدّادٍ إلى خطّ أساسه (كل فحصٍ
بالفرق لا بالرقم المطلق، والصنف والعميل يُنشآن ببادئةٍ جديدة كل تشغيل):

1. **خطّ الأساس** — الفرع والمستودع، والحسابات السبعة لمحرّك البيع قابلةٌ للترحيل
   (`12310001` · `4100001` · `4100002` · `4100003` · `2222001` · `3200004` · `1270001`)،
   وعدّادا الفواتير والقيود.
2. **التهيئة** — وحدةٌ وتصنيفٌ وصنفٌ برصيدٍ افتتاحي 50 @40 وعميل.
3. **الحساب (بديل `CalcTotal`)** — `2×500 − 20 @15%` ⇒ **`980 / 147 / 1127`**، والسطر
   يحمل صافيه بعد نصيبه من الخصم؛ وخصم الرأس موزَّعاً على سطرين (`1×500` و`3×500` بخصم 40)
   ⇒ صافٍ `490 / 1470` وضريبة `73.5 / 220.5` وإجمالي `2254`.
4. **الترحيل (`SaveInvoice` + `BindToEntry`)** — رقمٌ تسلسلي `SI-`، والمخزون 50 ⇒ **48**،
   وتكلفة السطر `80.0000` (متوسط 40 × 2)، والقيد الخماسي:
   `Dr 12310001 1127` · `Cr 4100001 1000` · `Dr 4100003 20` · `Cr 2222001 147` ·
   `Dr 3200004 80` · `Cr 1270001 80`.
5. **التحصيل** — بيعٌ نقديّ 100 @15% ⇒ `115` مدفوعةٌ كاملة (`paidTotal` + `paymentStatus`
   = `paid`) وله صفُّ دفعةٍ حقيقي بالموقع (`settlement` + `settlementAccountId` +
   `settlementCashLocationId`).
6. **المرتجع** — `SR-` مُرحَّلٌ يعيد المخزون **بتكلفة الفاتورة الأصلية**
   (`returnAtOriginalCost`)، والإرجاع فوق المُرتجَع `422 SALES_RETURN_QUANTITY_EXCEEDED`.
7. **سلسلة المستندات (§R2.3)** — إلغاءُ فاتورةٍ عليها مرتجعٌ مُرحَّل `409
   SALES_VOID_HAS_RETURNS` بسرد المستند، والفاتورة لم تُمسّ؛ ومرتجعٌ **مسودّة** لا يحجب
   الإلغاء لكن ترحيله بعده `409 SALES_REFERENCE_VOIDED` وتبقى مسودّة؛ وإلغاء المرتجع
   يفتح باب إلغاء الفاتورة.
8. **الرفض** — فاتورةٌ مدفوعة `409 SALES_VOID_HAS_PAYMENTS`، وبلا سببٍ مكتوب
   `422 SALES_VOID_REASON_REQUIRED`، وخدمةٌ بلا مستودع تُرحَّل وتُلغى بلا أثرٍ مخزني،
   وإعادة ترحيل فاتورةٍ مرّحّلة **ليست رفضاً**: تردّ المستند نفسه (idempotent) بلا قيدٍ ثانٍ.
9. **التنظيف** — لا مستندَ مُرحَّلاً يشير إلى فاتورةٍ ملغاة، وما لا يُحذف (فواتير الفحص)
   يبقى مرقّماً، والقيود تزيد بمقدار ما رُحّل.

**النتيجة الحيّة:** `✅ 40/40 checks passed` في تشغيلين متعاقبين (2026-09-20، مستأجر
`demo`). والرصيد يستقرّ على **49** لا 50: بيعُ §5 النقدي يبقى مُرحَّلاً (مدفوعٌ لا يُلغى
— §8)، ولا يُنظَّف بالحذف عمداً.

### R2.5 ما اخترعناه

1. **«🗑️ حذف» ⇒ «🗑️ إلغاء الفاتورة»**: `DeleteInvoice` (`InvoiceOper.cs:4419`) حذفٌ ناعم
   لا محو — `Inv.IS_Deleted=1` و`Entry.IS_Deleted=1, state=2`. والسحابة تفعل الثلاثة
   صراحةً: قيدٌ عكسي مرتبط بـ`reversalOf` + عكس كل حركة مخزون (`sales_void`) + الحالة
   `voided`، فالتسمية تقول ما يحدث. والتسمية الحرفية نفسها تبقى في وثيقة النافذة (:1260).
2. **«ترحيل» ليست في النافذة** فلم تُضف: الديسكتوب لا يفصل حفظاً عن ترحيل — `btnSave`
   ينادي `SaveInvoice` + `BindToEntry` + `SendZatca` في نداءٍ واحد. والسحابة **أعمق**:
   الحفظ مسودّة والترحيل محرّكٌ مستقلّ، فبقي زرُّ الديسكتوب `💾 حفظ` على حاله، ووُضع
   الزرّان معاً (`💾 حفظ` و`💾🖨️ حفظ + طباعة`) ووصفُ الشاشة يقول صراحةً إن الحفظ مسودّة.
3. **عمودُ «الخصم» بين المُدخَل والمحسوب**: الديسكتوب يُدخل **مبلغ** الخصم
   (`ItemDiscount` ب`StringFormat=N2` L799)، والسحابة تأخذ **نسبة** ثم تحسب المبلغ. فبقي
   الإدخال `خصم %` (يسمّي ما يُكتب فعلاً) وأُضيف عمود `الخصم` المحسوب بجواره، فالمبلغُ
   الذي يقرؤه المستخدم هو الذي يخزّنه الخادم.
4. **لا صندوقَ يفصل عن بنكٍ في القائمة**: الديسكتوب جدولان (`🏦 الصندوق` · `🏛️ البنك`)
   والسحابة موقعٌ واحد (`cash_locations.kind`)، فالقائمة تعرض المواقع كلها والتسمية تتبدّل
   بحسب `💳 طريقة الدفع`. (ومستأجر العرض بنكيّ الموقع الوحيد، فالسكربت يختار `cash` إن
   وُجد وإلا `bank` — والتحصيل يحتاج حساباً محاسبياً مربوطاً وإلا `422 SALES_SETTLEMENT_ACCOUNT_REQUIRED`.)
5. **«🔻 خصم» رأسٌ لا خانةُ نسبة**: الديسكتوب يُدخل المبلغ والنسبة ويحسب الأخرى
   (`GetDiscountPercentage` L1426–1429). والسحابة تحمل مبلغاً واحداً (`invoiceDiscount`)،
   فخانة النسبة لم تُنقل — النسبة تُحسب يدوياً ولا تُكتب في المستند.
6. **ما في النافذة وليس في السحابة (مؤجَّلٌ صراحةً)**: `📝 البيان` (:581) و`📦 الباركود`
   (:587) — `SalesInvoiceInput` لا يحملهما اليوم (لا `notes`)، فلا يُدَّعى نقلُهما ·
   ~~`📊 مركز التكلفة` (:530)~~ ✅ **أُغلق في §R9** و~~`🔢 التسلسلي`~~ ✅ **أُغلق في §R8** · وزرُّ `🔄 مرتجع` (:355) له مسارٌ
   في المحرّك (والسكربت يختبره) بلا زرٍّ في الشاشة بعد · و`📋 عرض سعر` (:1247) و`👁️ معاينة`
   (:1251) و`🖨️ طباعة 2` (:1214) و`🧾 سند قبض` (:1202) خارج نطاق R2.
7. **`apps/staff/lib/posting.ts` بقي كما هو**: البند الثالث في متابعات §2 كان «بنّاءاتٌ
   ميتة تُحذف». التحقّق (لا الظنّ) أثبت أن `periodForDate` و`POSTING_ACCOUNT_LABELS`
   و`PostingProfile` مستعملةٌ فعلاً في `hrm/payroll/[id]` و`projects/[id]` و
   `settings/posting-profiles` — فلا حذف، ويُغلق البند بالتحقّق لا بالتخمين.

### R2.6 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| رمزا السلسلة وحالاتهما | `packages/contracts/src/errors.ts` — الرموز L75–78 · الحالات L126–127 · العنوانان L169–170 |
| الحارسان | `apps/api/src/modules/sales/sales.service.ts` — حارس الإلغاء بعد `SALES_VOID_HAS_PAYMENTS`، وحارس الترحيل قبل `isReturnKind` (كلاهما في المعاملة، قبل أي كتابة) |
| الاختبار | `apps/api/test/sales-posting.spec.ts` — **10/10** (سبيكان جديدان: السلسلة كاملة، ومسودّة المسار تُمنع عند ترحيلها بعد الإلغاء) ⇒ حزمة الـAPI **1307** |
| التحقّق الحيّ | `scripts/verify-sales-engine.mjs` — **40/40 في 9 أقسام**، تشغيلان متعاقبان |
| التسميات | `apps/staff/app/sales/invoices/new/page.tsx` · `app/sales/invoices/[id]/page.tsx` · `apps/staff/components/invoice-editor.tsx` (`InvoiceLines` + `TotalsPanel`) |
| المرآة للمشتريات | `apps/staff/app/purchases/invoices/new/page.tsx` يمرّر `variant="purchase"` فتنطق اللوحة الصفوف الخمسة بكلمات نافذة الشراء نفسها (§R2.1) |
| الوثائق | هذا القسم · `AUDIT_PHASES_01_04.md` §6 (R2 ✅) · `docs/STATUS.md` · `apps/staff/README.md` |

**البوابات (2026-09-20):** api **1307/149** (كان 1305) · contracts **232** · staff **37** ·
database **17** · `tsc --noEmit` للـapi وللـstaff ✓ · eslint **0 أخطاء** · بناءا
`@erp/api` و`@erp/staff` ✓.

---

## R8 — الأرقام التسلسلية والدفعات على سطور فواتير البيع والشراء (2026-09-21)

§R2.5 البند 6 سمّى `🔢 التسلسلي` مؤجَّلاً («`SalesInvoiceInput` لا يحملها اليوم»)، و§R3.5 البند 4
سمّى `تاريخ الإنتهاء` كذلك، و§13 من `PHASE_05_INVENTORY.md` كتب العبارة التي أغلقت البند:
«**The five invoice modules** (sales, purchase, and their returns, plus quotations) still write
their lines without numbers … the sales and purchase documents get the same treatment when
their phases land, off the same `stock_document_serials` table» — والمرحلتان 02 و03 قد حلّتا،
وهذا القسم يسدّ البند: الرقم التسلسلي والدفعة على **سطر الفاتورة**، بالمسار نفسه الذي أثبته
§12 و§R5 على المستندات المخزنية.

### R8.1 المصادر (ملفات `Desktop_ERP`، تُقرأ بـ`git ls-files`)

| الملف | الأسطر | ما أُخذ منه |
|---|---|---|
| `Class/InvoiceOper.cs` | 5519 | `INSERT into InvoiceItemDetail(…, ItemSerialNo, BatchNo, ItemProductionDate, ItemExpireDate, …)` :1635 · القراءة العائدة عند فتح المستند :3885 · تاريخٌ فارغ ⇒ «الآن + سنتان» :1586–1590 |
| `Form_WPF/frmInvSale.xaml` | 1273 | خانة الرأس `🔢 التسلسلي:` :592 (`txtSrchSerialNo`) · قائمة السياق «🔢 الرقم التسلسلي» :679 · عمود الدفعة على الشبكة :876 |
| `Form_WPF/frmInvSale.xaml.cs` | 3875 | `txtSrchSerialNo_KeyDown` :3599 (الفأرة على `Enter`) ← `SearchBySerialNo` :722 · الرسائل الثلاث :733 · :769 · :780 · `MenuItemSerialNo_Click` :1121 ← `temSerialNo` :1247 (يفتح `frmItemSerialNo` على سطور الصنف) |
| `Form_WPF/frmInvPurch.xaml` | 1454 | «🔢 الرقم التسلسلي» في قائمة سياق شبكة الشراء :714 |
| `Form_WPF/frmInvPurch.xaml.cs` | — | `MenuItemSerialNo_Click` :897 ← `ShowItemMoreDetails` :1007 (النافذة نفسها، وتعيد حساب كمية السطر بعد إغلاقها) |

**ثلاثة معانٍ استُخرجت من الكود:** (١) الأرقام تُكتب على **السطر** لا على الرأس — فسطران لنفس
الصنف لهما رقمان مختلفان؛ (٢) حالة الرقم في الديسكتوب **محسوبة** من مجموع حركاته
(`stockIn - stockOut` :740–753) لا من عمود حالة، والسحابة تقرأ الحالة المحسومة في
`item_serials` ومعها المستندات التي سافر فيها الرقم؛ (٣) عدد الأرقام = عدد القطع، والرسائل
تقول ذلك قبل الكتابة («تم إدراج هذا الرقم التسلسلي من قبل»).

### R8.2 جدول التسميات — النص الحرفي وأين طُبِّق

| التسمية الحرفية | السطر | موضعها في السحابة |
|---|---|---|
| `🔢 التسلسلي:` | `frmInvSale.xaml:592` | خانة رأس `sales/invoices/new` و`purchases/invoices/new` (تُقرأ بـ`Enter` كما في النافذة) |
| `📁 رقم الدفعة` | `frmItemSerialNo.xaml:434–460` (نُقلت في §R5) | عمود على شبكة السطور في الشاشتين، وعمود على بطاقتَي `sales/invoices/[id]` و`purchases/invoices/[id]` |
| `🔢 التسلسلي` | `frmItemSerialNo.xaml:434–460` | العمود المجاور، وبطاقة المستند |
| `تم إدراج هذا الرقم التسلسلي من قبل` | `frmInvSale.xaml.cs:733` | رسالة `SERIAL_MESSAGES.alreadyListed` (`lib/serial-numbers.ts`) |
| `تم بيع أو إخراج هذا الرقم التسلسلي` | `frmInvSale.xaml.cs:769` | `SERIAL_MESSAGES.sold` |
| `لا يوجد صنف بهذا الرقم التسلسلي` | `frmInvSale.xaml.cs:780` | `SERIAL_MESSAGES.notFound` |

### R8.3 المحرّك

- **الترحيل `0089_invoice_line_numbers.sql`**: `serial_nos jsonb` · `lot_id` · `batch_no` ·
  `production_date` · `expiry_date` على `sales_invoice_lines` و`purchase_invoice_lines`
  (+ فهرسان للدفعة وفهرسا GIN للأرقام)، وتراجعٌ في `migrations/down/`. إضافةٌ فقط: الفواتير
  القائمة تبقى كما هي.
- **منفذٌ واحد يمرّ منه المحرّكان**: `InventoryService.resolveInvoiceLineNumbers` — يحسم
  الدفعة (بحثاً أو إنشاءً، بتواريخها، عبر `resolveUploadedLots` نفسها) والأرقام التسلسلية
  (تُنشأ في الإدخال · تُصرف في البيع · **تعود** في المرتجع)، ثم تكتب الخدمة المستدعية النتيجة
  على سطورها. ولا تعرف الوحدة المخزنية شكل جداول الفواتير، ولا تستورد وحدة البيع شيئاً جديداً.
- **«القطعة تعرف عبوّتها»**: سطرٌ كتب أرقاماً ولم يكتب دفعةً يأخذ دفعة الأرقام إذا كانت كلها
  من عبوّةٍ واحدة (وتُكتب على الأرقام نفسها)، فتقرأ فاتورةُ البيع رقمَ العبوّة وتاريخ انتهائها
  بلا أن يكتبهما المُدخِل مرّةً ثانية — وتعدد العبوات **يسكت** (لا تُخترع دفعةٌ لسطرٍ جمع
  قطعتين من عبوتين).
- **الإلغاء يعكس الأرقام**: قطعةُ بيعٍ ملغاة تعود إلى الرفّ، وقطعةٌ رجعت بمرتجعٍ ملغى تعود
  «مباعة»، والرابط يُحذف فلا يبقى تتبّعٌ معلّق إلى مستند ملغى.
- **الترتيب**: حركة المخزون أولاً ثم الأرقام — فسطرٌ لا يكفيه الرصيد يُرفض بـ`STOCK_INSUFFICIENT`
  قبل فحص العدد، وهو الفحص الأسبق معنىً.
- **`GET /inventory/serials/lookup?serialNo=`**: يجيب «أيُّ صنفٍ، وعلى الرفّ أم بيع، وفي أي
  مستنداتٍ سافر» — وهو ما كانت خانة النافذة تجيب عنه بحساب الحركات.
- **التكرار يُزال**: «SN-1, SN-1» على سطرٍ = قطعةٌ واحدة (تنظيفٌ عند الإدخال لا عند الترحيل).

### R8.4 ما اخترعناه

1. **الخانة في الرأس لا في نافذةٍ منبثقة**: الديسكتوب يفتح `frmItemSerialNo` من قائمة السياق
   لتعديل أرقام صنفٍ ما، والسحابة تجعل الخانة في متناول اليد في الشاشة نفسها وتُضيف السطر بها
   — لأن نصّ «🔢 التسلسلي:» في الرأس هو ما يقابله المُدخِل أولاً (`:592`).
2. **رسالتان سحابيّتان** ليستا في النافذة، وسببهما أنّ الديسكتوب لا يقابلهما: «اكتب رقماً
   تسلسلياً للبحث» (خانةٌ فارغة — الديسكتوب يبحث بالفارغ فيفشل صامتاً)، و«تحتاج صلاحية عرض
   المخزون للبحث بالرقم التسلسلي» (رمز `inventory.view`).
3. **نجاحٌ بلا رسالة**: إضافة السطر بالرقم هي الدليل، فلا نصَّ مخترَعاً يقول «تمت الإضافة».
4. **تذكرة نقطة البيع بلا عمودَي الأرقام**: الكاشير يمرّر الباركود، والأرقام تُكتب في شاشة
   الفاتورة — والجدول المشترك (`components/invoice-editor.tsx`) يعرض العمودين بـ`withNumbers`
   فحيث يلزم.
5. **`withNumbers` لا شبكة ثانية**: الأعمدة تُضاف إلى المكوّن نفسه الذي يحسب الإجماليات بـ
   `calculateInvoiceTotals` — فما يُقرأ قبل الحفظ هو ما يُخزَّن بعينه.

### R8.5 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| الترحيل وتراجعه | `packages/database/migrations/0089_invoice_line_numbers.sql` · `migrations/down/0089_….down.sql` |
| الأعمدة في الـschema | `packages/database/src/schema/sales.ts` · `schema/purchases.ts` |
| حسم الأرقام | `apps/api/src/modules/inventory/inventory.service.ts` (`resolveInvoiceLineNumbers` · `releaseInvoiceLineNumbers` · `lookupSerial` · `resolveLineSerials` بحالة `return`) · `inventory.controller.ts` |
| رموز التسلسلي الستة | `packages/contracts/src/errors.ts` — `SERIAL_DUPLICATE` **409** · `SERIAL_NOT_FOUND` · `SERIAL_COUNT_MISMATCH` · `SERIAL_INVALID_STATE` · `SERIAL_WRONG_WAREHOUSE` · `SERIAL_NOT_RETURNABLE` (كلها **422**) — أُعلنت هنا بعد أن كانت تُرمى `DomainError` عارياً فيخرج عنوان الردّ «Request failed» |
| محرّكا الفواتير | `apps/api/src/modules/sales/sales.service.ts` · `modules/purchases/purchases.service.ts` |
| الاختبار | `apps/api/test/invoice-line-numbers.spec.ts` — **11/11** |
| التحقّق الحيّ | `scripts/verify-invoice-numbers.mjs` — **23/23 في 6 أقسام** |
| الشاشات | `apps/staff/components/invoice-editor.tsx` · `app/sales/invoices/new/page.tsx` · `app/purchases/invoices/new/page.tsx` · `app/sales/invoices/[id]/page.tsx` · `app/purchases/invoices/[id]/page.tsx` |
| منطق الخانة (نقيّ) | `apps/staff/lib/serial-numbers.ts` + `apps/staff/tests/serial-numbers.spec.ts` — **6/6** |
| الوثائق | هذا القسم · `PHASE_03_PURCHASE_ENGINE.md` §R8 · `PHASE_05_INVENTORY.md` §13 · `docs/STATUS.md` · `docs/API_CONTRACT.md` |

**البوابات (2026-09-21):** api **154 ملفاً / 1358 اختباراً** · contracts **25/232** · staff
**6 ملفات/44** · `tsc` للـapi وللـstaff ✓ · eslint **0 على الملموسة** · بناء الـapi والـstaff ✓ ·
ترحيلات **89** (0089 جديد · بلا ترحيل بيانات).

---

## R9 — 📊 مركز التكلفة على فاتورة البيع والشراء (2026-09-21)

البند المؤجَّل من §R2.5 (البند 6) و§R3.5 (البند 4). الديسكتوب يحمل المركز على **الرأس** (قائمة
«📊 مركز التكلفة:» في نافذة البيع و`Invoices.CCcode`) وعلى **السطر** (`Inv_Sub.ItemCostCenter`)،
ويوسم به حساب البند عند بناء القيد. والسحابة كانت تقبل `costCenterId` في الطلب و**تُسقطه
صامتةً**: لا عمود على رأس البيع ولا على سطره، ولا وسمَ في القيد، ولا صفّ واحد في كشف مركز
الكلفة. الدليل الحيّ قبل البناء (2026-09-21، `demo`): `POST /cost-centers` **201** ثم
`POST /sales/invoices` بالمركز رأساً وسطراً ⇒ **201 والحقل غائبٌ من الردّ**، وكشف المركز
**0 صفوف**؛ و`cost_center_id` كان موجوداً على `journal_entry_lines` و`purchase_invoice_lines`
وحدهما.

### R9.1 المصادر (ملفات `Desktop_ERP`، تُقرأ بـ`git ls-files`)

| المرجع | الموضع | ما أُخذ منه |
|---|---|---|
| `Form_WPF/frmInvSale.xaml:530` | `cmbCostCenter` | «📊 مركز التكلفة:» على رأس فاتورة البيع |
| `Form_WPF/frmInvPurch.xaml:467` | نفس القائمة | «📊 مركز التكلفة» على رأس فاتورة الشراء |
| `Class/InvoiceOper.cs:1635` | `InsertInvoiceItems` | `ItemCostCenter` يُكتب على سطر الفاتورة |
| `Class/InvoiceOper.cs:2432` | بناء `account` | مركز **السطر** يسبق: `account.CCcode = invoiceItem.ItemCostCenter` |
| `Class/InvoiceOper.cs:2457–2461` | بناء `account` للطرف | فإن خلا السطر ⇒ مركز **الرأس** (`inv.InvCCcode`)، وإن خلا الرأسان ⇒ `-1` |
| `Inv_Sub.ItemCostCenter` (جداول SQL :1625/1815/3368) | العمود | اسمه في القاعدة القديمة، ومنه جاء اسم العمود الجديد |
| `Class/Print.cs:772` | طباعة الفاتورة | المركز يُطبع **باسمه** لا بمعرّفه |

### R9.2 المحرّك

- **الترحيل `0090_invoice_cost_centers.sql`**: `sales_invoices.cost_center_id` ·
  `sales_invoice_lines.cost_center_id` · `purchase_invoices.cost_center_id` (و`purchase_invoice_lines`
  كان يحمله من قبل)، بأربعة فهارس جزئية و`COMMENT ON`، وتراجعٌ في `migrations/down/` **لا
  يحذف** عمود الشراء السابق. إضافةٌ فقط: الفواتير القائمة تبقى كما هي (مركزها `NULL`).
- **`splitByCostCenter`** (`apps/api/src/common/cost-center-split.ts`): يحوّل رجلاً مجمَّعة إلى
  رجلٍ لكل مركز بوزن مبالغ السطور. ثلاث قواعد تحكمه: الوزن الصفري يُهمَل (سطرٌ مجانيّ لا
  يُنشئ رجلاً بصفر)؛ **بلا أي مركزٍ مُسمّى يعود فارغاً** فلا يتغيّر قيدُ فاتورةٍ بلا مراكز بحرف؛
  و**آخر مجموعة تحمل فرق التقريب** فمجموع الرجل يساوي الرجل الأصلية إلى الرابع العشري.
- **الترتيب**: مركز السطر ثم مركز الرأس — `InvoiceOper.cs:2432` ثم `:2461` — وهو ما تعنيه
  «سطرٌ لا يذكر مركزاً يورث مركز الرأس».
- **الأرجل الموسومة**: الإيراد (والمرتجع)، تكلفة البيع والمخزون في الاتجاهين، ومخزون الشراء
  (والمرتجع). **ولا تُوسم** رجل الذمة ولا الصندوق/البنك ولا الضريبة ولا المصاريف — الذمة ليست
  مركز تكلفة، والضريبة في الديسكتوب كذلك بلا `CCcode`. الصفوف/المصاريف تحمل مركزها من قبل.
- **الإلغاء يعكس بالأبعاد كلها**: مسار `void` في المحرّكَين كان يبني المرآة بالمعرّف والمبلغ
  والطرف والوصف **ويسقط `costCenterId` و`salesmanId` و`branchId` والعملة والمعدّل** ⇒ فاتورةٌ
  ملغاة يبقى مالُها في 🌳 شجرة مراكز التكلفة وفي تقرير المندوبين. وهو العيب نفسه الذي أُصلح في
  `reverseJournal` بالترحيل `0047` وبقي في مسار الفاتورة؛ أُصلح هنا في المسارين.
- **الحارس**: `AccountingService.assertCostCentersInTx` ⇒ `404 COST_CENTER_NOT_FOUND` لأي مركزٍ
  مُسمّى (رأساً أو سطراً) لا يخصّ المستأجر — قبل أي كتابة، والرسالة تسمّي `costCenterId`.
- **الردّ**: `costCenterId` يُعاد على رأس الفاتورة وعلى كل سطر في `GET`/`POST` للمحرّكَين.

### R9.3 التسميات — النص الحرفي وأين طُبِّق

| النص | المصدر | الموضع |
|---|---|---|
| `📊 مركز التكلفة:` | `frmInvSale.xaml:530` | حقل رأس «فاتورة مبيعات جديدة» |
| `📊 مركز التكلفة` | `frmInvPurch.xaml:467` | حقل رأس «فاتورة مشتريات جديدة» · عمود شبكة السطور · عمود بطاقة الفاتورة · صفّ في «بيانات الفاتورة»/بطاقة الشراء |
| `— بلا مركز —` | سحابيّ | الخيار الأول في القائمتين (الديسكتوب يقابلها مركز `-1` بلا اسم) |
| `— مركز الفاتورة —` | سحابيّ | الخيار الأول في قائمة عمود السطر: الفراغ = **يرث** مركز الرأس |
| `مركز الفاتورة كلها — ولكل سطرٍ أن يخالفه من عموده.` | سحابيّ | تلميح تحت الحقلين |
| `اتركه فارغاً ليأخذ مركز رأس الفاتورة` | سحابيّ | `title` على قائمة السطر |

### R9.4 ما اخترعناه

1. **قائمة واحدة للرأس وللسطر** لا نافذة إدارة مراكز داخل الفاتورة: الديسكتوب يفتح
   `frmCostCenter` من الزرّ المجاور؛ والسحابة تُدير المراكز في شاشة «مراكز التكلفة» وتقرأها
   الفاتورة — فلا نسختان من الشجرة.
2. **الفراغ في السطر يعني «مركز الرأس»** لا «بلا مركز»: هذا نصّ `InvoiceOper.cs:2461`، ولذلك
   يُخزَّن `NULL` على السطر الصامت ويُقرأ عند **بناء القيد** (وقت الحسم)، فلا يُجمَّد مركزُ
   الرأس في السطر إن غُيِّر الرأس بعد الإنشاء.
3. **تقسيم الإيراد بوزن الصافي وتقسيم التكلفة بوزن التكلفة**: لا وزن ثالث مخترَع — كل رجلٍ
   تُوزَّن بمبالغ السطور التي أنتجتها.
4. **الضريبة والذمة غير موسومتين**: وسمُهما كان سينقل مالاً لا يخصّ أي مركز إلى كشفه.
5. **`COST_CENTER_NOT_FOUND` رمزٌ جديد (404)** لا `VALIDATION_FAILED`: الخطأ خطأُ إشارةٍ إلى
   كائنٍ غير موجود، ويُصلَح باختيار مركزٍ صحيح لا بتصحيح صيغة.
6. **تذكرة نقطة البيع بلا العمود**: القائمة كلها في شاشة الفاتورة، كما تُرك الرقم التسلسلي في R8.

### R9.5 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| الترحيل وتراجعه | `packages/database/migrations/0090_invoice_cost_centers.sql` · `migrations/down/0090_….down.sql` |
| الأعمدة في الـschema | `packages/database/src/schema/sales.ts` · `schema/purchases.ts` |
| التقسيم (نقيّ) | `apps/api/src/common/cost-center-split.ts` |
| الحارس والرموز | `apps/api/src/modules/accounting/accounting.service.ts` (`assertCostCentersInTx`) · `packages/contracts/src/errors.ts` (`COST_CENTER_NOT_FOUND` **404**) |
| المحرّكان | `apps/api/src/modules/sales/sales.service.ts` · `modules/purchases/purchases.service.ts` |
| الاختبار | `apps/api/test/invoice-cost-centers.spec.ts` — **7/7** |
| التحقّق الحيّ | `scripts/verify-invoice-cost-centers.mjs` — **22/22 في 8 أقسام** |
| الشاشات | `apps/staff/components/invoice-editor.tsx` (عمود السطر) · `app/sales/invoices/new/page.tsx` · `app/purchases/invoices/new/page.tsx` · `app/sales/invoices/[id]/page.tsx` · `app/purchases/invoices/[id]/page.tsx` |
| سبيك الشاشة | `apps/staff/tests/invoice-cost-centers.spec.ts` — **3/3** |
| الوثائق | هذا القسم · `PHASE_03_PURCHASE_ENGINE.md` §R9 · `docs/STATUS.md` · `docs/API_CONTRACT.md` · `INCOMPLETE_INVENTORY.md` |

**البوابات (2026-09-21):** api **155 ملفاً / 1365 اختباراً** · contracts **25/232** · staff
**7 ملفات/47** · platform-admin 2/24 · marketing **11 ملفاً/98 (+1 متخطّى)** · `tsc` للـapi
وللـstaff ✓ · eslint **0** · بناء الـapi والـstaff ✓ · ترحيلات **90** (0090 جديد، ومُتحقَّقٌ من
تراجعه: أُعيد ثم أُعيد تطبيقه). **وعيبان قديمان كشفهما الفحص الشامل في هذه البوّابة وأُصلحا**:
(١) `apps/api/test/report-inventory.spec.ts` كان يثبّت «باقي أشهر = 0» لدفعةٍ تنتهي بعد 10 أيام،
والتقرير يحسب فروق أشهرٍ تقويمية ⇒ يفشل كلّما وقع الانتهاء في الشهر التالي (وقد وقع) — صار
السبيك يحسب المتوقّع بالحساب نفسه؛ (٢) `apps/marketing/lib/industries.ts` كان يشير إلى
«إعدادات ربط سلة» عند `navigation.ts:1738`، وأزاحته R7 إلى **1748** حين أضافت «مدير الملفات»
فوقه بعشرة أسطر ⇒ `tests/verify.spec.ts` يسقط (ولم تكن سبيكات التسويق في بوّابة R7، فلذلك
لم يُرَ وقتها) — صُحّحت الإشارة.

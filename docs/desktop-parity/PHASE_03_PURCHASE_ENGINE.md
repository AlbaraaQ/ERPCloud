# Phase 03 — Purchase engine (done 2026-09-10)

Desktop reference: `Class/InvoiceOper.cs` `BindToEntry` purchase mirror
(supplier Cr / purchases Dr / discount-received Cr / VAT-input Dr / cash legs),
`ItemOper.ItemAdditonalCos` (additional cost pro-rata by line value:
`cost × (itemTotal / invTotal) / qty`), `ItemOper.AvgCost` (moving average).

Rule of the phase: same engine pattern as Phase 02 — posting is one engine, not
caller-supplied lines. The draft stays permissive; `POST
/purchase-invoices/:id/post` enforces the gates and writes stock + landed costs
+ journal in a single transaction.

## 3A. Posting engine — `post()` mirrors SaveInvoice + BindToEntry

`apps/api/src/modules/purchases/purchases.service.ts`:

- **Gates:** `PURCHASE_WAREHOUSE_REQUIRED` (422, only when stocked `stock`-kind
  lines exist — service purchases post warehouse-free), `PURCHASE_TOTAL_INVALID`
  (422, negative purchase), `PURCHASE_FISCAL_PERIOD_REQUIRED` (422, legacy
  explicit-lines path only). Supplier is already enforced at creation.
- **Numbering:** `PI-/PR-` + 6 digits, allocated inside the posting transaction
  (moved before the journal so the auto description carries the number; the
  legacy explicit path keeps its byte-identical description).
- **Stock (perpetual, desktop moving average):** stocked lines receive at landed
  unit cost (`inWithCost`, freight etc. via the existing `allocateLandedCost`,
  whose by-value default matches `ItemAdditonalCos`); each line keeps its
  `allocatedCost`/`landedTotal`/`unitCostAtPost` stamping. Returns relieve at the
  current average (`outAtAvg`) — the only correct perpetual behaviour. Service
  lines never touch the ledger (previously they raised `STOCK_INSUFFICIENT`).
- **Journal (`buildAutoJournal`, gross method, from the resolved profile):**
  purchase = Dr inventory (landed stocked + stocked discount share) / Dr
  purchases (non-stock nets + share) / Dr VAT-input / Dr excise / Dr each
  expense-cost account (with its cost center) / Cr discount-received / Cr
  settlement. The header-discount stocked/non-stock split reuses the desktop
  gross weights, so the earned discount keeps its contra leg and the entry
  balances by construction. Expense costs without an account are refused with
  `PURCHASE_COST_ACCOUNT_REQUIRED` (named cost); all non-profile accounts are
  tenant-validated (`PURCHASE_POSTING_ACCOUNT_INVALID`). Withholding purchases
  are refused with `PURCHASE_WITHHOLDING_MANUAL_POSTING`, like sales.
- **Returns:** stocked goods go straight against inventory at the relieved
  (average) value — no contra leg; only services use `purchaseReturnAccountId`;
  VAT/excise/expense legs mirror; the price-vs-average drift posts to COGS
  (gain = Cr, loss = Dr, labelled `فرق متوسط التكلفة — مردود مشتريات`),
  skipped when zero.
- **Settlement:** `credit`/`cash`/`bank` + tenant-validated `settlementAccountId`.
  Cash/bank purchases debit no party subledger on the till leg, record the first
  payment in `payment_allocations`, and land `paid`. Returns never fabricate a
  payment row.
- **Legacy compatibility:** explicit `journalLines` keep the old behaviour
  untouched (POS still posts this way until Phase 04).
- **Void:** was flag-only (journal + stock left behind). Now reverses the
  journal (mirror linked by `reversalOf`, original marked `void`), mirrors every
  stock movement (`purchase_void`), then flips the status. Guards:
  `PURCHASE_VOID_REASON_REQUIRED`, `PURCHASE_VOID_HAS_PAYMENTS`.

## 3B. Specs — `test/purchase-posting.spec.ts` (8 tests, green)

Profile purchase keys resolve; post writes the 5-leg journal
(Dr inventory 1100 / Dr VAT 147 / Dr expense 50 / Cr discount-received 20 /
Cr payable 1277), receives 10 units @108 landed, and stamps the line;
warehouse gate fires for stocked but not services (services Dr purchases, no
inventory leg); negative totals refused; account-less expense costs refused;
return relieves 4 units at 108 average with Dr COGS 32 (unrefunded freight) and
a balanced entry; cash purchase lands `paid 115.0000` against the till; void
restores the stock level exactly and links the reversal, while a paid purchase
is refused with `PURCHASE_VOID_HAS_PAYMENTS`. Full API suite: **74 files /
414 tests green**; no existing suite touched purchase posting, so no
provisioning upgrades were needed.

## 3C. Staff screens

- `purchases/invoices/[id]`: the post action no longer builds journal lines in
  the browser — it sends `{ settlement, settlementAccountId,
  settlementCashLocationId }` with a till/bank picker for cash/bank. The cost
  form gained an allocation-target selector (inventory vs direct expense) with
  an expense-account picker (postable expense accounts only); posting is
  pre-guarded when a direct expense lacks an account.
- `purchases/invoices/new`: warehouse is no longer forced at draft creation
  (services need none) with a posting hint for stocked lines, branch-scoped
  warehouses, and the discount-reduces-VAT note. Staff builds green.

## 3D. Live verification (demo tenant, 2026-09-10)

10×100 − 20 @15% + 100 freight → `PI-000001`, total `1227.0000`, balanced
journal (Dr 1270001 1100 / Dr 2222001 147 / Cr 3200003 20 / Cr 22111001 1227);
stock 48 @40 + 10 @108 → 58 @51.7241 (moving average confirmed); return of 2
posted `PR-000001`, back to 56 @51.7241.

## Follow-ups (not this phase)

- `apps/staff/app/sales/pos/page.tsx` still posts via explicit lines
  (`salesJournalLines` + `inventoryLinesFor` + a second COGS journal) — Phase 04
  migrates POS onto the engine (including cash-shift settlement).
- `apps/staff/lib/posting.ts`: `purchaseJournalLines` is now unused;
  `salesJournalLines`/`inventoryLinesFor`/`cogsAmountFor`/`requireAccount`/
  `loadPostingProfile` remain only for POS — remove after Phase 04.
- ~~Voiding a purchase that already has returns posted against it is allowed
  (same documented caveat as sales `SALES_VOID_HAS_RETURNS`).~~ **Closed in §R3.3:**
  the engine now refuses the void with `PURCHASE_VOID_HAS_RETURNS` (409) while a
  *posted* derived document points at the invoice, and refuses to post a derived
  document whose invoice was voided (`PURCHASE_REFERENCE_VOIDED`). Both directions
  are covered by specs and by the live script.
- ~~`GET /purchase-invoices/:id` returns lines + costs but no payments; the cash
  settlement row is visible via paidTotal/paymentStatus only.~~ **Closed in §R3.3:**
  the read now returns `payments` (ordered by `allocatedAt`), and the invoice
  screen renders them.

## R3 — مطابقة نافذة فاتورة المشتريات (تكملة المرحلة 03 · 2026-09-20)

المرحلة 03 بنت محرّك الشراء ولم تفتح النافذة المكتبية. `AUDIT_PHASES_01_04.md` §4.3
سجّل الفجوة (0 إحالة سطر · 27 حرفاً عربياً · بلا سكربت)، وهذا القسم يسدّها بنفس معايير
§R2: مصادرُ بأسطرها، وجدولُ تسمياتٍ حرفيّ مطبَّقٌ على `purchases/invoices/new` و`[id]`،
وحارسا سلسلة المستندات، وسكربتُ تحقّقٍ حيّ يعيد أرقام §3D حرفياً. وأثناء كتابة السكربت
ظهر **عيبٌ حقيقي في محرّك المخزون** (§R3.4) فأُصلح.

### R3.1 المصادر (ملفات `Desktop_ERP`، تُقرأ بـ`git ls-files`)

| الملف | الأسطر | ما أُخذ منه |
|---|---|---|
| `Form_WPF/frmInvPurch.xaml` | 1454 | **النافذة المرجعية**: Title L7 «فاتورة المشتريات» · تبويب «📄  الفاتورة  » L290 · ترويسة الحقول L325–L550 · «📦 الباركود»/«بدون ضريبة»/«عادي/تلقائي» L592–L640 · أعمدة «📋 بنود الفاتورة» L665–L867 · لوحة الملخّص L920–L1026 · تبويب «🔍  البحث  » L1122–L1290 · لوحة الإجماليات L1056–L1101 · الأزرار L1396–L1437 |
| `Form_WPF/frmInvPurch.xaml.cs` | 2879 | `cmbPayType.Items` = «آجلة»/«نقدية»/«بنك» L191–193 · رسائل الحفظ والتحقّق L1200–L1275 · بدء الحفظ L1228 · تأكيد عدم التوريد L1316 · رسائل الطباعة والمعاينة L1615/L1623 |
| `Form_WPF/frmPurchInv.xaml` · `.cs` | 1418 · 2506 | النسخة المبسّطة من النافذة نفسها (أزرار «🗑️» L1362 · «💾» L1374 · «💾🖨️ حفظ مع طباعة» L1386) — لا تُقتبس التسميات منها حيث تختلف |
| `Class/ItemOper.cs` | `CalcTotal` L1533 · `AvgCost` L162 · `ItemAdditonalCos` L2086 | دلالة أعمدة البنود (`ItemSumPrice`/`ItemDiscount`/`ItemVat`/`ItemNetPrice`) · المتوسط المتحرّك · نسبة التكلفة الإضافية للصنف |
| `Class/InvoiceOper.cs` | مرآة الشراء | قيود الفاتورة والمردود كما في B3B (وقيدُ الشراء الخماسي أعلاه) |

**ولماذا `frmInvPurch` لا `frmPurchInv`؟** لأن الأولى هي التي استُشهد بها في §R2.1 وفي
§4.3 من التدقيق، وهي الأكمل (الملخّص والتبويبات)؛ والثانية نسخةٌ مبسّطة بأزرارٍ عارية.

### R3.2 جدول التسميات — النص الحرفي وأين طُبِّق

| التسمية الحرفية | السطر | موضعها في السحابة |
|---|---|---|
| `فاتورة المشتريات` | `frmInvPurch.xaml:7` | عنوان شاشة الإنشاء (وتبويبها `📄  الفاتورة  ` :290) وشاشة الفاتورة |
| `💳 طريقة الدفع` | :330 | قبل الترحيل، وخياراتها الثلاثة بنصّها: `آجلة`/`نقدية`/`بنك` (`frmInvPurch.xaml.cs:191–193`) |
| `🏦 الصندوق` | :340 | التسمية عند `نقدية`، والعمود نفسه يُسمّى `🏦 البنك` عند `بنك` (:424) |
| `🔢 الرقم` | :366 | `🔢 الرقم` في بطاقة الفاتورة (رقم المستند، ويُمنح عند الترحيل — وفي الديسكتوب `txtNo` للقراءة فقط) |
| `👤 اسم المورد` | :383 | قائمة الموردين في شاشة الإنشاء |
| `🏪 المستودع` | :414 | منتقي المستودع (والشرط: فاتورة أصنافٍ مخزنية بلا مستودع تُرفض `PURCHASE_WAREHOUSE_REQUIRED`) |
| `📅 التاريخ` · `🕐 وقت الفاتورة` | :434 · :503 | بطاقة الفاتورة: التاريخ والوقت (مأخوذان من `createdAt`) |
| `📊 مركز التكلفة` | :467 | على رأس الفاتورة (`costCenterId`) وعلى سطرها — ✅ **§R9** (وكان على المصروف الإضافي وحده) |
| `💰 الرصيد` | :489 | `المتبقي` في بطاقة الفاتورة (المستحقّ على هذه الفاتورة، لا رصيد المورد كاملاً — §R3.5) |
| `📝 البيان` | :524 | غير مدعوم في `PurchaseInvoiceInput` — §R3.5 |
| `📋 المرجع` | :545 | `📋 المرجع` في الشاشتين، وهو رقم فاتورة المورد (`supplierReferenceNo`) |
| `📦 الباركود` | :592 | غير مُنقول (السحابة تُدخل الصنف من القائمة) — §R3.5 |
| `بدون ضريبة` | :617 | يُمثَّل باختيار مجموعةٍ ضريبية بنسبة صفر على السطر (لا خانةَ منفصلة) |
| `📋 بنود الفاتورة` | :665 | عنوان جدول البنود في شاشة الفاتورة |
| `رمز الصنف` · `رقم الصنف` · `🔍 الصنف` · `الوصف` · `الوحدة` · `الكمية` · `السعر` · `المجموع` · `الخصم` · `الضريبة` · `الصافي` · `المستودع` · `تاريخ الإنتهاء` | :732 · :741 · :746 · :779 · :791 · :800 · :809 · :818 · :827 · :838 · :847 · :858 · :867 | أعمدة جدول البنود: `🔍 الصنف` · `الكمية` · `السعر` · `المجموع` · `الخصم` · `الإجمالي` · `الضريبة` · `الصافي` (والباقي غير مدعوم في الـDTO — §R3.5) |
| `📊 عدد البنود` · `📦 إجمالي الكمية` · `🏷️ خصم الفاتورة` | :920 · :928 · :936 | بطاقة الفاتورة (تُحسب من بنودها المخزَّنة) |
| `المجموع :` · `الخصم :` · `الإجمالي :` · `الضريبة :` · `الصافي :` | :1056 · :1067 · :1079 · :1090 · :1101 | `TotalsPanel` ب`variant="purchase"` — بلا رموز، كما في النافذة (كان مُطبَّقاً في §R2) |
| `📝 سند قبض` | :1396 | **لا نظير**: قبضٌ من موردٍ لا معنى له؛ السداد عبر `POST /purchase-invoices/:id/payments` أو سند صرف (§R3.5) |
| `🗑️ حذف` | :1406 | `🗑️ إلغاء الفاتورة` — الإلغاء هو مقابل الحذف الناعم (نفس قرار §R2.5)، وسببٌ مكتوب مطلوب |
| `🖨️ طباعة` | :1411 | زرّ `/print/purchase-invoice/:id` |
| `👁️ معاينة` | :1416 | ورقة الطباعة نفسها تُعاين في المتصفّح قبل الإرسال — بلا زرٍّ ثانٍ |
| `🖨️💾 حفظ مع طباعة` · `💾 حفظ` | :1424 · :1428 | زرّا شاشة الإنشاء، بنفس ترتيب النافذة (الرمزان معكوسان عن نافذة البيع) |
| `➕ جديد` | :1433 | المسار `/purchases/invoices/new` نفسه |
| `📥 استيراد` · `⚡ اختصار فاتورة` · `📤 تصدير` · `📒 عرض القيد` · `📎 إرفاق المستندات` | :1369 · :1373 · :1371 · :1375 · :1387 | خارج نطاق R3 (قائمة أدوات النافذة) |
| `🔍  البحث  ` وتبويبه (`🔢 رقم الفاتورة` · `📋 رقم المرجع` · `📅 من تاريخ` · `📅 إلى تاريخ` · `👤 المورد`) | :1122 · :1155–1216 | شاشة `/purchases/invoices` تُرشِّح بالنوع وتُظهر الرقم والمرجع والمورد والتاريخ؛ والفلاتر المتقدّمة مؤجَّلة — §R3.5 |

**والمعاني ليست تجميلاً:** في الديسكتوب `ItemSumPrice` = الكمية × السعر («المجموع») و
`lineTotal` = المجموع − الخصم («الإجمالي») و`ItemNetPrice` = الإجمالي + الضريبة
(«الصافي») — `ItemOper.CalcTotal` L1533–L1644. وهي نفس دلالة `gross`/`net`/`total` في
`calculateInvoiceTotals` السحابية، فطابقت الأعمدة حقول الـDTO واحداً بواحد.

### R3.3 حارسا سلسلة المستندات + الدفعات في القراءة (متابعة §3D و§3)

النافذة المكتبية تحذّر من تكرار «📋 المرجع» ولا تمنعه (:1211)، لكنها تسمح بحذف فاتورةٍ
عليها مردودٌ قائم فيبقى مرجعٌ معلّق؛ وفي السحابة صار الوجهان حارسين على المحرّك:

| الرمز | الحالة | متى | ما يحمله |
|---|:--:|---|---|
| `PURCHASE_VOID_HAS_RETURNS` | 409 | إلغاء فاتورةٍ عليها مستندٌ مشتقّ **مُرحَّل** (`referenceInvoiceId = id AND status='posted'`) | `errors[0] = { references: [{ id, number, kind }], count }` — يُسمّي الحاجز لا يُلوّح به |
| `PURCHASE_REFERENCE_VOIDED` | 409 | ترحيل مستندٍ مشتقّ (`purchase_return`/ملاحظة تعديل) فاتورتُه الأصلية مُلغاة | يُفحص **قبل المعاملة** فلا قيدَ ولا حركةَ مخزون |

وشرطُ الحاجز على المُرحَّل وحده: المردود **المسودّة** أثرُه صفر فلا يحجب الإلغاء؛ ولو
رُحِّل بعده سدّه `PURCHASE_REFERENCE_VOIDED`. وأُضيف إلى **القراءة** ما كان مكتوباً ولا
يُقرأ: `GET /purchase-invoices/:id` يعيد الآن `payments` من `payment_allocations` بترتيب
`allocatedAt`، والشاشة تعرضها — فيظهر صفُّ الدفعة النقدية التي كتبها الترحيل نفسه، لا
`paidTotal` وحده.

### R3.4 عيبٌ كشفه السكربت: عكس الإدخال كان يصرف بمتوسط اليوم

`InventoryService.recordInTx` كان يقبل `costing` ولا يقرأه في حساب `nextValue`: الصادرُ
يُصرف دائماً بـ`average` (متوسط اليوم) بينما تُكتب في الحركة `unitCost = average` — فما
دام هذا متّسقاً لم يظهر خللٌ في الكميّة، لكن **عكس الإدخال** (`in` ثم `out` لنفس الفاتورة
عند الإلغاء) كان يصرف بمتوسطٍ جمعه إدخالُ الفاتورة نفسها مع رصيدٍ قديم.

- **ما ظهر حيّاً قبل الإصلاح**: فاتورة 10 @100 على رصيد 56 @51.7241، ثم إلغاء ⇒ الكمّ
  يعود 48 صحيحاً لكن القيمة تبقى **2821.7489** بدل 1920 (فرقٌ 901.75 يعلق في المخزون ولا
  يطابق مجموعَ حركات الصنف).
- **الإصلاح**: نوعُ تقييمٍ جديد `outAtOriginalCost` — الصادرُ بعكس إدخالٍ يُصرف بالسعر
  المكتوب في الحركة الأصلية لا بمتوسط اليوم: `const original = line.costing ===
  'outAtOriginalCost' && line.unitCost !== undefined ? new Decimal(line.unitCost) : undefined;`
  و`unitCost` تُحسب منه، و**`nextValue` صار يتحرّك بـ`unitCost`** — فالرصيد يساوي دائماً
  مجموع حركاته. وطُبِّق النوع الجديد في مرآة الإلغاء في `purchases.service.ts` وفي
  `voidVoucher` في المخزون (وما زال `returnAtOriginalCost` هو تقييم المرتجع كما في §R2).
- **الأثر بعد الإصلاح**: الرصيد يعود **48 @40.0000 = 1919.9999** (فارق 0.0001 من تدوير
  متوسّط المردود `51.7241 × 2`) والفحص يقيس الفارق ويُظهره بدل أن يخفيه.
- وبهذا يتحقّق شرط §3 الذي كان معلّقاً: «الإلغاء يعيد الكمّ **والقيمة** إلى ما كانا عليه»
  — وهذا هو الفرق بين إلغاءٍ معامليّ وإلغاءٍ حسابيّ.

### R3.5 ما اخترعناه

1. **`frmInvPurch` لا `frmPurchInv`**: النافذة المرجعية هي الكاملة (الملخّص والتبويبات
   والأزرار الموسومة). النسخة المبسّطة أزرارها عارية («🗑️» · «💾») فتكون التسميات
   الحرفية فيها **ناقصةً** لا أصلية — والاستشهاد بها كان يُنتج جدولاً أنقص من الواقع.
2. **«🗑️ حذف» ⇒ «🗑️ إلغاء الفاتورة»** كما في §R2.5: الديسكتوب حذفٌ ناعم، والسحابة تقيد
   عكسياً وتعكس المخزون وتُبقي المستند مرقّماً مع سببٍ مكتوب (`PURCHASE_VOID_REASON_REQUIRED`).
3. **«ترحيل» ليست في النافذة** فلم تُضف كتسميةٍ مكتبية: الديسكتوب يحفظ ويُرحّل بنداءٍ
   واحد؛ والسحابة تفصلهما (مسودّة ⇒ محرّك ترحيل)، فبقي زرُّ المحرّك باسمه السحابي.
4. **«📝 البيان» و«📦 الباركود» و`تاريخ الإنتهاء`**: لا تحملها `PurchaseInvoiceInput` اليوم
   (لا `notes` ولا `expiryDate`)، فلا يُدّعى نقلُها · ~~«📊 مركز التكلفة» (رأساً)~~ ✅ **أُغلق
   في §R9** (وكان مدعوماً على صفوف المصاريف الإضافية وحدها — `PurchaseCostInput.costCenterId`).
5. **«💰 الرصيد» ⇒ «المتبقي»**: رصيد المورد الكامل ليس في بطاقة الفاتورة السحابية
   (مستحقُّ الفاتورة ناقص مدفوعها)، وكشفُ حساب المورد هو موضعه — فلا تُستعمل تسميةُ
   النافذة لمعنًى آخر.
6. **«بدون ضريبة» ⇒ مجموعة ضريبية بنسبة صفر**: النافذة تخانةٌ تُصفّر الضريبة على كل
   السطور (`ckZeroVAT` L617 و`ItemOper.CalcTotal` يشترط `VATperc != 0`)، والسحابة تُعبّر
   عن ذلك بمجموعةٍ ضريبية على السطر — نفس النتيجة بلا خانةٍ عامّة تُغيّر المستند بصمت.
7. **«📦 الكمية الحالية» و«⚖️ التعادل» و«📊 كمية و/س» و«💰 آخر شراء/آخر بيع/المتوسط/
   المنافس» و«📦 باركود الصنف» (L983–L1026) مؤجَّلة**: الثلاثة الأولى تحتاج موقعاً نقدياً
   ومخزوناً لحظياً لكل صنف داخل الشاشة، والأربعة الأخيرة تحتاج سعر آخر شراء/بيع ومتوسطَ
   المنافس — وكلها **لوحةُ تحريرٍ في النافذة** لا بطاقةَ مستند، فمكانُ تحريرها شاشةُ
   الأصناف (وملخّصُ المخزون موجود في `/inventory/levels` و`/items/:id`), وليست من نطاق
   مطابقة نافذة الفاتورة. ونُفِّذ منها ما لا يحتاج نداءً: «📊 عدد البنود» · «📦 إجمالي
   الكمية» · «🏷️ خصم الفاتورة» (L920–L936).
8. **«👁️ معاينة» لم تُضَف كزرٍّ ثانٍ**: ورقة `/print/purchase-invoice/:id` هي نفسها
   معاينةُ المتصفّح قبل الطبع، فزرّان إلى المسار نفسه تسميتُهما مختلفة إرباكٌ لا مطابقة.
9. **«📝 سند قبض» (L1396)**: قبضٌ من موردٍ لا معنى له في السحابة؛ السداد عبر
   `/payments` (ذمم) أو سند صرف من الصندوق — والتسمية في النافذة باقيةٌ لوظيفتها المكتبية.
10. **تكرار «📋 المرجع» ينبّه ولا يُمنع** كما في النافذة (`frmInvPurch.xaml.cs:1211`):
    شاشة الإنشاء تقارن المرجع المُدخَل بفواتير المستأجر وتُظهر نصّ النافذة نفسه — تحذيراً
    لا حاجزاً.
11. **عمودان سحابيان في جدول البنود**: «📦 مصاريف محمّلة» و«📦 التكلفة النهائية» — لا
    نظيرَ لهما في جدول النافذة لأن الديسكتوب يصهر التكلفة الإضافية في تكلفة الصنف وقت
    الحفظ (`ItemAdditonalCos` · `ItemOper.cs:2086`) فلا يُمكِن تفكيكُها بعده. السحابة
    تُظهر التوزيع والنتيجة، وهما أول ما يُسأل عنه عند مطابقة قيد الفاتورة.

### R3.6 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| رمزا السلسلة وحالاتهما | `packages/contracts/src/errors.ts` — الرمزان في `errorCodes` · الحالتان 409 · العنوانان |
| الحارسان | `apps/api/src/modules/purchases/purchases.service.ts` — حارس الإلغاء بعد حارس الدفعات، وحارس الترحيل قبل المعاملة، و`payments` في `get()` |
| إصلاح العكس (§R3.4) | `apps/api/src/modules/inventory/inventory.service.ts` — `outAtOriginalCost` + ربط القيمة بـ`unitCost` · ومرآة الإلغاء في `purchases.service.ts` و`voidVoucher` |
| الاختبار | `apps/api/test/purchase-posting.spec.ts` — **11/11** (ثلاثة سبيكات: السلسلة في الاتجاهين · `PURCHASE_REFERENCE_VOIDED` مع «المسودّة لا تحجب» · قراءة الدفعات؛ وفحصٌ في سبيك الإلغاء: القيمة والمتوسط يعودان لا الكمّ وحده) |
| التحقّق الحيّ | `scripts/verify-purchase-engine.mjs` — **41 فحصاً في 10 أقسام**، تشغيلان متعاقبان بلا تنظيف (كل عدّادٍ بالفرق) |
| التسميات | `apps/staff/app/purchases/invoices/new/page.tsx` · `app/purchases/invoices/[id]/page.tsx` (وبطاقة «💵 الدفعات المسدّدة») |
| الوثائق | هذا القسم · `AUDIT_PHASES_01_04.md` §6 (R3 ✅) · `docs/STATUS.md` · `apps/staff/README.md` |

**الأرقام الحيّة (مستأجر `demo`، 2026-09-20، تشغيلان):** 10×100 − 20 @15% + 100 شحن ⇒
`PI-` بإجمالي **1227.0000**، وسطرٌ بتكلفة وحدة **108.0000**، وقيدٌ خماسي متوازن
(`Dr 1270001 1100` · `Dr 2222001 147` · `Cr 3200003 20` · `Cr 22111001 1227`)؛
48@40 + 10@108 ⇒ **58 @51.7241 = 3000**؛ المردود `PR-` 58 ⇒ 56 والقيد
(`Dr 22111001 230` · `Cr 1270001 103.4483` · `Cr 2222001 30` · `Cr 3200004 96.5517`)؛
الإلغاء يعيد **48 @40.0000 = 1919.9999** (فارق التدوير معلَن)؛ فاتورةٌ نقدية 10 وحدات ⇒
**1150.0000** مدفوعةٌ بصفّ دفعةٍ مقروء، ودفعةٌ جزئية 50 تظهر بحالتها؛ والحارسان يردّان
`409 PURCHASE_VOID_HAS_RETURNS` (بسرد `PR-`) و`409 PURCHASE_REFERENCE_VOIDED`؛ وفاتورة
خدمةٍ بلا مستودع تُرحَّل بلا حركةٍ مخزنية؛ ولا مستندَ مُرحَّلاً يشير إلى فاتورةٍ ملغاة.

---

## R8 — الأرقام التسلسلية والدفعات على سطور فواتير الشراء (2026-09-21)

§R3.5 البند 4 سمّى `تاريخ الإنتهاء` مؤجَّلاً («لا تحملها `PurchaseInvoiceInput` اليوم»)، و§13 من
`PHASE_05_INVENTORY.md` سمّى فواتير الشراء بالاسم في البند نفسه. والتنفيذ واحدٌ للوجهين —
القسم الكامل (المصادر والأحكام والاختبارات) في **§R8 من `PHASE_02_SALES_ENGINE.md`** — وهذا
القسم يثبّت **خصوصية نافذة الشراء** وما تغيّر فيها.

### R8.1 خصوصية النافذة المكتبية

| المصدر | السطر | الفرق عن نافذة البيع |
|---|---|---|
| `Form_WPF/frmInvPurch.xaml` | :714 | **لا خانةَ «🔢 التسلسلي:» في الرأس** عند الشراء — المدخل الوحيد هو قائمة سياق الشبكة («🔢 الرقم التسلسلي») |
| `Form_WPF/frmInvPurch.xaml.cs` | :897 | `MenuItemSerialNo_Click` ← `ShowItemMoreDetails` :1007 — تفتح `frmItemSerialNo` على سطور الصنف المحدَّد، وعند الإغلاق **تُعاد الكمية** من مجموع تفاصيل النافذة (`cur.ItemQuantity += d.ItemQuantity`) ثم يُعاد حساب الصف |
| `Class/InvoiceOper.cs` | :1635 | النافذتان تكتبان الأرقام الأربعة في `InvoiceItemDetail` نفسها — فلا فرق في التخزين |

**ولذلك في السحابة**: خانة «🔢 التسلسلي:» أُضيفت إلى شاشة الشراء أيضاً (استعمالاً لمصدر نافذة
البيع نفسه `:592` بعد أن صار المنفذ واحداً)، و`frmItemSerialNo` يقابلها هنا عمودان على الشبكة
يُكتب فيهما الرقم والدفعة مباشرةً — أسرعُ من نافذةٍ منبثقةٍ لحقلين.

### R8.2 ما تغيّر في محرّك الشراء

- `PurchaseLineInput` يحمل الآن `serialNos` · `batchNo` · `productionDate` · `expiryDate` ·
  `lotId`، وتُحفظ على السطر في المسودّة (تنظيفُ التكرار عند الإدخال).
- **عند الترحيل**: الإدخال (`purchase`) **يُنشئ** الأرقام التسلسلية ويبحث عن الدفعة أو يُنشئها؛
  والمردود (`purchase_return`) **يُخرج** الرقم من الرفّ. والترتيب: حركة المخزون ثم الأرقام.
- **الإلغاء** يعكس: أرقام إدخالٍ سُجِّلت تُسحب (ما دامت مكانها)، وأرقام مردودٍ خرجت تعود إلى
  الرفّ، والروابط تُحذف.
- **بطاقة الفاتورة** تعرض «📁 رقم الدفعة» و«🔢 التسلسلي» — وهما ما كان `تاريخ الإنتهاء` يشير
  إليه في §R3.5 (التاريخ يصل من الدفعة المحسومة، لا يُكتب مرّتين).

**الاختبار والتحقّق**: المشتركان يغطيانهما — `apps/api/test/invoice-line-numbers.spec.ts`
(**11/11**: الشراء يُنشئ · المردود يُخرج · الإلغاء يعكس) و`scripts/verify-invoice-numbers.mjs`
(**23/23** على المحرّكين). **البوابات**: api **1358** · staff **44** · `tsc` ✓ · eslint **0 على
الملموسة** · بناء الـapi والـstaff ✓ · ترحيلات **89**.

---

## R9 — 📊 مركز التكلفة على فاتورة الشراء (2026-09-21)

القسم الكامل (المصادر والأحكام والاختبارات) في **§R9 من `PHASE_02_SALES_ENGINE.md`** — وهذا
خصوصية نافذة الشراء وما تغيّر في محرّكها. والبند كان مؤجَّلاً هنا في §R3.5 (البند 4).

### R9.1 خصوصية النافذة المكتبية

| المرجع | الموضع | ما أُخذ منه |
|---|---|---|
| `Form_WPF/frmInvPurch.xaml:467` | قائمة «📊 مركز التكلفة» | الحقل على رأس فاتورة الشراء — **بلا نقطتين**، بخلاف نافذة البيع |
| `Inv_Sub.ItemCostCenter` (جداول SQL :1625/1815/3368) | عمود السطر | مركز السطر: هو العمود الذي كان موجوداً في السحابة ولا يُقرأ |
| `Class/InvoiceOper.cs:2432` · `:2461` | بناء القيد | مركز السطر يسبق، ومركز الرأس يورَّث لسطرٍ صامت |

### R9.2 ما تغيّر في محرّك الشراء

- `PurchaseLineInput` يحمل الآن `costCenterId`، و`PurchaseInvoiceInput` يحمل `costCenterId`
  على الرأس؛ ويُعادان في ردّ الإنشاء و`GET`. وفي تعديل المسودّة يُخزَّن مركز الرأس مع بقية
  رأس الفاتورة. والترحيل `0090` أضاف `purchase_invoices.cost_center_id` (وعمود السطر كان
  موجوداً فأُضيف له الفهرسة الجزئية والتوثيق).
- **عند الترحيل**: رجل **مخزون الشراء** (مديناً) ورجل **مرتجع الشراء** (دائناً) تُقسَّم بوزن
  القيمة المحمَّلة للبنود المخزنية (نصيب كل سطر من خصم الفاتورة داخله)، ورجل **المشتريات/حساب
  الشراء** للبنود غير المخزنية بوزن صافيها — فكل رجلٍ تُوزَّن بالمبالغ التي أنتجتها. وكل سطرٍ
  يأخذ مركزه، فإن خلا أخذ مركز الرأس (`centerOf`).
- **الإلغاء** يعكس بالمركز نفسه: كانت المرآة تُبنى بلا `costCenterId` ⇒ تبقى قيمة الفاتورة
  الملغاة في 🌳 شجرة مراكز التكلفة وفي تقارير المندوبين (نظير عيب `reverseJournal` الذي أُصلح
  بالترحيل `0047`).
- **الحارس**: مركزٌ مُسمّى لا يخصّ المستأجر ⇒ `404 COST_CENTER_NOT_FOUND` قبل أي كتابة، على
  الرأس أو على أي سطر.
- **بلا مراكز**: الرجل تبقى كما كانت بالحرف (واحدة، غير موسومة) — فلا يتغيّر قيدُ مشترياتٍ
  قديم بحرف عند إعادة ترحيله.

**الاختبار والتحقّق**: `apps/api/test/invoice-cost-centers.spec.ts` (**7/7** — منها الشراء
وسطرُه الوارث) و`scripts/verify-invoice-cost-centers.mjs` (**22/22** على المحرّكين).
**البوابات**: api **155 ملفاً/1365** · staff **7/47** · `tsc` ✓ · eslint **0** · بناء الـapi
والـstaff ✓ · ترحيلات **90**.

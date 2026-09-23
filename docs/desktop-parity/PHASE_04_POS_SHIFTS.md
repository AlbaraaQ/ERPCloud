# Phase 04 — Point of sale, cashier shifts, day close

Date: 2026-09 · Status: ✅ done
Sources: `Desktop_ERP/SmartAuditERP/Form_WPF/frmPOS.xaml.cs`, `frmInvPOS.xaml.cs`,
`frmCloseShift.xaml.cs`, `frmCloseShiftInv.xaml.cs`, `ClosShiftAndroid.xaml.cs`,
`Class/CasherClosedDto.cs`, `Class/CasherClosedSubDto.cs`.

---

## 1. What the desktop did

| Desktop behaviour | Where | Cloud before Phase 04 | Cloud after Phase 04 |
|---|---|---|---|
| One Save writes the invoice, its stock movement, its entry and its payment | `frmPOS` / `frmInvPOS` | three browser round trips, not atomic | `POST /pos/checkout` — one transaction |
| The till takes cash, network (card), bank or postpones to the customer account | `Paytype` / `ProcType` | cash vs "card"→bank only | `cash` \| `card` \| `bank` \| `credit` |
| Change is returned to the customer | `frmPOSPay` | not modelled | `tendered` → `change` |
| Every till sale belongs to the open `CasherClosed` shift | `CasherClosed` | no link at all | `sales_invoices.shift_id` (migration 0033) |
| Closing counts the drawer and compares it to the day's takings (`CashTotal`, `SAfeNetVal`, `NetworkSum`, `ReturnSum`, `PostPoneSales`, `Diff`) | `frmCloseShift` + `ListCasherClosedSub` | cash **vouchers only** — POS sales invisible | vouchers + invoice payments, per method |
| "نأسف! لا يمكن حذف فاتورة بعد إغلاق اليومية" — no invoice changes after the day is closed | `frmPOS.DeleteInv` (L1828) | not enforced | `SALES_SHIFT_CLOSED` (409) |

## 2. The engine

### 2.1 `POST /pos/checkout` (new, `pos.operate` + `sales.invoice.post`)

```jsonc
{
  "branchId": "…", "warehouseId": "…",
  "priceIncludesVat": true,          // shelf prices are tax-inclusive, like the desktop
  "invoiceDiscount": "0",            // optional header discount
  "orderType": "pos",
  "shiftId": "…",                    // optional; defaults to the caller's open shift
  "partyId": "…",                    // required for `credit`
  "cashCustomerName": "عميل نقدي",   // walk-in default
  "lines": [{ "itemId": "…", "quantity": "2", "unitPrice": "100", "taxRate": "15", "discountRate": "0" }],
  "payment": { "method": "cash", "cashLocationId": "…", "tendered": "500" }
}
```

Response: `{ number, subtotal, taxTotal, total, paidTotal, paymentStatus, method,
cashLocationId, shiftId, change, tendered, invoiceId }`.

Order of operations (all inside one `withTenantTx`):

1. `ensureEnabled` — the `pack.pos` tenant flag.
2. Cart gates: `POS_CART_EMPTY`, `POS_LINE_ITEM_REQUIRED`, `POS_LINE_QUANTITY_INVALID`,
   `POS_PAYMENT_METHOD_INVALID`, `POS_CREDIT_CUSTOMER_REQUIRED` (a postponed sale needs
   a customer account, exactly like the desktop's `POSTPONED SALES Inv`).
3. Tender pre-check with the *same* `calculateInvoiceTotals` the API uses —
   `POS_TENDER_INVALID`, `POS_INSUFFICIENT_CASH` — so a short tender is refused
   **before** a row is written.
4. Drawer resolution: the named cash location must belong to the branch (RLS-scoped),
   otherwise the branch default of the tender's kind (`safe` for cash, `bank` for
   card/bank). Its `accountId` becomes the settlement account.
   → `POS_CASH_LOCATION_INVALID`, `POS_SETTLEMENT_ACCOUNT_REQUIRED`.
5. Shift resolution: an explicit `shiftId` must be open and at the same branch
   (`POS_SHIFT_INVALID` / `POS_SHIFT_CLOSED` / `POS_SHIFT_BRANCH_MISMATCH`); otherwise
   the caller's open shift at that branch is attached. With `pos.requireShift` set,
   cash cannot be taken outside a shift (`POS_SHIFT_REQUIRED`).
6. `SalesService.createAndPost` — numbering, gates, average-cost stock relief,
   profile-built journal (incl. COGS) and the settlement payment row.

### 2.2 `SalesService` — `createInTx` / `postInTx` / `createAndPost`

`create()` and `post()` were refactored into transaction-scoped halves so a till
checkout can run them in one transaction. Public behaviour is unchanged:

- `post()` now runs its gates *inside* the transaction (the period gate still fires
  first, before the transaction opens, so no inventory side effect can precede it).
- `get()` is now a single round trip (`getInTx`) instead of three.
- `settlement` accepts `card` alongside `cash`/`bank`: it settles into the bank
  account but keeps its own payment row, so the shift report can separate network
  takings from transfers.

### 2.3 Shift close (`POST /shift-closes/:id/close`)

`expectedCash` = cash vouchers (receipts − payments, as before)
**+** cash invoice payments on this shift's invoices (or, for invoices captured with
no shift, on this branch during the window) **−** cash payments on returns/credit notes.

The summary now carries the desktop's own columns:

```jsonc
{
  "vouchers": 0, "vouchersCash": "0.0000", "invoices": 2,
  "sales":   { "cash": "200.0000", "card": "100.0000", "bank": "0.0000", "credit": "0.0000" },
  "returns": { "cash": "0.0000", "card": "0.0000", "bank": "0.0000", "credit": "0.0000" },
  "expectedCash": "200.0000", "countedCash": "200.0000", "diff": "0.0000"
}
```

`GET /shift-closes/current` returns the same block as `live`, so a cashier sees what
the drawer should hold before counting it. `shift_close_lines` now records one line
per method (cash/card/bank/credit) plus the voucher subtotal, for the closing report.

### 2.4 Sealing a closed shift

`SalesService.void()` and `updateDraft()` refuse (`SALES_SHIFT_CLOSED`, 409) any
invoice whose `shift_id` points at a closed shift — the desktop's rule, now enforced
in the service instead of a dialog. Back-office invoices (`shift_id IS NULL`) are
unaffected, so nothing that worked before stops working.

### 2.5 Restaurant tables

`PosService.close()` now takes a settlement (`credit` by default — the previous
implicit behaviour) and settles the table's invoice in the same transaction.
`sendToInvoice()` resolves the branch's default warehouse, without which the
stock-moving sale could not be posted at all (a latent bug: no table could ever be
closed once the Phase 02 warehouse gate landed).

## 3. Database

`packages/database/migrations/0033_pos_shift_link.sql` — additive, idempotent, no
data loss:

```sql
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES shift_closes (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sales_invoices_shift_idx ON sales_invoices (tenant_id, shift_id);
```

`ON DELETE SET NULL` keeps the sales history intact if a shift row is ever removed.

## 4. Screens (staff)

- **`/sales/pos`** — rewritten against the engine. Item tiles with search + category
  chips, cart with editable price/quantity/discount, tax-inclusive toggle, header
  discount, walk-in vs customer account, four tender methods with drawer picker,
  quick-cash buttons, live change, shift banner (open a shift inline), printable last
  receipt, and the last POS sales. One button → one call.
- **`/sales/shifts`** — the open shift now shows its live takings (cash / network /
  bank / postponed / vouchers / expected now), and the history table gained نقداً،
  شبكة، آجل columns from the frozen closing summary.

## 5. Tests

`apps/api/test/pos-checkout.spec.ts` (8 tests, all green):

1. cash checkout → posted + numbered + paid + stock relieved + balanced journal
   (cash leg + COGS) + payment row with the drawer
2. short tender refused, nothing written
3. empty cart rejected; another tenant's drawer rejected (`POS_CASH_LOCATION_INVALID`)
4. shift linkage + day close counts the till's cash (expected 100 / counted 120 /
   diff 20), live summary before closing, postponed sale excluded from cash
5. voiding a sale after its shift closed → `SALES_SHIFT_CLOSED`
6. card → bank account debited, payment row `card`
7. postponed sale needs a customer account; receivable debited, stays unpaid
8. table → send-to-invoice → close against cash, paid, table closed

Full suite: **75 files / 422 tests green** (was 74 / 414).

## 6. Live verification

`node scripts/verify-pos.mjs` against the seeded `demo` tenant (real HTTP):

```
✔ cash sale SI-000003: total 200.0000 · tendered 500.0000 · change 300.0000 · paid · shift …
✔ invoice SI-000003: status posted · lines 1 · payments 1 (cash 200.0000)
  line cost stamped: 120.0000
✔ stock movements for the sale: 1 (out 2.0000)
✔ journal Sales invoice SI-000003: 5 legs · Dr 320.0000 / Cr 320.0000 · balanced true
✔ card sale SI-000004: 100.0000 · paid · payment row card
✔ postponed sale SI-000005: 100.0000 · unpaid (no cash in the drawer)
✔ shift closed: expectedCash 200.0000 · countedCash 200.0000 · diff 0.0000
                 sales { cash: 200, card: 100 }
✔ sealed: 409 SALES_SHIFT_CLOSED
```

## 7. Follow-ups (not in this phase)

> أُغلق أكثرُ ما كان في هذه القائمة في **§R4** أدناه (تعليق الفواتير · تعدّد الدفع ·
> إعدادات الكاشير · تجاوز السعر · `cashier_id`). والمتبقّي صراحةً:

- **`frmShortCutInv*` — «حاسبة الفاتورة»** (`FrmShortCutInv.xaml:6`): آلة حاسبة تُدرج
  ناتجها في بنود الفاتورة (المجموع ← الخصم ← الإجمالي ← الضريبة ← الصافي ← «✅ إدراج»
  L224). ليست «أصنافاً مختصرة»، وتُؤجَّل بوصفها آلة حسابٍ لا شاشةَ بيع.
- **`frmHoldM*` — «🔗 ربط الفواتير بالمراكب»** (`frmHoldM.xaml:7` · `:243`): نافذة
  الوحدات البحرية، لا شاشة تعليق. تُؤجَّل إلى مرحلة الأفواج (مارينا).
- **حدود السعر الدنيا والعليا** — `frmPOS.xaml.cs` L1391 `IsValidPrice` يقرأ
  `ItemPrices(sale_price, low_sale_price, high_sale_price)` ويردّ برسالتين («لقد أدخلت
  السعر أكبر من أعلى سعر» L1408 · «أقل من أدنى سعر» L1412 مع إرجاع `sale_price`)
  وخانتَي `User.PassHeighestSalePrice`/`PassLowestSalePrice` تتجاوزان. السحابة تعرف
  رمزاً واحداً (`pos.priceoverride`) وسعرَ صنفٍ واحداً (`items.sale_price`) — فحدودُ
  الصنف الثلاثة **مؤجَّلة** صراحةً، ولم تُخترع لها حقولٌ لا يقابلها عمود.
- **حساب فروق الإغلاق على حساب** — مُنفَّذٌ سلفاً في `postShiftClose` (المرحلة 04 §2.3)،
  ونقصه كان **الربط بالواجهة**؛ أُغلق في §R4 بوجود عمود «قيد الإغلاق» في `/sales/shifts`.
- **طرق الدفع الفرعية** — «🏧 ATM» (`frmPOSPay.xaml:276`) و«💳 فيزا» (:282) و«🍽️ ضيافة»
  (:290): الديسكتوب يعدّها أسطراً في نافذة الدفع، والسحابة تصنّفها في `method` الثلاثة
  (`cash`/`card`/`bank`) + بند «☕ الضيافة» في ملخّص الإغلاق. تفصيلُها (بنك كل بطاقة،
  وقيد ضيافةٍ على حساب) مؤجَّل.

## R4 — إكمال نقطة البيع (تكملة المرحلة 04 · 2026-09-20)

المرحلة 04 بنت المحرّك والشاشة، وسجّل §7 أعلاه خمس فجوات. هذا القسم يسدّها بالمصادر
بأسطرها وبجدول تسمياتٍ حرفيّ، وبسكربت تحقّقٍ حيّ يعيد أرقام §6 ويزيد عليها. وأثناء
التنفيذ ظهر **فجوةٌ حقيقية في بوابة الفوج** (§R4.3.5) فأُصلحت.

### R4.1 المصادر (ملفات `Desktop_ERP`، تُقرأ بـ`git ls-files`)

| الملف | الأسطر | ما أُخذ منه |
|---|---|---|
| `Form_WPF/frmPOS.xaml.cs` | — | `public int[] HoldList` :72 · `HoldList = new int[9]` :179 · `Key.F7 → btnHoldOrd_Click` :311 · «لا يمكن تعديل السعر» :1377 · `IsValidPrice` :1391–1416 · منطقة `#region Hold Orders` :1871–1962 · «لقد وصلت للحد الاقصي من عمليات الايقاف المؤقت» :1932 · `HoldBtn_Click` :1946–1962 («يوجد أصناف في الجدول» :1952) · `btnHoldOrd_Click` :2498 («هل تريد تعليق الفاتورة» :2506) |
| `Form_WPF/frmPOS.xaml` | — | صفّ الأزرار: تعليق + إغلاق :1120 · أزرار `Hold1Btn`…`Hold9Btn` :1135–1169 (و6–9 `Visibility="Collapsed"` :1150–1169) · زرّ «⏸️ تعليق  F7» :1173–1179 |
| `Form_WPF/frmPOSPay.xaml` | 629 | «دفع الفاتورة» :6 · «💵 كاش» :268 · «🖧 شبكة» :274 · «💳 فيزا» :282 · «🔀 متعدد» :286 · «🍽️ ضيافة» :290 · «⏳ آجل» :294 · «💰 الباقي» :454 · «📊 المجموع» :526 · «⚖️ F6 مطابقة» :548 · «✔ دفع» :553 · «✖ إغلاق» :558 · «💵 الفئات» :615 |
| `Form_WPF/frmCasherSetting.xaml` | 307 | «📷 الباركود أوتوماتيك» :239 · «👆 الشاشة تدعم التاتش سكرين» :252 · «📦 عرض المجموعات والأصناف» :265 · «🚗 قيمة التوصيل الافتراضية» :271 · «🛡️ قيمة التأمين الافتراضية» :279 · «📏 الوحدة الافتراضية» :287 · «حفظ الإعدادات» :300 |
| `Class/User.cs` | — | `EditPrice` :24 (تصفيرٌ في :153، وإعلان `OperNo 13` في :95) |
| `Class/EntryOper.cs` | — | `BindCloseShiftToEntry(CloseShift, bool)` :402 — قيد الإغلاق وفروقه |
| `Form_WPF/frmCloseShift.xaml.cs` | — | «قيد الإغلاق غير مربوط بالإغلاق» :1822 — شرطُ الديسكتوب أن للإغلاق قيداً |
| `Form_WPF/FrmShortCutInv.xaml` | 228 | «حاسبة الفاتورة» :6 · «📋 المجموع» :148 · «🏷️ الخصم» :165 · «📊 الإجمالي» :183 · «💹 الضريبة» :199 · «🧾 صافي الفاتورة» :214 · «✅ إدراج» :224 |
| `Form_WPF/frmHoldM.xaml` | 507 | :7 `Title="ربط الفواتير"` · :243 «🔗 ربط الفواتير بالمراكب» — **دليل التصحيح**: ليست شاشة تعليق |

**تصحيحان في وسم التدقيق** (`AUDIT_PHASES_01_04.md` §6 كان يقول «8 خانات» و«الأصناف
المختصرة»): الكود يقول `HoldList = new int[9]` وتسعة أزرار (`HoldList[i]` من 0 إلى 8)،
و`frmShortCutInv` «حاسبة الفاتورة» لا أصنافٌ مختصرة (وأصنافُ الكاشير السريعة في `frmPOS`
هي بلاطات `FlowItemsPnl`). صُحّح الوسم في التدقيق نفسه، والقرار مبنيٌّ على الكود.

### R4.2 جدول التسميات — النص الحرفي وأين طُبِّق

| التسمية الحرفية | السطر | موضعها في السحابة |
|---|---|---|
| `⏸️ تعليق  F7` | `frmPOS.xaml:1175` | زرّ التعليق في `/sales/pos` (والاختصار F7 حقيقةً في الشاشة) |
| `لقد وصلت للحد الاقصي من عمليات الايقاف المؤقت` | `frmPOS.xaml.cs:1932` | نصّ رمز `POS_HOLD_LIMIT_REACHED` في المحرّك، والشاشة تعرضه كما هو |
| `يوجد أصناف في الجدول` | `frmPOS.xaml.cs:1952` | رفض الاسترجاع على سلةٍ غير فارغة في الشاشة (قبل النداء) |
| `لا يمكن تعديل السعر` | `frmPOS.xaml.cs:1377` | نصّ رمز `POS_PRICE_OVERRIDE_FORBIDDEN` (403) وتلميح حقل السعر المعطّل |
| `🔀 متعدد` | `frmPOSPay.xaml:286` | مبدّل «🔀 متعدد» بين طرق الدفع في `/sales/pos` |
| `⚖️ F6 مطابقة` | `frmPOSPay.xaml:548` | سطر «⚖️ مطابقة» أسفل صفوف الطرق (مطابق/زيادة/ناقص) |
| `💵 كاش` · `🖧 شبكة` · `💳 تحويل` | `:268` · `:274` · (`:282` فيزا→بطاقة) | خيارات طريقة كل صفٍّ في الدفع المتعدّد؛ والإيصال يفصّلها بالاسم نفسه |
| `💰 الباقي` | `:454` | «الباقي» في الدفع النقدي و«والباقي على حساب العميل» في المطابقة |
| `📷 الباركود أوتوماتيك` | `frmCasherSetting.xaml:239` | `pos.barcodeAuto` — وEnter في حقل البحث يضيف المطابق الواحد |
| `👆 الشاشة تدعم التاتش سكرين` | `:252` | `pos.touchScreen` — بلاطاتٌ أكبر |
| `📦 عرض المجموعات والأصناف` | `:265` | `pos.showGroups` — شرائح المجموعات |
| `🚗 قيمة التوصيل الافتراضية` | `:271` | `pos.defaultDeliveryFee` (مُسجَّل ومقروء؛ استعماله في شاشة التوصيل مؤجَّل) |
| `🛡️ قيمة التأمين الافتراضية` | `:279` | `pos.defaultInsurance` (كذلك) |
| `📏 الوحدة الافتراضية` | `:287` | `pos.defaultUnitId` (كذلك) |
| `حفظ الإعدادات` | `:300` | زرّ «حفظ» في `/settings/general` (يكتب `PUT /settings/pos.*`) |
| `قيد الإغلاق` (الدلالة) | `frmCloseShift.xaml.cs:1822` | عمود «قيد الإغلاق» في `/sales/shifts` بزرّ «🔗 ربط» |

### R4.3 المحرّك

#### R4.3.1 🅿️ الفواتير المعلّقة — تسع خانات

`pos_holds` (ترحيل `0087`) صفٌّ لكل (مستأجر · فرع · مستخدم · خانة)، والخانة `0..8`
بفهرسٍ فريد، و`cart jsonb` يحمل سلة الواجهة كما كتبها الكاشير.

- `GET /pos/holds?branchId=` — خانات الكاشير في الفرع (تسعةً في الرد: `slots: 9`).
- `POST /pos/holds` — يعلّق: خانةٌ مسمّاة أو **أوّل خانة فارغة**؛ وإن امتلأت التسع
  ردّ `422 POS_HOLD_LIMIT_REACHED` بنصّ الديسكتوب.
- `POST /pos/holds/:id/recall` — يسترجع **ويفرّغ** الخانة في نداءٍ واحد: المسترجَع لا
  يبقى معلّقاً في مكانين. خانةُ كاشيرٍ آخر ⇒ `404 POS_HOLD_NOT_FOUND`.
- `POST /pos/holds/:id/release` — يُفرغ بلا استرجاع (إفراغ الصندوق آخر النهار).

والفرق الجوهري عن الديسكتوب: **السلة تُخزَّن لا الفاتورة**. الديسكتوب يكتب المعلّق
`inv_type=3, proc_type=3` (`frmPOS.xaml.cs:1882–1884`) فيأخذ رقماً من السلسلة ويظهر في
التقارير قبل أن يُدفع؛ والسحابة ترقّم عند الترحيل وحده، فلو كتبت فاتورةً لظهر بيعٌ لم
يقع. لذلك: تعليقٌ لا يحجز رقماً، ولا ضريبةَ ولا تكلفةَ ولا قيدَ فيه، وسطورُه تُبنى من
كتالوج الأصناف لحظةَ الاسترجاع (صنفٌ حُذف ⇒ يُسقَط سطره).

#### R4.3.2 🔀 تعدّد الدفع — مصفوفة تسويات

`POST /pos/checkout` صار يقبل `payments[]` (طريقة · مبلغ · صندوق/بنك) إلى جانب
`payment` المفرد، ويعيد `tenders[]` و`onAccount`. وفي `SalesService`:

- `PostingInput.settlements[]` تُدخل **رجلَ مدينٍ لكل طريقة** على حسابها الحقيقي:
  `Dr صندوق 60 · Dr بنك 40 · Cr المبيعات 100`. وحساب كل طريقة يُفحَص أنه من المستأجر
  (`SALES_SETTLEMENT_ACCOUNT_INVALID`) كما كان المفرد.
- ما لم يُدفع يقف على **ذمّة العميل** (`receivableAccountId` بذات الطرف): فاتورةٌ
  بـ100 دُفع منها 50 لعميلٍ مُسمّى ⇒ `Dr صندوق 50 · Dr ذمم 50`، والحالة `partial`،
  و`paidTotal = 50.0000`. وبلا عميلٍ مُسمّى يرفضها المحرّك (`POS_TENDER_MISMATCH`)
  بفرقها في `errors[0].difference` — فلا نصفُ فاتورةٍ يقع في الهواء.
- والزيادة رفضٌ صريح كذلك («The tenders are more than the total by …»)، وعند بناء القيد
  تتحوّل إلى `SALES_SETTLEMENT_EXCEEDS_TOTAL` (422) كخطِّ دفاعٍ ثانٍ.
- `invoice_payments`: **صفٌّ لكل طريقة** (وبمفتاح idempotency مرقّم)، فيقرأ جردُ
  اليومية الكاشَ والشبكةَ منفصلين كما بنيت `method` له.
- والطرق لا تُفرض على مسارٍ قائم: `settlement` المفرد يعمل كما كان بالحرف — ولا يتغيّر
  قيدُ فاتورةٍ واحدة في المستودع.

#### R4.3.3 ✋ تجاوز السعر — `pos.priceoverride`

الرمز كان مُعلَناً في `permissions.ts:261` بلا قارئ. صار القارئ: سعرُ سطرٍ يخالف
`items.sale_price` (بهامش 0.00005) يحتاج الرمز، وإلا `403 POS_PRICE_OVERRIDE_FORBIDDEN`
بنصّ «لا يمكن تعديل السعر». والشاشة تُعطّل حقل السعر لمن لا يحمله وتُظهر السبب — والفرض
في المحرّك لا في الإخفاء. وصنفٌ بلا سعر بيع (`NULL`) لا يُقارَن به شيء.

#### R4.3.4 🧑‍💼 عمود الكاشير

`sales_invoices.cashier_id` (FK `users` بـ`ON DELETE SET NULL` + فهرس `(tenant_id,
cashier_id)`): مَن كان على الصندوق، و`created_by` يبقى مَن كتب الصفّ. يملؤه
`POST /pos/checkout` ويعيده في الردّ، ويظهر في الإيصال.

#### R4.3.5 ⚙️ إعدادات الكاشير وفجوة `pack.*` مقابل `feature.*`

`GET /pos/settings` جديد يعيد مفاتيح `pos.*` السبعة بصلاحية **`pos.view`** لا
`tenant.settings.manage` — الكاشير يحتاج الإعدادات ليعمل ولا يملك إعدادات المستأجر،
والكتابة تبقى على `PUT /settings/pos.*` من `/settings/general` (شاشة «⚙️ إعدادات
الكاشير» بترويساتها الحرفية).

**والفجوة التي كُشفت هنا:** بوابة `ensureEnabled` في `pos.service.ts` كانت تقرأ
`pack.pos`، وهو مفتاح **ليس في سجلّ `@erp/config`** — فلا `PUT /settings/pack.pos`
(يردّ 400 «مفتاح غير معروف») ولا ظهورٌ في اللوحة، والبوابة تمرّ لأنّ الصفّ غائب. وصار
القارئ هو المفتاح المُسجَّل `feature.pos` (وهو ما تقرأه لوحة المنصة وتحوّل به الفوج)،
معه `pack.pos` توافقاً لمن كتبه في قاعدةٍ قديمة، وصفٌّ صريح `false` في أيّهما يُطفئ.
و`pos.requireShift` — الذي كان يُقرأ مفتاحاً ثالثاً خارج السجلّ — سُجِّل باسمه فأصبح
قابلاً للضبط من الواجهة. وراياتُ الأفواج الأخرى (hrm · projects · marina · optics ·
tailoring · installments · fitment) باقيةٌ على الفجوة نفسها **مؤجَّلةً صراحةً** هنا.

> وبعد هذا التصحيح: `db:seed` يكتب كل مفاتيح السجلّ بقيمها الافتراضية، و`feature.pos`
> افتراضه `false` ⇒ مستأجرٌ جديد يبدأ والفوج مُطفأ حتى يُشعله المشغّل من «رايات العميل»
> في لوحة المنصة. ولذلك يُشعل `scripts/verify-pos.mjs` الفوج بنفسه في أوّل سطر.

#### R4.3.6 🔗 ربط الإغلاق بقيده

`EntryOper.BindCloseShiftToEntry` كان يعمل في المحرّك سلفاً (`POST
/shift-closes/:id/post` — المرحلة 04 §2.3)، والناقص أن الشاشة لا تُظهره. صار في
`/sales/shifts` عمود «قيد الإغلاق»: «مربوط» أو زرّ «🔗 ربط» لِورديةٍ محسوبة، ورسالة
المحرّك تُعرَض كما هي — وصندوقٌ مطابق يردّ `422 SHIFT_BALANCED` «الصندوق مطابق — لا قيد»،
وهو نصٌّ يقول الحقيقة: صفرُ فرقٍ ليس قيداً.

### R4.4 ما اخترعناه (ولم يكن في الديسكتوب)

| ما اخترعناه | لماذا |
|---|---|
| التعليق **سلةٌ** في `pos_holds.cart` لا فاتورةٌ برقم | الديسكتوب يرقّم المعلّق فيظهر في التقارير قبل الدفع؛ والسحابة ترقّم عند الترحيل — فتعليقُ سلةٍ لا يحجز رقماً ولا يلوّث دفتر المبيعات |
| عدّاد الخانات `0..8` في القاعدة و`1..9` على الأزرار | الديسكتوب كذلك: `HoldList[9]` وفهرسٌ من 0، والأزرار تحمل «1»…«9» |
| الفلترة بـ(الفرع · المستخدم) لا بالمستخدم وحده | «خانة ١» عند كاشيرَي فرعين ليست خانةً واحدة؛ والديسكتوب يفصلها باليوم والفاتورة |
| `POST …/recall` يسترجع **ويفرّغ** | الديسكتوب يُصفّر `HoldList[idx]` عند الاسترجاع؛ ونداءٌ لا يُفرغ يعني سلّةً في مكانين |
| «يوجد أصناف في الجدول» في الشاشة لا في الخدمة | حالةُ شاشةٍ لا قاعدةُ بيانات: الخادم لا يعرف سلة الكاشير الحالية |
| `GET /pos/settings` بصلاحية `pos.view` | الكاشير يحتاج الإعدادات ليعمل، و`tenant.settings.manage` ليست له |
| `feature.pos` قارئاً و`pack.pos` توافقاً | المفتاح المُسجَّل هو ما تعرضه اللوحة وتحوّله؛ المسار القديم يبقى عاملاً |
| إشعال الفوج في سكربت التحقّق | مستأجرٌ جديد يُبَذَّر و`feature.pos=false`: السكربت يفعل ما يفعله المشغّل، ويقول ذلك في سطره |
| تفصيل `tenders[]` و`onAccount` في ردّ الفحص | نافذة الدفع تعرض ما قُبض طريقةً طريقة والباقيَ على الحساب — والردّ يجب أن يحمله لا أن يُستنتجه |

### R4.5 الملفات والاختبارات والأرقام

| ما سُلِّم | الملف |
|---|---|
| أربعة رموز | `packages/contracts/src/errors.ts` — `POS_HOLD_LIMIT_REACHED` 422 · `POS_HOLD_NOT_FOUND` 404 · `POS_TENDER_MISMATCH` 422 · `POS_PRICE_OVERRIDE_FORBIDDEN` 403 · و`SALES_SETTLEMENT_EXCEEDS_TOTAL` 422 |
| الجدول والعمود | `packages/database/src/schema/pos.ts` (`posHolds`) · `schema/sales.ts` (`cashierId`) · `migrations/0087_pos_holds_cashier.sql` + `down/` |
| الخانات والبوابة | `apps/api/src/modules/pos/pos.service.ts` — `posSettings` · `holds/hold/recallHold/dropHold` · `ensureEnabled` · `assertPriceOverridesAllowed` · `payments[]` |
| تعدّد الدفع | `apps/api/src/modules/sales/sales.service.ts` — `settlements[]` في `PostingInput` · صفوف `invoice_payments` · أرجل المدين في `buildAutoJournal` |
| المسارات | `apps/api/src/modules/pos/pos.controller.ts` — `GET settings` · `GET/POST holds` · `POST holds/:id/recall|release` |
| المفاتيح | `packages/config/src/tenant-settings.ts` — ستّ `pos.*` + `pos.requireShift` |
| الشاشات | `apps/staff/app/sales/pos/page.tsx` (خانات التعليق · الدفع المتعدّد · الباركود/التاتش/المجموعات · حقل السعر) · `app/sales/shifts/page.tsx` (قيد الإغلاق) · `app/settings/general/page.tsx` (⚙️ إعدادات الكاشير) |
| حارس المعرّف | `apps/api/src/modules/treasury/treasury.service.ts` — `currentShift`/`history`/`dayCloses` تردّ فراغاً لـ`branch_id` غير معرّف (كان 500) |
| الاختبارات | `apps/api/test/pos-checkout.spec.ts` — **12/12** (4 جديدة: الخانات التسع والحدّ والملكية · تعدّد الدفع والمطابقة والباقي على الذمة · تجاوز السعر · إعدادات الكاشير وبوابة الفوج + فرعٌ غير معرّف) |
| التحقّق الحيّ | `scripts/verify-pos.mjs` — **19 فحصاً** (كان 12)، تشغيلان متعاقبان بلا تنظيف |
| الوثائق | هذا القسم · `AUDIT_PHASES_01_04.md` §6 (تصحيح الوسم + ✅) · `docs/STATUS.md` · `apps/staff/README.md` |

**الأرقام الحيّة (مستأجر `demo`، 2026-09-20، تشغيلان):** تعليقٌ تسع مرات ⇒ تسع خانات
(1…9)، والعاشرة `422 POS_HOLD_LIMIT_REACHED` بنصّ «لقد وصلت للحد الاقصي من عمليات
الايقاف المؤقت»، والاسترجاع يُفرغ الخانة (8 معلّقة · الخانة 1 حرّة)، وسلةٌ جديدة تجد
الخانة نفسها، وخانةُ كاشيرٍ آخر `404`؛ وفاتورةٌ على طريقتين
`SI-… = cash 60.0000 + card 40.0000` بصفَّي دفعٍ (`card`/`cash`) وحالة `paid`، والزيادة
`422 POS_TENDER_MISMATCH` «…more than the total by 20.0000»، والنقص بلا عميلٍ مرفوض،
ومع عميل ⇒ `50.0000` مدفوعة و`partial` و`50.0000` على الذمّة؛ والمالك (يحمل
`pos.priceoverride`) يبيع بـ80.00 وصنفُه بـ100.0000 وكاشيرٌ لا يحمل الرمز يُرفض 403؛
و`GET /pos/settings` يعيد `pos.barcodeAuto=true · pos.touchScreen=false ·
pos.showGroups=true · pos.defaultDeliveryFee=0 · pos.defaultInsurance=0 ·
pos.defaultUnitId='' · pos.requireShift=false`؛ و`feature.pos=true` قبل الفحوص؛
و`/shift-closes/current?branch_id=MAIN` يردّ فارغاً لا 500؛ وورديةُ التشغيل تُغلق
والفاتورة المعلّقة تُرفض بعدها `409 SALES_SHIFT_CLOSED`.

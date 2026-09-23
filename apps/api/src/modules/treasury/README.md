# Treasury module

Phase 12 unifies legacy receipts and Sand* documents into `vouchers`, adds cash transfers, expense types, cashier shift close, cheque transitions, and cash-location balance writers.

| Document | Debit | Credit |
| --- | --- | --- |
| Receipt voucher | cash/bank/card location | party receivable or counter account |
| Payment voucher | party payable, expense, VAT, salary, or counter account | cash/bank/card location |
| Cleared receipt cheque | cash/bank location | cheque clearing memo/profile account |
| Bounced cheque | reversal/memo per profile | reversal/memo per profile |
| Cash transfer send (R13) | `1211003` نقد تحت التحويل | حساب خزنة المصدر |
| Cash transfer receive (R13) | حساب خزنة الوصول | `1211003` نقد تحت التحويل |
| Shift close (R12) | 🧾 عهدة الإغلاق `1211002` (counted) + 📉 فروقات الصندوق `3110004` (shortage) | cash location (expected) + فروقات (surplus) |

Cash-location balances are updated in the same transaction as voucher posting, voiding, transfer send, and transfer receive. Cheque vouchers affect balances only on terminal collection/clearance.

Shift close stores counted denomination lines, expected cash from posted cash vouchers inside the shift window, and `diff = counted - expected`. Reports remain structured JSON until Phase 14 rendering.

**R12 — عهدة الإغلاق**: `POST /shift-closes/:id/post` now writes the desktop's three legs
(`Class/EntryOper.cs:772` · `Form_WPF/ClosShiftAndroid.xaml.cs:1588`): the counted drawer is
debited to `1211002` «عهدة الإغلاق», the location account is credited with `expectedCash`
(every posted invoice already debited it), and only the disagreement lands on `3110004`.
A **matched** drawer posts too (two legs, no difference); the refusal (`422 SHIFT_BALANCED`)
is now only for a drawer that held nothing and was expected to hold nothing. The custody
account is resolved as `shift_close.custodyAccountId` → the chart's own `1211002` → 422
`SHIFT_CUSTODY_ACCOUNT_MISSING`; the account id and the amount are written onto the close's
`summary`, and `GET /shift-closes/day-closes` returns `custodyAccountId`/`custodyAccountCode`/
`custodyAccountName`/`custodyAmount` beside `postable`. Clearing the custody stays an
operator step: a receipt voucher whose counter account is «عهدة الإغلاق».

**R13 — مناقلة الخزن تقيّد (closed)**: `sendTransfer`/`receiveTransfer` الآن
يكتبان قيدين ويملآن `sent_journal_entry_id` / `received_journal_entry_id` (الترحيل
`0011`): الإرسال `Dr 1211003 نقد تحت التحويل / Cr خزنة المصدر`، والاستلام
`Dr خزنة الوصول / Cr 1211003`. المال في الطريق يسكن `1211003`، وحسابه يُحلّ
`cash_transfer.cashInTransitAccountId` → دليل `1211003` → 422
`CASH_TRANSFER_TRANSIT_ACCOUNT_MISSING`، والخزنة بلا حساب ⇒ 422
`CASH_ACCOUNT_REQUIRED`. والشبكة تعلن القيود (`sentJournalEntryId` /
`receivedJournalEntryId`) كما تعلن الأرصدة.

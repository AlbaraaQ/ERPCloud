'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { DataTable, Notice } from '../../../../components/data-view';
import { ErrorBox, Loading, Screen } from '../../../../components/screen';
import { ApiError, apiData, apiFetch, apiList, apiPost } from '../../../../lib/api';
import {
  arabicName,
  cashLocationLabel,
  dateTime,
  itemLabel,
  listCashLocations,
  listCostCenters,
  listItems,
  listParties,
  listUnits,
  money,
  partyLabel,
  quantity,
  shortDate,
  statusLabel,
  type CashLocation,
  type CostCenter,
  type Item,
  type Party,
  type Unit,
} from '../../../../lib/lookups';
import { useSession } from '../../../../lib/session';
import { useQuery } from '../../../../lib/use-query';
import {
  ATTACHMENT_STATUS_LABELS,
  sendWhatsapp,
  whatsappMessages,
  WHATSAPP_STATUS_LABELS,
  type WhatsappMessageRow,
} from '../../../../lib/whatsapp';

type InvoiceLine = {
  id: string;
  lineNo: number;
  itemId: string | null;
  description: string | null;
  quantity: string;
  unitPrice: string;
  /** مبلغ خصم السطر كما خزّنه المحرّك (`ItemDiscount` في الديسكتوب). */
  discountAmount?: string | null;
  net: string;
  tax: string;
  total: string;
  /** R8 — «📁 رقم الدفعة» و«🔢 التسلسلي» كما كُتبا على السطر (تُملأ الدفعة عند الترحيل). */
  batchNo?: string | null;
  serialNos?: string[] | null;
  lotId?: string | null;
  /** R9 — 📊 مركز تكلفة السطر (والفراغ يعني مركز الفاتورة). */
  costCenterId?: string | null;
};
type Payment = { id: string; method: string; amount: string; reference: string | null; createdAt: string };
type Invoice = {
  id: string;
  number: string | null;
  kind: string;
  status: string;
  branchId: string;
  warehouseId: string | null;
  partyId: string | null;
  /** «🔖 رقم المرجع» — فاتورة المبيعات التي يشير إليها المرتجع (`frmInvSale.xaml` L405). */
  referenceInvoiceId?: string | null;
  /** «🔻 الخصم» على مستوى الفاتورة (`txtInvDiscVal` · `frmInvSale.xaml.cs` L1424). */
  invoiceDiscount?: string | null;
  /** R9 — 📊 مركز التكلفة على رأس الفاتورة (والسطر يرثه إن لم يذكر مركزاً). */
  costCenterId?: string | null;
  cashCustomerName: string | null;
  cashCustomerMobile: string | null;
  currency: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidTotal: string;
  paymentStatus: string;
  createdAt: string;
  postedAt: string | null;
  lines: InvoiceLine[];
  payments: Payment[];
};

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = String(params.id);
  const { can } = useSession();
  const invoice = useQuery<Invoice>(() => apiData<Invoice>(`/sales/invoices/${invoiceId}`), [invoiceId]);
  const items = useQuery<Item[]>(() => listItems(), []);
  const parties = useQuery<Party[]>(() => listParties('customer'), []);
  const cashLocations = useQuery<CashLocation[]>(() => listCashLocations(), []);
  const units = useQuery<Unit[]>(() => listUnits(), []);
  /** R9 — أسماء مراكز التكلفة لتُعرض الفاتورة باسم المركز لا بمعرّفه. */
  const costCenters = useQuery<CostCenter[]>(() => listCostCenters(), []);
  // «🔖 رقم المرجع» يحمل المعرّف لا الرقم، فنقرأ دليل الفواتير مرةً واحدة لحلّه.
  const invoices = useQuery<Array<{ id: string; number: string | null }>>(() => apiList('/sales/invoices'), []);

  const [settlement, setSettlement] = useState<'credit' | 'cash' | 'bank'>('credit');
  const [settleLocationId, setSettleLocationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'danger' | 'info' | 'warn'; text: string } | undefined>();
  const [payAmountText, setPayAmountText] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payLocationId, setPayLocationId] = useState('');
  const [voidReason, setVoidReason] = useState('');

  // 📱 «💬 واتساب» — `Form_WPF/frmInvSale.xaml` L1190, handled at L3130-L3195.
  const [waMessage, setWaMessage] = useState('');
  const [waAttach, setWaAttach] = useState(true);
  const [waBusy, setWaBusy] = useState(false);
  const sent = useQuery<WhatsappMessageRow[]>(
    () => whatsappMessages({ invoiceId, limit: 20 }).then((view) => view.messages),
    [invoiceId],
  );

  // 👓 بيانات النظارات — `frmInvSale.glassesOptions` L2503–2530 (Alt+G) يفتحها للصنف تحت المؤشر.
  // هنا تُعرض إن وجدت، مع تسمياتها من `optics_field_labels`، وزر «👁️ عرض» يفتح بطاقتها.
  const glasses = useQuery<Array<{ lineId: string; section: { title: string; right: Record<string, string>; left: Record<string, string>; labels: { right: Array<{ key: string; label: string }>; left: Array<{ key: string; label: string }> }; rows: unknown[] } | null }>>(
    async () => {
      const results = await Promise.all(
        (invoice.data?.lines ?? []).map(async (line) => {
          try {
            const body = await apiFetch<{ data: { title: string; right: Record<string, string>; left: Record<string, string>; labels: { right: Array<{ key: string; label: string }>; left: Array<{ key: string; label: string }> }; rows: unknown[] } }>(
              `/optics/invoice-lines/${line.id}/print-section`,
            );
            const hasData = body.data && (Object.keys(body.data.right ?? {}).length > 0 || Object.keys(body.data.left ?? {}).length > 0 || (body.data.rows as unknown[]).length > 0);
            return { lineId: line.id, section: hasData ? body.data : null };
          } catch {
            return { lineId: line.id, section: null };
          }
        }),
      );
      return results.filter((r) => r.section !== null) as Array<{ lineId: string; section: { title: string; right: Record<string, string>; left: Record<string, string>; labels: { right: Array<{ key: string; label: string }>; left: Array<{ key: string; label: string }> }; rows: unknown[] } }>;
    },
    [invoice.data?.lines],
  );

  if (invoice.status === 'loading') return <Loading />;
  if (invoice.status !== 'success' || !invoice.data) {
    return (
      <Screen title="🧾 فاتورة مبيعات" crumbs={['المبيعات']}>
        <ErrorBox message={invoice.error ?? 'تعذّر تحميل الفاتورة'} onRetry={invoice.reload} />
      </Screen>
    );
  }

  const doc = invoice.data;
  const invoiceCenter = (costCenters.data ?? []).find((row) => row.id === doc.costCenterId);
  const costCenterLabel = invoiceCenter ? `${invoiceCenter.code} — ${arabicName(invoiceCenter)}` : '';
  const centerName = (id: string | null | undefined): string => {
    const row = (costCenters.data ?? []).find((center) => center.id === id);
    return row ? `${row.code} — ${arabicName(row)}` : '—';
  };
  const partyName = doc.cashCustomerName
    ? `${doc.cashCustomerName} (نقدي)`
    : partyLabel((parties.data ?? []).find((row) => row.id === doc.partyId) ?? { id: '', name: '—' });
  const dueValue = Number(doc.total) - Number(doc.paidTotal);
  // نفس أرقام `frmInvSale.xaml.cs` L1420–1432: المجموع = Σ إجمالي السطور (الكمية × السعر)،
  // والخصم = خصم السطور + خصم الرأس، والإجمالي = `subtotal` (الصافي قبل الضريبة).
  const grossTotal = doc.lines.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitPrice), 0);
  const discountTotal = doc.lines.reduce((sum, row) => sum + Number(row.discountAmount ?? '0'), 0) + Number(doc.invoiceDiscount ?? '0');
  const unitOf = (row: InvoiceLine): string => {
    const item = (items.data ?? []).find((entry) => entry.id === row.itemId);
    const unit = (units.data ?? []).find((entry) => entry.id === (item?.baseUnitId ?? item?.base_unit_id));
    return unit ? (unit.nameAr ?? unit.name_ar ?? unit.code) : '—';
  };
  const referenceNumber = doc.referenceInvoiceId
    ? ((invoices.data ?? []).find((row) => row.id === doc.referenceInvoiceId)?.number ?? '—')
    : null;
  // 📱 «💬 واتساب» — the number the server will dial: `parties.phone`, or
  // `salesInvoices.cashCustomerMobile` for a cash sale (`frmInvSale.xaml.cs` L3150-L3165),
  // normalised the way `WhatsAppSender.SendInvoiceAsync` did it (L113-L116).
  const mobile = doc.cashCustomerMobile ?? (parties.data ?? []).find((row) => row.id === doc.partyId)?.phone ?? '';
  const digits = mobile.replace(/\D+/g, '');
  const previewPhone = digits ? (digits.startsWith('966') ? digits : `966${digits.replace(/^0+/, '')}`) : '';

  async function run(action: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      setNotice({ kind: 'ok', text: okText });
      invoice.reload();
    } catch (error) {
      setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    // The posting engine builds the journal from the branch's posting profile,
    // relieves the warehouse at average cost, and stamps each line's cost — all
    // in one transaction. The screen only declares how the invoice settles.
    if (settlement !== 'credit' && !settleLocationId) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'اختر الصندوق أو البنك الذي استلم المبلغ.');
    }
    const location = (cashLocations.data ?? []).find((row) => row.id === settleLocationId);
    const settlementAccountId = location?.accountId ?? location?.account_id ?? undefined;
    if (settlement !== 'credit' && !settlementAccountId) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'الموقع المختار غير مربوط بحساب محاسبي.');
    }
    await apiPost(`/sales/invoices/${doc.id}/post`, {
      settlement,
      settlementAccountId,
      settlementCashLocationId: settleLocationId || undefined,
    });
  }

  return (
    <Screen
      title={`🧾 فاتورة مبيعات ${doc.number ?? '(مسودة)'}`}
      subtitle={`${partyName} — ${statusLabel(doc.status)}`}
      crumbs={['المبيعات', 'العمليات']}
      actions={
        <>
          {/* «🖨️ طباعة» — `frmInvSale.xaml` L1254. */}
          <Link className="btn primary" href={`/print/sales-invoice/${doc.id}`}>
            🖨️ طباعة
          </Link>
          <Link className="btn" href="/sales/invoices">
            كل الفواتير
          </Link>
        </>
      }
    >
      <div className="grid cols-2">
        <div className="card">
          <h2>بيانات الفاتورة</h2>
          <dl className="kv">
            <dt>📋 الحالة</dt>
            <dd>{statusLabel(doc.status)}</dd>
            {referenceNumber !== null && (
              <>
                {/* «🔖 رقم المرجع:» — `frmInvSale.xaml` L405 (رقم الفاتورة الأصلية للمرتجع). */}
                <dt>🔖 رقم المرجع</dt>
                <dd>{referenceNumber}</dd>
              </>
            )}
            <dt>التاريخ</dt>
            <dd>{shortDate(doc.createdAt)}</dd>
            {/*
              «📊 مركز التكلفة» — يُطبع في الديسكتوب باسمه لا بمعرّفه
              (`Print.cs` L772–774: `invoiceData.costCenter = Common.GetCostCenterName(...)`).
              وهنا يُقرأ الاسم من قائمة المراكز نفسها، ويظهر الصفّ حين يكون للفاتورة مركز.
            */}
            {costCenterLabel && (
              <>
                <dt>📊 مركز التكلفة</dt>
                <dd>{costCenterLabel}</dd>
              </>
            )}
            <dt>الترحيل</dt>
            <dd>{doc.postedAt ? dateTime(doc.postedAt) : '—'}</dd>
            {/* نفس ترتيب لوحة الديسكتوب `frmInvSale.xaml` L942–1023 ومعانيها من
                `frmInvSale.xaml.cs` L1420–1432: المجموع = `SumPrice` (إجمالي السطور)،
                الخصم = خصم السطور + خصم الرأس، الإجمالي = الصافي قبل الضريبة،
                الصافي = الإجمالي بعد الضريبة. */}
            <dt>📊 المجموع</dt>
            <dd>{money(grossTotal, doc.currency)}</dd>
            <dt>🔻 الخصم</dt>
            <dd>{money(discountTotal, doc.currency)}</dd>
            <dt>💵 الإجمالي</dt>
            <dd>{money(doc.subtotal, doc.currency)}</dd>
            <dt>🧾 الضريبة</dt>
            <dd>{money(doc.taxTotal, doc.currency)}</dd>
            <dt>✅ الصافي</dt>
            <dd>
              <strong>{money(doc.total, doc.currency)}</strong>
            </dd>
            <dt>💚 المدفوع</dt>
            <dd>{money(doc.paidTotal, doc.currency)}</dd>
            <dt>🔴 المتبقي</dt>
            <dd>{money(dueValue, doc.currency)}</dd>
          </dl>
        </div>

        <div className="card">
          <h2>الإجراءات</h2>
          <Notice notice={notice} />

          {doc.status === 'draft' && can('sales.invoice.post') && (
            <>
              {/* «💳 طريقة الدفع:» — `frmInvSale.xaml` L414، وخياراتها «آجلة»/«نقدية»/«بنك» L418–L420. */}
              <label className="field">
                <span>💳 طريقة الدفع</span>
                <select className="input" value={settlement} onChange={(event) => setSettlement(event.target.value as 'credit' | 'cash' | 'bank')}>
                  <option value="credit">آجلة</option>
                  <option value="cash">نقدية</option>
                  <option value="bank">بنك</option>
                </select>
              </label>
              {settlement !== 'credit' && (
                <label className="field">
                  {/* «🏦 الصندوق:» L476 أو «🏛️ البنك:» L488 — بحسب طريقة الدفع المختارة. */}
                  <span>{settlement === 'bank' ? '🏛️ البنك' : '🏦 الصندوق'} *</span>
                  <select className="input" value={settleLocationId} onChange={(event) => setSettleLocationId(event.target.value)}>
                    <option value="">— اختر —</option>
                    {(cashLocations.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {cashLocationLabel(row)}
                      </option>
                    ))}
                  </select>
                  <span className="muted small">يُقيَّد المبلغ على حساب هذا الموقع وتُسجَّل دفعة بنفس القيمة.</span>
                </label>
              )}
              <button className="btn primary" type="button" disabled={busy} onClick={() => run(post, 'تم ترحيل الفاتورة وقيدها المحاسبي وحركتها المخزنية.')}>
                {busy ? 'جارٍ الترحيل…' : 'ترحيل الفاتورة'}
              </button>
            </>
          )}

          {doc.status === 'posted' && can('sales.invoice.pay') && dueValue > 0 && (
            <>
              {/* «💰 تسديد» — `frmInvSale.xaml` L1197. */}
              <h3>💰 تسديد</h3>
              <div className="form-grid">
                <label className="field">
                  <span>المبلغ</span>
                  <input className="input" dir="ltr" inputMode="decimal" value={payAmountText} onChange={(event) => setPayAmountText(event.target.value)} />
                </label>
                <label className="field">
                  <span>الطريقة</span>
                  <select className="input" value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>
                    <option value="cash">نقداً</option>
                    <option value="card">شبكة</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </label>
                <label className="field">
                  <span>الصندوق / البنك</span>
                  <select className="input" value={payLocationId} onChange={(event) => setPayLocationId(event.target.value)}>
                    <option value="">— اختر —</option>
                    {(cashLocations.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {cashLocationLabel(row)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      apiPost(`/sales/invoices/${doc.id}/payments`, {
                        method: payMethod,
                        amount: payAmountText,
                        cashLocationId: payLocationId || undefined,
                        idempotencyKey: crypto.randomUUID(),
                      }),
                    'تم تسجيل الدفعة.',
                  )
                }
              >
                💰 تسديد
              </button>
            </>
          )}

          {doc.status === 'posted' && can('sales.invoice.void') && (
            <>
              {/* «🗑️ حذف» L1260 — والسحابة تعكسها إلغاءً (`DeleteInvoice` حذفٌ ناعم:
                  `Inv.IS_Deleted=1` و`Entry.IS_Deleted=1, state=2` — `InvoiceOper.cs` L4419). */}
              <h3>🗑️ إلغاء الفاتورة (حذفٌ ناعم كما في الديسكتوب)</h3>
              <label className="field">
                <span>سبب الإلغاء</span>
                <input className="input" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
              </label>
              <button
                className="btn danger"
                type="button"
                disabled={busy || !voidReason.trim()}
                onClick={() => run(() => apiPost(`/sales/invoices/${doc.id}/void`, { reason: voidReason.trim() }), 'تم إلغاء الفاتورة.')}
              >
                🗑️ إلغاء الفاتورة
              </button>
            </>
          )}

          {doc.status === 'voided' && <p className="alert warn">هذه الفاتورة ملغاة.</p>}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2>💬 واتساب</h2>
          <span className="chip">يُرسل إلى {previewPhone ? <span dir="ltr">{previewPhone}</span> : '— لا رقم —'}</span>
        </div>
        {doc.status !== 'posted' ? (
          // «لا يمكن إرسال الفاتورة قبل الحفظ» — `frmInvSale.xaml.cs` L3137.
          <p className="alert warn">لا يمكن إرسال الفاتورة قبل الحفظ.</p>
        ) : !previewPhone ? (
          // «❌ لا يوجد رقم جوال للعميل» — `frmInvSale.xaml.cs` L3160.
          <p className="alert warn">❌ لا يوجد رقم جوال للعميل — أضف رقم الجوال في بطاقة العميل، أو أضفه في الفاتورة النقدية.</p>
        ) : can('sales.view') ? (
          <>
            <div className="form-grid">
              <label className="field wide">
                <span>نص الرسالة</span>
                <input
                  className="input"
                  value={waMessage}
                  onChange={(event) => setWaMessage(event.target.value)}
                  placeholder={`🧾 مرحباً ${doc.cashCustomerName ?? partyName}، هذه فاتورتك رقم INV${doc.number ?? ''} من …`}
                />
                <small className="muted">إن تُرك فارغاً كُتبت التحية نفسها التي كانت تكتبها النسخة المكتبية.</small>
              </label>
              <div className="field">
                <span>المرفق</span>
                <label className="check">
                  <input type="checkbox" checked={waAttach} onChange={(event) => setWaAttach(event.target.checked)} />
                  <span>📎 إرفاق الفاتورة</span>
                </label>
              </div>
            </div>
            <button
              className="btn primary"
              type="button"
              disabled={waBusy}
              onClick={() => {
                setWaBusy(true);
                setNotice(undefined);
                void sendWhatsapp({
                  invoiceId: doc.id,
                  attach: waAttach,
                  ...(waMessage.trim() ? { message: waMessage.trim() } : {}),
                })
                  .then((result) => {
                    setNotice({
                      kind: result.message.status === 'sent' ? 'ok' : 'warn',
                      text: `${WHATSAPP_STATUS_LABELS[result.message.status] ?? result.message.status} — ${result.message.phone}${result.attachment === 'sent' ? ` · ${ATTACHMENT_STATUS_LABELS.sent}` : ''}${result.message.error ? ` · ${result.message.error}` : ''}`,
                    });
                    void sent.reload();
                  })
                  .catch((error: unknown) => setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) }))
                  .finally(() => setWaBusy(false));
              }}
            >
              {waBusy ? 'جارٍ الإرسال…' : '💬 واتساب'}
            </button>

            <h3>📜 سجل الإرسال</h3>
            {sent.status === 'loading' ? (
              <p className="muted">جارٍ التحميل…</p>
            ) : (sent.data ?? []).length === 0 ? (
              <p className="muted">لم تُرسل هذه الفاتورة بعد.</p>
            ) : (
              <DataTable
                rows={sent.data ?? []}
                rowKey={(row) => row.id}
                columns={[
                  { key: 'at', header: 'التاريخ', align: 'ltr', cell: (row) => (row.createdAt ? dateTime(row.createdAt) : '—') },
                  { key: 'phone', header: 'الرقم', align: 'ltr', cell: (row) => row.phone },
                  { key: 'status', header: 'الحالة', cell: (row) => WHATSAPP_STATUS_LABELS[row.status] ?? row.status },
                  { key: 'attach', header: 'المرفق', cell: (row) => ATTACHMENT_STATUS_LABELS[row.attachmentStatus] ?? row.attachmentStatus },
                  { key: 'message', header: 'الرسالة', cell: (row) => row.message },
                  { key: 'error', header: 'الخطأ', cell: (row) => row.error ?? '—' },
                  { key: 'sim', header: '🧪', cell: (row) => (row.simulation ? 'محاكاة' : 'فعلي') },
                ]}
              />
            )}
          </>
        ) : (
          <p className="muted">لا تملك صلاحية إرسال الفاتورة.</p>
        )}
      </div>

      <div className="card">
        <h2>الأصناف</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          اضغط Alt+G على سطر الفاتورة لفتح «👓 بيانات النظارات» — كما في <code>frmInvSale.glassesOptions</code> L2505.
        </p>
        <DataTable
          rows={doc.lines}
          rowKey={(row) => row.id}
          columns={[
            // أعمدة الشبكة المكتبية `frmInvSale.xaml` L695–L831: الصنف · الوحدة · الكمية ·
            // السعر · المجموع · الخصم · الضريبة · الإجمالي · الصافي (الإجمالي = قبل الضريبة).
            { key: 'no', header: '#', align: 'num', cell: (row) => row.lineNo },
            {
              key: 'item',
              header: '📦 الصنف',
              cell: (row) => {
                const item = (items.data ?? []).find((entry) => entry.id === row.itemId);
                return item ? itemLabel(item) : (row.description ?? '—');
              },
            },
            { key: 'unit', header: 'الوحدة', cell: (row) => unitOf(row) },
            { key: 'qty', header: 'الكمية', align: 'num', cell: (row) => quantity(row.quantity) },
            { key: 'price', header: 'السعر', align: 'num', cell: (row) => money(row.unitPrice) },
            { key: 'gross', header: 'المجموع', align: 'num', cell: (row) => money(Number(row.quantity) * Number(row.unitPrice)) },
            { key: 'discount', header: 'الخصم', align: 'num', cell: (row) => money(row.discountAmount ?? '0') },
            { key: 'net', header: 'الإجمالي', align: 'num', cell: (row) => money(row.net) },
            { key: 'tax', header: 'الضريبة', align: 'num', cell: (row) => money(row.tax) },
            { key: 'total', header: 'الصافي', align: 'num', cell: (row) => money(row.total) },
            /**
             * R8 — «📁 رقم الدفعة» و«🔢 التسلسلي» على بطاقة الفاتورة: الديسكتوب يقرؤهما
             * عائدةً عند فتح المستند (`Class/InvoiceOper.cs` L3885–L3888)، وهي هنا مُخزَّنة
             * على السطر نفسه لا مشتقّةً من الدفعة.
             */
            { key: 'batch', header: '📁 رقم الدفعة', align: 'ltr', cell: (row) => row.batchNo ?? '—' },
            { key: 'costCenter', header: '📊 مركز التكلفة', cell: (row) => centerName(row.costCenterId ?? doc.costCenterId) },
            {
              key: 'serials',
              header: '🔢 التسلسلي',
              align: 'ltr',
              cell: (row) => ((row.serialNos ?? []) as string[]).join(' · ') || '—',
            },
            {
              key: 'glasses',
              header: '👓 النظارات',
              cell: (row) => {
                const found = (glasses.data ?? []).find((g) => g.lineId === row.id);
                return found ? (
                  <Link className="btn sm" href={`/optics/prescriptions?lineId=${row.id}`}>
                    👁️ عرض
                  </Link>
                ) : (
                  <span className="muted">—</span>
                );
              },
            },
          ]}
        />
      </div>

      {(glasses.data ?? []).length > 0 && (
        <div className="card">
          <h2>👓 بيانات النظارات — سطور الفاتورة</h2>
          <p className="muted small">من `frmGlasses` — كل سطرٍ يحمل قياسات العينين إن وجدت (Alt+G في الفاتورة).</p>
          <div className="grid" style={{ gap: 12 }}>
            {(glasses.data ?? []).map(({ lineId, section }) => {
              if (!section) return null;
              const line = doc.lines.find((l) => l.id === lineId);
              const item = (items.data ?? []).find((e) => e.id === line?.itemId);
              return (
                <div key={lineId} className="card tight">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>
                      سطر #{line?.lineNo ?? '—'} — {item ? itemLabel(item) : line?.description ?? '—'}
                    </strong>
                    <Link className="btn sm" href={`/optics/prescriptions?lineId=${lineId}`}>
                      👁️ عرض كامل
                    </Link>
                  </div>
                  <div className="grid cols-2" style={{ marginTop: 8 }}>
                    <div>
                      <h4>🔴 العين اليمنى (RE)</h4>
                      <dl className="kv">
                        {(section.labels?.right ?? []).map((lbl) => (
                          <div key={lbl.key} style={{ display: 'contents' }}>
                            <dt>{lbl.label}</dt>
                            <dd>{(section.right as Record<string, string>)?.[lbl.key] ?? '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <h4>🟢 العين اليسرى (LE)</h4>
                      <dl className="kv">
                        {(section.labels?.left ?? []).map((lbl) => (
                          <div key={lbl.key} style={{ display: 'contents' }}>
                            <dt>{lbl.label}</dt>
                            <dd>{(section.left as Record<string, string>)?.[lbl.key] ?? '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {doc.payments.length > 0 && (
        <div className="card">
          <h2>الدفعات</h2>
          <DataTable
            rows={doc.payments}
            rowKey={(row) => row.id}
            columns={[
              { key: 'at', header: 'التاريخ', align: 'ltr', cell: (row) => dateTime(row.createdAt) },
              { key: 'method', header: 'الطريقة', cell: (row) => row.method },
              { key: 'amount', header: 'المبلغ', align: 'num', cell: (row) => money(row.amount) },
              { key: 'ref', header: 'المرجع', cell: (row) => row.reference ?? '—' },
            ]}
          />
        </div>
      )}
    </Screen>
  );
}

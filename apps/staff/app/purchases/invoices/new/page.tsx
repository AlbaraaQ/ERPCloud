'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Notice } from '../../../../components/data-view';
import { InvoiceLines, TotalsPanel, computeTotals, emptyLine, filledLines, serialList, toApiLines, type LineDraft } from '../../../../components/invoice-editor';
import { Screen } from '../../../../components/screen';
import { ApiError, apiData, apiList, apiPost } from '../../../../lib/api';
import {
  arabicName,
  branchOptions,
  defaultOf,
  listBranches,
  listCostCenters,
  listItems,
  listParties,
  listTaxGroups,
  listWarehouses,
  partyLabel,
  today,
  type Branch,
  type CostCenter,
  type Item,
  type Party,
  type TaxGroup,
  type Warehouse,
} from '../../../../lib/lookups';
import { SERIAL_MESSAGES, decideSerial, type SerialLookup } from '../../../../lib/serial-numbers';
import { useSession } from '../../../../lib/session';
import { useQuery } from '../../../../lib/use-query';

type OcrField = { value: string | null; confidence: number };
type OcrJob = {
  id: string;
  fileId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  entityType: 'purchase_invoice' | 'expense';
  extracted: {
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    subtotal: string | null;
    taxTotal: string | null;
    total: string | null;
    currency: string | null;
    fields: Record<string, OcrField>;
    lines: Array<{ description: string; quantity: string; unitPrice: string; taxRate: string; total: string }>;
  };
  confidence: number | null;
  provider: string;
  error: string | null;
};

type FileDownload = { url: string; name: string; expiresAt: string };

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return '#15803d';
  if (confidence >= 0.6) return '#b45309';
  return '#b91c1c';
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const { can } = useSession();
  const branches = useQuery<Branch[]>(() => listBranches(), []);
  const warehouses = useQuery<Warehouse[]>(() => listWarehouses(), []);
  const suppliers = useQuery<Party[]>(() => listParties('supplier'), []);
  const items = useQuery<Item[]>(() => listItems(), []);
  const taxGroups = useQuery<TaxGroup[]>(() => listTaxGroups(), []);
  /**
   * «عفوآ رقم المرجع موجود مسبقآ هل تريد الاستمرار ؟» — `frmInvPurch.xaml.cs:1211`.
   * الديسكتوب **ينبّه ولا يمنع**، والسحابة لا تفرض قيداً على تكرار المرجع — فالتحذير هنا
   * للإعلام فقط، تماماً كما في النافذة.
   */
  const invoices = useQuery<{ supplierReferenceNo: string | null }[]>(() => apiList('/purchase-invoices'), []);
  /** R9 — 📊 مركز التكلفة: قائمة الرأس كما في `frmInvPurch.xaml` L467. */
  const costCenters = useQuery<CostCenter[]>(() => listCostCenters(), []);

  const [branchId, setBranchId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [kind, setKind] = useState<'purchase' | 'purchase_return'>('purchase');
  const [supplierRef, setSupplierRef] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [supplierRefDate, setSupplierRefDate] = useState(today());
  const [includesVat, setIncludesVat] = useState(false);
  const [allocation, setAllocation] = useState<'value' | 'qty'>('value');
  const [invoiceDiscountText, setInvoiceDiscountText] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [serialQuery, setSerialQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrJob, setOcrJob] = useState<OcrJob>();
  const [ocrFileUrl, setOcrFileUrl] = useState('');
  const [ocrSupplierName, setOcrSupplierName] = useState('');
  const [ocrTotalText, setOcrTotalText] = useState('');
  const [ocrTaxText, setOcrTaxText] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn' | 'danger'; text: string } | undefined>();

  const branchRows = branches.data ?? [];
  const warehouseRows = warehouses.data ?? [];
  const effectiveBranch = branchId || defaultOf(branchRows)?.id || '';
  const effectiveWarehouse = warehouseId || defaultOf(warehouseRows.filter((row) => !effectiveBranch || row.branchId === effectiveBranch))?.id || '';
  const totals = computeTotals(lines, { priceIncludesVat: includesVat, invoiceDiscount: invoiceDiscountText });
  const duplicateRef =
    supplierRef.trim().length > 0 &&
    (invoices.data ?? []).some((row) => (row.supplierReferenceNo ?? '').trim() === supplierRef.trim());

  async function scanPurchaseInvoice(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setOcrBusy(true);
    setNotice(undefined);
    try {
      const presign = await apiPost<{ fileId: string; uploadUrl: string; requiredHeaders: Record<string, string> }>(
        '/ocr/presign',
        { name: file.name, mime: file.type || 'application/octet-stream', sizeBytes: file.size },
      );
      const upload = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: presign.requiredHeaders,
        body: file,
      });
      if (!upload.ok) throw new Error(`فشل رفع الملف (${upload.status})`);
      await apiPost(`/files/${presign.fileId}/finalize`, {});
      const download = await apiData<FileDownload>(`/files/${presign.fileId}/download`);
      setOcrFileUrl(download.url);

      let job = await apiPost<OcrJob>('/ocr/jobs', { fileId: presign.fileId, entityType: 'purchase_invoice' });
      for (let attempt = 0; attempt < 24 && (job.status === 'queued' || job.status === 'processing'); attempt += 1) {
        await wait(500);
        job = await apiData<OcrJob>(`/ocr/jobs/${job.id}`);
      }
      setOcrJob(job);
      if (job.status === 'done') {
        const extracted = job.extracted;
        setOcrSupplierName(extracted.supplierName ?? '');
        setSupplierRef(extracted.invoiceNumber ?? '');
        if (extracted.invoiceDate) setSupplierRefDate(extracted.invoiceDate);
        setOcrTotalText(extracted.total ?? '');
        setOcrTaxText(extracted.taxTotal ?? '');
        const supplier = (suppliers.data ?? []).find(
          (row) => row.name?.trim().toLocaleLowerCase() === extracted.supplierName?.trim().toLocaleLowerCase(),
        );
        if (supplier) setPartyId(supplier.id);
        setNotice({
          kind: 'ok',
          text: 'اكتمل الاستخراج. راجع الحقول؛ يمكنك إنشاء مسودة رأسية الآن أو ربط أصناف المخزون قبل الحفظ.',
        });
      } else {
        setNotice({ kind: 'warn', text: job.error ?? 'تعذّر إكمال استخراج الفاتورة.' });
      }
    } catch (error) {
      setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) });
    } finally {
      setOcrBusy(false);
    }
  }

  /**
   * «💾 حفظ» L1428 و«🖨️💾 حفظ مع طباعة» L1424 — زرّا `frmInvPurch.xaml` (وبترتيب
   * رموزٍ معكوس عن نافذة البيع). الاثنان يكتبان المسودّة، والثاني يفتح ورقة الطباعة
   * بعدها بدل شاشة الفاتورة.
   */
  /**
   * «🔢 التسلسلي:» — نافذة المشتريات تعرض الأرقام من قائمة السياق («🔢 الرقم التسلسلي»
   * `frmInvPurch.xaml` L714 ← `MenuItemSerialNo_Click` L897)، وهذا الإدخال يجعلها في
   * متناول اليد كما في نافذة البيع: الإدخال يقرأ الرقم عن العبوة فيأتي بالسطر.
   */
  async function findSerial() {
    const value = serialQuery.trim();
    setNotice(undefined);
    if (!value) {
      setNotice({ kind: 'warn', text: SERIAL_MESSAGES.empty });
      return;
    }
    try {
      const lookup = await apiData<SerialLookup>(`/inventory/serials/lookup?serialNo=${encodeURIComponent(value)}`);
      const verdict = decideSerial({ lookup: { ...lookup, serialNo: value }, lines, parse: serialList });
      if (verdict.decision.kind === 'reject') {
        setNotice({ kind: 'warn', text: verdict.decision.text });
        return;
      }
      const decision = verdict.decision;
      const item = (items.data ?? []).find((row) => row.id === decision.itemId);
      const group = item?.taxGroupId ? (taxGroups.data ?? []).find((row) => row.id === item.taxGroupId) : undefined;
      const base = emptyLine(group ? String(Number(group.rate) * 100) : '15');
      setLines([
        ...lines.filter((line) => line.itemId || line.description.trim() || line.serialText.trim()),
        {
          ...base,
          itemId: decision.itemId,
          unitPriceText: String(item?.purchasePrice ?? item?.purchase_price ?? ''),
          taxGroupId: group?.id ?? '',
          serialText: decision.serialNo,
        },
      ]);
      setSerialQuery('');
    } catch (error) {
      const text = error instanceof ApiError && error.status === 403 ? SERIAL_MESSAGES.forbidden : String(error);
      setNotice({ kind: 'warn', text });
    }
  }

  async function save(event: React.SyntheticEvent, print = false) {
    event.preventDefault();
    setBusy(true);
    setNotice(undefined);
    try {
      if (filledLines(lines).length === 0 && ocrJob?.status !== 'done') {
        throw new ApiError(422, 'VALIDATION_FAILED', 'لا يمكن حفظ الفاتورة بدون أصناف.');
      }
      const apiLines = toApiLines(lines).map((line) => ({ ...line, itemId: line.itemId }));
      const ocrLines = apiLines.map(({ itemId, description, quantity, unitPrice, taxRate, taxGroupId, discountRate }) => ({
        itemId,
        description,
        quantity,
        unitPrice,
        taxRate,
        taxGroupId: taxGroupId || undefined,
        discountRate,
      }));
      const invoice = await apiPost<{ id: string }>(ocrJob?.status === 'done' ? '/purchases/invoices/from-ocr' : '/purchase-invoices', {
        ...(ocrJob?.status === 'done' ? { ocrJobId: ocrJob.id } : {}),
        branchId: effectiveBranch,
        warehouseId: effectiveWarehouse || undefined,
        partyId,
        ...(ocrJob?.status === 'done' ? { supplierName: ocrSupplierName || undefined } : { kind }),
        costCenterId: costCenterId || undefined,
        supplierReferenceNo: supplierRef.trim() || undefined,
        supplierReferenceDate: supplierRefDate || undefined,
        priceIncludesVat: includesVat,
        invoiceDiscount: invoiceDiscountText.trim() || undefined,
        landedCostAlloc: allocation,
        lines: ocrJob?.status === 'done' ? ocrLines : apiLines,
      });
      router.push(print ? `/print/purchase-invoice/${invoice.id}` : `/purchases/invoices/${invoice.id}`);
    } catch (error) {
      setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) });
      setBusy(false);
    }
  }

  if (!can('purchase.invoice.create')) {
    return (
      <Screen title="فاتورة المشتريات" crumbs={['المشتريات', 'العمليات']}>
        <div className="card state">
          <strong>لا تملك صلاحية إنشاء فواتير المشتريات</strong>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      // «فاتورة المشتريات» — `Form_WPF/frmInvPurch.xaml` L7، وتبويبها «📄  الفاتورة  » L290.
      title="فاتورة المشتريات"
      subtitle="تُحفظ كمسودة يمكن إضافة مصاريف الشحن والتخليص إليها، ثم تُرحَّل فتُحمَّل تلك المصاريف على تكلفة الأصناف."
      crumbs={['المشتريات', 'العمليات']}
    >
      <form className="card" onSubmit={save}>
        {can('purchase.ocr.use') && (
          <section className="toolbar" aria-labelledby="ocr-heading">
            <div>
              <h2 id="ocr-heading">📷 قراءة فاتورة من ملف</h2>
              <p className="muted small">ارفع صورة أو PDF؛ سيُستخرج رأس الفاتورة، ثم راجع القيم واربط البنود بأصناف المخزون يدوياً.</p>
            </div>
            <label className="btn">
              {ocrBusy ? 'جارٍ التحليل…' : 'اختيار صورة أو PDF'}
              <input
                type="file"
                accept="application/pdf,image/*"
                hidden
                disabled={ocrBusy}
                onChange={(event) => void scanPurchaseInvoice(event)}
              />
            </label>
          </section>
        )}

        {ocrJob && (
          <section className="card" aria-labelledby="ocr-review-heading">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 id="ocr-review-heading">مراجعة الاستخراج</h2>
                <p className="muted small">المزوّد: {ocrJob.provider} — الحالة: {ocrJob.status}</p>
              </div>
              {ocrFileUrl && (
                <a className="btn sm" href={ocrFileUrl} target="_blank" rel="noreferrer">
                  فتح الملف
                </a>
              )}
            </div>
            {ocrJob.status === 'done' ? (
              <>
                <div className="form-grid">
                  <label className="field">
                    <span>اسم المورد المستخرج</span>
                    <input className="input" value={ocrSupplierName} onChange={(event) => setOcrSupplierName(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>رقم الفاتورة المستخرج</span>
                    <input className="input" dir="ltr" value={supplierRef} onChange={(event) => setSupplierRef(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>تاريخ الفاتورة المستخرج</span>
                    <input className="input" type="date" dir="ltr" value={supplierRefDate} onChange={(event) => setSupplierRefDate(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>الإجمالي المستخرج</span>
                    <input className="input" dir="ltr" inputMode="decimal" value={ocrTotalText} onChange={(event) => setOcrTotalText(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>الضريبة المستخرجة</span>
                    <input className="input" dir="ltr" inputMode="decimal" value={ocrTaxText} onChange={(event) => setOcrTaxText(event.target.value)} />
                  </label>
                </div>
                <div className="row" aria-label="ثقة الحقول المستخرجة">
                  {Object.entries(ocrJob.extracted.fields).map(([key, field]) => (
                    <span key={key} className="badge" style={{ color: confidenceColor(field.confidence) }}>
                      {key}: {Math.round(field.confidence * 100)}%
                    </span>
                  ))}
                </div>
                {ocrJob.extracted.lines.length > 0 && (
                  <p className="muted small">تم العثور على {ocrJob.extracted.lines.length} بنداً نصياً؛ اختر الصنف المقابل لكل بند في جدول الأصناف أدناه قبل الحفظ.</p>
                )}
              </>
            ) : (
              <p className="muted">{ocrJob.error ?? 'ما زالت المهمة قيد المعالجة.'}</p>
            )}
          </section>
        )}

        <div className="form-grid">
          <label className="field">
            <span>الفرع *</span>
            <select className="input" value={effectiveBranch} onChange={(event) => setBranchId(event.target.value)} required>
              {branchOptions(branchRows).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>🏪 المستودع</span>
            <select className="input" value={effectiveWarehouse} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="">— بدون حركة مخزنية —</option>
              {warehouseRows
                .filter((row) => !effectiveBranch || row.branchId === effectiveBranch)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {arabicName(row)}
                  </option>
                ))}
            </select>
            {filledLines(lines).some((line) => line.itemId) && !effectiveWarehouse && (
              <span className="muted small">ترحيل فاتورة فيها أصناف مخزنية يتطلب اختيار مستودع.</span>
            )}
          </label>
          <label className="field">
            <span>👤 اسم المورد *</span>
            <select className="input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required>
              <option value="">— اختر —</option>
              {(suppliers.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {partyLabel(row)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>النوع</span>
            <select className="input" value={kind} onChange={(event) => setKind(event.target.value as 'purchase' | 'purchase_return')}>
              <option value="purchase">فاتورة مشتريات</option>
              <option value="purchase_return">مردود مشتريات</option>
            </select>
          </label>
          <label className="field">
            {/* «📋 المرجع» — `frmInvPurch.xaml` L545 (`txtRefNo` = رقم فاتورة المورد). */}
            <span>📋 المرجع</span>
            <input className="input" dir="ltr" value={supplierRef} onChange={(event) => setSupplierRef(event.target.value)} />
            {duplicateRef && <span className="muted small">عفوآ رقم المرجع موجود مسبقآ هل تريد الاستمرار ؟</span>}
          </label>
          <label className="field">
            <span>تاريخ فاتورة المورد</span>
            <input className="input" type="date" dir="ltr" value={supplierRefDate} onChange={(event) => setSupplierRefDate(event.target.value)} />
          </label>
          <label className="field">
            <span>خصم على الفاتورة</span>
            <input className="input" dir="ltr" inputMode="decimal" value={invoiceDiscountText} onChange={(event) => setInvoiceDiscountText(event.target.value)} />
            <span className="muted small">يُخفّض وعاء الضريبة قبل احتسابها.</span>
          </label>
          {/* «🔢 التسلسلي:» — الإدخال يقرأ الرقم عن العبوة فيُضيف السطر (R8). */}
          <label className="field">
            <span>🔢 التسلسلي:</span>
            <span className="row">
              <input
                className="input"
                dir="ltr"
                value={serialQuery}
                placeholder="امسح الرقم أو اكتبه"
                onChange={(event) => setSerialQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void findSerial();
                  }
                }}
              />
              <button className="btn sm" type="button" onClick={() => void findSerial()}>
                بحث
              </button>
            </span>
            <span className="muted small">الرقم المسجَّل عندنا يُضاف سطره، والمباع يُنبَّه عليه.</span>
          </label>
          {/* «📊 مركز التكلفة» — `frmInvPurch.xaml` L467 (بلا نقطتين، كما في نافذة الشراء). */}
          <label className="field">
            <span>📊 مركز التكلفة</span>
            <select className="input" value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)}>
              <option value="">— بلا مركز —</option>
              {(costCenters.data ?? []).map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code} — {arabicName(center)}
                </option>
              ))}
            </select>
            <span className="muted small">مركز الفاتورة كلها — ولكل سطرٍ أن يخالفه من عموده.</span>
          </label>
          <label className="field">
            <span>توزيع المصاريف</span>
            <select className="input" value={allocation} onChange={(event) => setAllocation(event.target.value as 'value' | 'qty')}>
              <option value="value">بحسب القيمة</option>
              <option value="qty">بحسب الكمية</option>
            </select>
          </label>
          <label className="field">
            <span>الأسعار شاملة الضريبة</span>
            <span className="row">
              <input type="checkbox" checked={includesVat} onChange={(event) => setIncludesVat(event.target.checked)} />
              <span className="muted small">تُستخرج الضريبة من السعر بدل إضافتها إليه.</span>
            </span>
          </label>
        </div>

        <h2>الأصناف</h2>
        <InvoiceLines
          lines={lines}
          onChange={setLines}
          items={items.data ?? []}
          taxGroups={taxGroups.data ?? []}
          priceField="purchasePrice"
          withNumbers
          costCenters={costCenters.data ?? []}
        />

        <h2>الإجماليات</h2>
        <TotalsPanel totals={totals} variant="purchase" />

        <Notice notice={notice} />
        <div className="row">
          {/* «💾 حفظ» L1428 و«🖨️💾 حفظ مع طباعة» L1424 في `frmInvPurch.xaml`. */}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : '💾 حفظ'}
          </button>
          <button className="btn" type="button" disabled={busy} onClick={(event) => void save(event, true)}>
            🖨️💾 حفظ مع طباعة
          </button>
        </div>
      </form>
    </Screen>
  );
}

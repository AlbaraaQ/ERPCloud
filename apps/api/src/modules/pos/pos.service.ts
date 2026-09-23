import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { calculateInvoiceTotals, DomainError, errorCodes, newId } from '@erp/contracts';
import { resolveTenantSettings } from '@erp/config';
import {
  cashLocations,
  diningTables,
  items,
  orderEvents,
  posHolds,
  salesInvoices,
  shiftCloses,
  tableCategories,
  tenantSettings,
  warehouses,
  withTenantTx,
  type DatabaseHandle,
} from '@erp/database';

import { DATABASE_HANDLE } from '../../database/database.module.js';
import { getRequestContext } from '../../request-context/request-context.js';
import { SalesService } from '../sales/sales.service.js';
import { SequencesService } from '../platform-services/index.js';

export type TableCategoryInput = { branchId: string; name: string; sortOrder?: number; printerName?: string };
export type DiningTableInput = {
  branchId: string;
  categoryId: string;
  tableNo: string;
  name: string;
  seats?: number;
};
export type OrderItemInput = {
  itemId?: string;
  description?: string;
  qty: string;
  unitValue: string;
  modifiers?: Array<Record<string, unknown>>;
};

/** One cart line at the till — the smallest shape a cashier screen can send. */
export type PosCheckoutLine = {
  itemId: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  discountAmount?: string;
  description?: string;
};
/**
 * How the till takes the money. `card` is a network (bank-card) tender: it settles
 * to the branch's bank account exactly like `bank`, but keeps its own payment row
 * so the shift report can tell network takings from transfers.
 */
export type PosCheckoutPayment = {
  method: 'cash' | 'card' | 'bank' | 'credit';
  cashLocationId?: string;
  settlementAccountId?: string;
  /** Cash handed over by the customer; the difference is returned as change. */
  tendered?: string;
  reference?: string;
};
export type PosCheckoutInput = {
  branchId: string;
  warehouseId?: string;
  partyId?: string;
  cashCustomerName?: string;
  cashCustomerMobile?: string;
  priceIncludesVat?: boolean;
  invoiceDiscount?: string;
  orderType?: string;
  /** Force the sale onto a specific shift; defaults to the caller's open shift. */
  shiftId?: string;
  lines: PosCheckoutLine[];
  payment: PosCheckoutPayment;
  /**
   * R4 — «🔀 متعدد»: طرق دفعٍ عدّة على الفاتورة نفسها (`frmPOSPay.xaml` L286). تُغني عن
   * `payment` المفرد ولا تلغيه، ومجموعها يجب أن يطابق صافي الفاتورة («⚖️ F6 مطابقة» L548)
   * أو يقلّ عنه إن كان الباقي على ذمة عميلٍ مُسمّى.
   */
  payments?: Array<{ method: 'cash' | 'card' | 'bank'; amount: string; cashLocationId?: string; settlementAccountId?: string; reference?: string }>;
  /** R4 — كل صف يخزّن مبالغ الفكة المعلنة، والتغيير يُحسب على الجزء النقدي وحده. */
  tendered?: string;
};

/** 🅿️ خانة تعليق كما يكتبها الكاشير — سطور الواجهة لا سطور المستند. */
export type PosHoldInput = {
  branchId: string;
  slot?: number;
  label?: string;
  cart: Record<string, unknown>;
  total?: string;
  linesCount?: number;
};

type OpenLine = {
  lineKey: string;
  itemId?: string | null;
  description?: string | null;
  qty: string;
  unitValue: string;
  modifiers: Array<Record<string, unknown>>;
};

@Injectable()
export class PosService {
  constructor(
    @Inject(DATABASE_HANDLE) private readonly database: DatabaseHandle,
    private readonly sales: SalesService,
    private readonly sequences: SequencesService,
  ) {}

  /**
   * بوابة الفوج — `feature.pos` في سجلّ الإعدادات (`packages/config/tenant-settings.ts`).
   *
   * R4 كشف أنّ هذه الخدمة (وشقيقاتها في الأفواج الأخرى) كانت تقرأ `pack.pos` وهو مفتاح
   * **ليس في السجلّ**: `PUT /settings/pack.pos` يردّ 400 فلا سبيل لتشغيل الفوج أو إطفائه
   * من الواجهة، والبوابة تعمل لأنّ الصفّ غائبٌ أصلاً. صار القارئ هو المفتاح المُسجَّل،
   * و`pack.pos` يبقى مقبولاً لمن كتبه في قاعدةٍ قديمة — صفٌّ صريح `false` في أيّهما يُطفئ.
   */
  async ensureEnabled(tenantId: string) {
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select({ key: tenantSettings.key, value: tenantSettings.value })
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            sql`${tenantSettings.key} in ('feature.pos', 'pack.pos')`,
          ),
        ),
    );
    const off = rows.some((row) => row.value === false || row.value === 'false');
    if (off) throw new DomainError('NOT_FOUND', 'POS pack is disabled for this tenant', 404);
  }

  /**
   * ⚙️ إعدادات الكاشير — نافذة `frmCasherSetting.xaml` (٣٠٧ أسطر): الباركود أوتوماتيك،
   * الشاشة التاتش، عرض المجموعات والأصناف، وقيم التوصيل والتأمين والوحدة الافتراضية.
   *
   * تُقرأ هنا بصلاحية `pos.view` لا بصلاحية إعدادات المستأجر: الكاشير يحتاجها ليعمل، ولا
   * يملك `tenant.settings.manage`. والكتابة تبقى على `PUT /settings/pos.*` من شاشة
   * الإعدادات، فالمسار المُخوَّل للكتابة واحدٌ لا اثنان.
   */
  async posSettings(tenantId: string) {
    await this.ensureEnabled(tenantId);
    const stored = await withTenantTx(this.database.db, tenantId, async (tx) => {
      const rows = await tx
        .select({ key: tenantSettings.key, value: tenantSettings.value })
        .from(tenantSettings)
        .where(
          and(eq(tenantSettings.tenantId, tenantId), sql`${tenantSettings.key} like 'pos.%'`),
        );
      return new Map(rows.map((row) => [row.key, row.value as string | boolean | number | null]));
    });
    const resolved = resolveTenantSettings(stored);
    return {
      data: Object.fromEntries(
        Object.entries(resolved).filter(([key]) => key.startsWith('pos.')),
      ) as Record<string, string | boolean | number | null>,
    };
  }

  // ── 🅿️ الفواتير المعلّقة (Hold Orders) ────────────────────────────────────────
  //
  // `frmPOS.xaml.cs` L1871–L1962: تسعة أزرار (`HoldList[9]`, L179)، الضغط عليها يعلّق
  // الفاتورة الحالية في أوّل خانة فارغة أو يقول «لقد وصلت للحد الاقصي من عمليات الايقاف
  // المؤقت» (L1935)، والضغط على زرٍّ مشغول يسترجع السلة — ويرفض إن كان الجدول غير فارغ:
  // «يوجد أصناف في الجدول» (L1955). والسحابة تُبقي الشروط الثلاثة وتنقلها إلى الخادم:
  // الحدّ في `hold()`, والفراغ شرطُ واجهةٍ يقولها المستخدم لنفسه.

  /** خانات الكاشير في الفرع — الفارغة لا صفَّ لها، فالشاشة تعرف المشغول من الغائب. */
  async holds(tenantId: string, userId: string, branchId: string) {
    await this.ensureEnabled(tenantId);
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(posHolds)
        .where(
          and(
            eq(posHolds.tenantId, tenantId),
            eq(posHolds.branchId, branchId),
            eq(posHolds.userId, userId),
          ),
        )
        .orderBy(posHolds.slot),
    );
    return { data: rows, slots: 9 };
  }

  /** يعلّق سلةً في خانة: المسمّاة إن جاءت، وإلا أوّل خانة فارغة. */
  async hold(tenantId: string, userId: string, input: PosHoldInput) {
    await this.ensureEnabled(tenantId);
    if (!input.branchId)
      throw new DomainError('POS_HOLD_NOT_FOUND', 'A branch is required to hold a ticket', 422, {
        field: 'branchId',
      });
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const existing = await tx
        .select({ slot: posHolds.slot })
        .from(posHolds)
        .where(
          and(
            eq(posHolds.tenantId, tenantId),
            eq(posHolds.branchId, input.branchId),
            eq(posHolds.userId, userId),
          ),
        );
      const taken = new Set(existing.map((row) => row.slot));
      let slot = input.slot;
      if (slot === undefined) {
        slot = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((candidate) => !taken.has(candidate));
      }
      if (slot === undefined)
        throw new DomainError(
          errorCodes.POS_HOLD_LIMIT_REACHED,
          'لقد وصلت للحد الاقصي من عمليات الايقاف المؤقت',
          422,
        );
      if (slot < 0 || slot > 8)
        throw new DomainError('POS_HOLD_NOT_FOUND', 'Hold slots run from 0 to 8', 422, {
          field: 'slot',
        });
      const values = {
        branchId: input.branchId,
        userId,
        slot,
        label: input.label,
        cart: input.cart,
        total: input.total ?? '0',
        linesCount: input.linesCount ?? 0,
        heldAt: new Date(),
        updatedAt: new Date(),
      };
      const [row] = await tx
        .insert(posHolds)
        .values({ id: newId(), tenantId, createdBy: userId, ...values })
        .onConflictDoUpdate({
          target: [posHolds.tenantId, posHolds.branchId, posHolds.userId, posHolds.slot],
          set: values,
        })
        .returning();
      return { data: row };
    });
  }

  /** يسترجع الخانة ويفرغها في نداءٍ واحد: المسترجَع لا يبقى معلّقاً في مكانين. */
  async recallHold(tenantId: string, userId: string, id: string) {
    await this.ensureEnabled(tenantId);
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(posHolds)
        .where(and(eq(posHolds.tenantId, tenantId), eq(posHolds.id, id)))
        .limit(1);
      if (!row || row.userId !== userId)
        throw new DomainError(errorCodes.POS_HOLD_NOT_FOUND, 'This hold belongs to another cashier', 404);
      await tx
        .delete(posHolds)
        .where(and(eq(posHolds.tenantId, tenantId), eq(posHolds.id, id)));
      return { data: { id, slot: row.slot, cart: row.cart, total: row.total, label: row.label } };
    });
  }

  /** وترمى الخانة بلا استرجاع (إفراغ الصندوق آخر النهار). */
  async dropHold(tenantId: string, userId: string, id: string) {
    await this.ensureEnabled(tenantId);
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(posHolds)
        .where(and(eq(posHolds.tenantId, tenantId), eq(posHolds.id, id)))
        .limit(1);
      if (!row || row.userId !== userId)
        throw new DomainError(errorCodes.POS_HOLD_NOT_FOUND, 'This hold belongs to another cashier', 404);
      await tx
        .delete(posHolds)
        .where(and(eq(posHolds.tenantId, tenantId), eq(posHolds.id, id)));
      return { data: { id, released: true } };
    });
  }

  async categories(tenantId: string, branchId?: string) {
    await this.ensureEnabled(tenantId);
    return withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(tableCategories)
        .where(
          and(
            eq(tableCategories.tenantId, tenantId),
            branchId ? eq(tableCategories.branchId, branchId) : sql`true`,
          ),
        )
        .orderBy(tableCategories.sortOrder),
    );
  }
  async createCategory(tenantId: string, input: TableCategoryInput) {
    await this.ensureEnabled(tenantId);
    const [row] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .insert(tableCategories)
        .values({
          id: newId(),
          tenantId,
          branchId: input.branchId,
          name: input.name,
          sortOrder: input.sortOrder ?? 0,
          printerName: input.printerName,
        })
        .returning(),
    );
    return row;
  }

  async tables(tenantId: string, branchId?: string) {
    await this.ensureEnabled(tenantId);
    return withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(diningTables)
        .where(
          and(
            eq(diningTables.tenantId, tenantId),
            branchId ? eq(diningTables.branchId, branchId) : sql`true`,
          ),
        )
        .orderBy(diningTables.tableNo),
    );
  }
  async createTable(tenantId: string, input: DiningTableInput) {
    await this.ensureEnabled(tenantId);
    const [row] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .insert(diningTables)
        .values({
          id: newId(),
          tenantId,
          branchId: input.branchId,
          categoryId: input.categoryId,
          tableNo: input.tableNo,
          name: input.name,
          seats: input.seats ?? 4,
        })
        .returning(),
    );
    return row;
  }

  async openTable(tenantId: string, id: string, businessDay = today()) {
    await this.ensureEnabled(tenantId);
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(diningTables)
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, id)))
        .limit(1);
      if (!row) throw new DomainError('NOT_FOUND', 'Dining table not found', 404);
      if (row.status === 'disabled') throw new DomainError('POS_TABLE_DISABLED', 'Table is disabled', 422);
      await tx
        .update(diningTables)
        .set({ status: 'open', openedAt: row.openedAt ?? new Date(), updatedAt: new Date() })
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, id)));
      await tx
        .insert(orderEvents)
        .values({
          id: newId(),
          tenantId,
          branchId: row.branchId,
          tableId: id,
          kind: 'open',
          businessDay,
          lineKey: newId(),
        });
      return { id, status: 'open' };
    });
  }

  async addItem(tenantId: string, tableId: string, input: OrderItemInput, businessDay = today()) {
    await this.ensureEnabled(tenantId);
    if (new Decimal(input.qty).lte(0))
      throw new DomainError('VALIDATION_FAILED', 'Quantity must be positive', 422);
    const [table] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(diningTables)
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId)))
        .limit(1),
    );
    if (!table || table.status === 'disabled')
      throw new DomainError('NOT_FOUND', 'Dining table not found or disabled', 404);
    const [row] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .insert(orderEvents)
        .values({
          id: newId(),
          tenantId,
          branchId: table.branchId,
          tableId,
          kind: 'add_item',
          businessDay,
          lineKey: newId(),
          itemId: input.itemId,
          description: input.description,
          qty: input.qty,
          unitValue: input.unitValue,
          modifiers: input.modifiers ?? [],
          firedAt: new Date(),
        })
        .returning(),
    );
    return row;
  }

  async voidItem(tenantId: string, eventId: string, reason: string) {
    await this.ensureEnabled(tenantId);
    if (!reason.trim()) throw new DomainError('POS_VOID_REASON_REQUIRED', 'Void reason is required', 422);
    return withTenantTx(this.database.db, tenantId, async (tx) => {
      const [event] = await tx
        .select()
        .from(orderEvents)
        .where(and(eq(orderEvents.tenantId, tenantId), eq(orderEvents.id, eventId)))
        .limit(1);
      if (!event || event.kind !== 'add_item')
        throw new DomainError('NOT_FOUND', 'Order item event not found', 404);
      const [row] = await tx
        .insert(orderEvents)
        .values({
          id: newId(),
          tenantId,
          branchId: event.branchId,
          tableId: event.tableId,
          kind: 'void_item',
          businessDay: event.businessDay,
          lineKey: event.lineKey,
          itemId: event.itemId,
          description: event.description,
          qty: event.qty,
          unitValue: event.unitValue,
          modifiers: event.modifiers,
          reason,
          voidedAt: new Date(),
        })
        .returning();
      return row;
    });
  }

  async merge(tenantId: string, sourceTableId: string, targetTableId: string) {
    await this.ensureEnabled(tenantId);
    if (sourceTableId === targetTableId)
      throw new DomainError('VALIDATION_FAILED', 'Merge requires two different tables', 422);
    await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .update(diningTables)
        .set({ status: 'merged', combinedInto: targetTableId, updatedAt: new Date() })
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, sourceTableId))),
    );
    return { data: { sourceTableId, targetTableId, status: 'merged' } };
  }
  async split(tenantId: string, tableId: string) {
    await this.ensureEnabled(tenantId);
    await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .update(diningTables)
        .set({ status: 'open', combinedInto: null, updatedAt: new Date() })
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId))),
    );
    return { data: { tableId, status: 'open' } };
  }

  async sendToInvoice(
    tenantId: string,
    tableId: string,
    cashCustomerName = 'POS customer',
    orderType = 'table',
    businessDay = today(),
  ) {
    await this.ensureEnabled(tenantId);
    const openLines = await this.openLines(tenantId, tableId);
    if (!openLines.length) throw new DomainError('POS_ORDER_EMPTY', 'No active POS lines to invoice', 422);
    const [table] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(diningTables)
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId)))
        .limit(1),
    );
    if (!table) throw new DomainError('NOT_FOUND', 'Dining table not found', 404);
    const allocated = await withTenantTx(this.database.db, tenantId, (tx) =>
      this.sequences.next({ tenantId, branchId: table.branchId, docType: `pos_order:${businessDay}` }, tx, {
        prefix: `POS-${businessDay.replaceAll('-', '')}-`,
        padding: 4,
      }),
    );
    // A table order is a stock-moving sale, and the posting engine (rightly) refuses
    // one without a warehouse. The till's own branch default is the only sensible
    // answer — the desktop `frmPOS` always sold out of the branch's store.
    const [warehouse] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.tenantId, tenantId),
            eq(warehouses.branchId, table.branchId),
            eq(warehouses.isActive, true),
            isNull(warehouses.deletedAt),
          ),
        )
        .orderBy(warehouses.isDefault, warehouses.code)
        .limit(1),
    );
    const invoice = await this.sales.create(tenantId, {
      branchId: table.branchId,
      warehouseId: warehouse?.id,
      cashCustomerName,
      kind: 'sale',
      lines: openLines.map((line) => ({
        itemId: line.itemId ?? undefined,
        description: decoratedDescription(line),
        quantity: line.qty,
        unitPrice: line.unitValue,
        taxRate: '0',
      })),
    });
    await withTenantTx(this.database.db, tenantId, async (tx) => {
      await tx
        .update(salesInvoices)
        .set({ orderType, tableNo: table.tableNo, updatedAt: new Date() })
        .where(and(eq(salesInvoices.tenantId, tenantId), eq(salesInvoices.id, invoice.id)));
      await tx
        .update(orderEvents)
        .set({ invoiceId: invoice.id, updatedAt: new Date() })
        .where(
          and(
            eq(orderEvents.tenantId, tenantId),
            eq(orderEvents.tableId, tableId),
            eq(orderEvents.kind, 'add_item'),
          ),
        );
      await tx
        .insert(orderEvents)
        .values({
          id: newId(),
          tenantId,
          branchId: table.branchId,
          tableId,
          kind: 'send_to_invoice',
          businessDay,
          lineKey: allocated.display,
          invoiceId: invoice.id,
        });
      await tx
        .update(diningTables)
        .set({ currentInvoiceId: invoice.id, updatedAt: new Date() })
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId)));
    });
    return {
      data: {
        orderNo: allocated.display,
        invoiceId: invoice.id,
        status: invoice.status,
        tableNo: table.tableNo,
      },
    };
  }

  /**
   * Closes a table: posts the order invoice and settles it the way the guest paid.
   * `settlement` defaults to `credit` (the table goes on the room/customer account),
   * which is what the old behaviour did implicitly — but a cashier can now close a
   * table against cash or a card and have the payment row written in the same
   * transaction as the journal.
   */
  async close(
    tenantId: string,
    tableId: string,
    settlementInput?: {
      settlement?: 'credit' | 'cash' | 'card' | 'bank';
      cashLocationId?: string;
      settlementAccountId?: string;
    },
  ) {
    await this.ensureEnabled(tenantId);
    const [table] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(diningTables)
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId)))
        .limit(1),
    );
    if (!table?.currentInvoiceId)
      throw new DomainError('POS_TABLE_NOT_INVOICED', 'Send table to invoice before closing', 422);
    const method = settlementInput?.settlement ?? 'credit';
    const target =
      method === 'credit'
        ? undefined
        : await this.resolveTenderTarget(tenantId, table.branchId, {
            method,
            cashLocationId: settlementInput?.cashLocationId,
            settlementAccountId: settlementInput?.settlementAccountId,
          });
    const posted = await this.sales.post(tenantId, table.currentInvoiceId, {
      settlement: method,
      settlementAccountId: target?.accountId,
      settlementCashLocationId: target?.cashLocationId,
    });
    await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .update(diningTables)
        .set({ status: 'closed', closedAt: new Date(), currentInvoiceId: null, updatedAt: new Date() })
        .where(and(eq(diningTables.tenantId, tenantId), eq(diningTables.id, tableId))),
    );
    return {
      data: {
        tableId,
        invoiceId: posted.id,
        number: posted.number,
        total: posted.total,
        paidTotal: posted.paidTotal,
        paymentStatus: posted.paymentStatus,
        method,
        status: 'closed',
      },
    };
  }

  // ── Till checkout ───────────────────────────────────────────────────────────
  //
  // The desktop `frmPOS` wrote the invoice, its stock movement, its entry and its
  // payment from one Save button. Until Phase 04 the cloud screen did that in three
  // browser round trips, each of which could fail and leave a sale that exists in
  // `sales_invoices` but has no journal, no stock movement or no payment — the
  // exact "half-finished sale" a till must never produce.
  //
  // `checkout` is the engine contract: one API call, one transaction. It borrows
  // the sales engine wholesale (numbering, gates, average-cost stock relief,
  // profile-built journal, settlement payment) and adds what only a till knows:
  // the drawer the money went into, the shift that captured the sale, and the
  // change owed back to the customer.

  /** Resolves the drawer/account a tender lands in — never an unvalidated guess. */
  private async resolveTenderTarget(tenantId: string, branchId: string, payment: PosCheckoutPayment) {
    const kind = payment.method === 'cash' ? 'safe' : 'bank';
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(cashLocations)
        .where(
          and(
            eq(cashLocations.tenantId, tenantId),
            eq(cashLocations.branchId, branchId),
            eq(cashLocations.isActive, true),
            isNull(cashLocations.deletedAt),
            payment.cashLocationId ? eq(cashLocations.id, payment.cashLocationId) : sql`true`,
          ),
        ),
    );
    if (payment.cashLocationId) {
      const named = rows[0];
      if (!named)
        throw new DomainError(
          'POS_CASH_LOCATION_INVALID',
          'The cash location does not belong to this branch',
          422,
          { field: 'cashLocationId' },
        );
      const accountId = payment.settlementAccountId ?? named.accountId ?? undefined;
      if (!accountId)
        throw new DomainError(
          'POS_SETTLEMENT_ACCOUNT_REQUIRED',
          'This cash location has no linked account — link one in Settings › Cash locations',
          422,
          { field: 'cashLocationId' },
        );
      return { cashLocationId: named.id, accountId };
    }
    // No drawer named: fall back to the branch default of the tender's kind, so a
    // cashier screen with a single till never has to ask.
    const fallback =
      rows.find((row) => row.kind === kind && row.isDefault) ?? rows.find((row) => row.kind === kind);
    const accountId = payment.settlementAccountId ?? fallback?.accountId ?? undefined;
    if (!accountId)
      throw new DomainError(
        'POS_SETTLEMENT_ACCOUNT_REQUIRED',
        'No cash location with a linked account is configured for this branch',
        422,
        { field: 'cashLocationId' },
      );
    return { cashLocationId: fallback?.id, accountId };
  }

  /**
   * Which shift captures this sale. An explicit `shiftId` is validated; otherwise
   * the caller's own open shift at that branch is used, and a till with no shift
   * simply records none — unless the tenant turned `pos.requireShift` on, in which
   * case cash cannot be taken outside a shift (the desktop's day-close discipline).
   */
  private async resolveShiftId(
    tenantId: string,
    branchId: string,
    userId: string,
    requested: string | undefined,
    isCash: boolean,
  ): Promise<string | undefined> {
    const [shift] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(shiftCloses)
        .where(
          requested
            ? and(eq(shiftCloses.tenantId, tenantId), eq(shiftCloses.id, requested))
            : and(
                eq(shiftCloses.tenantId, tenantId),
                eq(shiftCloses.branchId, branchId),
                eq(shiftCloses.userId, userId),
                eq(shiftCloses.status, 'open'),
              ),
        ),
    );
    if (requested) {
      if (!shift)
        throw new DomainError('POS_SHIFT_INVALID', 'Cashier shift was not found', 404, { field: 'shiftId' });
      if (shift.status !== 'open')
        throw new DomainError('POS_SHIFT_CLOSED', 'This cashier shift is already closed', 409, {
          field: 'shiftId',
        });
      if (shift.branchId !== branchId)
        throw new DomainError('POS_SHIFT_BRANCH_MISMATCH', 'This shift belongs to another branch', 422, {
          field: 'shiftId',
        });
      return shift.id;
    }
    if (!shift && isCash && (await this.requireShift(tenantId))) {
      throw new DomainError('POS_SHIFT_REQUIRED', 'Open a cashier shift before taking cash', 422);
    }
    return shift?.id;
  }

  private async requireShift(tenantId: string): Promise<boolean> {
    const [flag] = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, 'pos.requireShift')))
        .limit(1),
    );
    return flag?.value === true || flag?.value === 'true';
  }

  /** One call, one transaction: the sale, its stock, its journal, its money. */
  async checkout(tenantId: string, userId: string, input: PosCheckoutInput) {
    await this.ensureEnabled(tenantId);
    if (!input.lines.length) throw new DomainError('POS_CART_EMPTY', 'The cart is empty', 422);
    const split = input.payments ?? [];
    const method = input.payment.method;
    if (!['cash', 'card', 'bank', 'credit'].includes(method))
      throw new DomainError('POS_PAYMENT_METHOD_INVALID', 'Unsupported payment method', 422, {
        field: 'payment.method',
      });
    for (const tender of split) {
      if (!['cash', 'card', 'bank'].includes(tender.method))
        throw new DomainError('POS_PAYMENT_METHOD_INVALID', 'Unsupported payment method', 422, {
          field: 'payments',
        });
      if (!new Decimal(tender.amount).isFinite() || new Decimal(tender.amount).lte(0))
        throw new DomainError('POS_TENDER_INVALID', 'Every tender needs a positive amount', 422, {
          field: 'payments',
        });
    }
    if (split.length && method !== 'cash' && method !== split[0]?.method)
      throw new DomainError(
        'POS_PAYMENT_METHOD_INVALID',
        'A split ticket declares its tenders in `payments`',
        422,
        { field: 'payment.method' },
      );
    for (const line of input.lines) {
      if (!line.itemId) throw new DomainError('POS_LINE_ITEM_REQUIRED', 'Every cart line needs an item', 422);
      if (!new Decimal(line.quantity).isFinite() || new Decimal(line.quantity).lte(0))
        throw new DomainError('POS_LINE_QUANTITY_INVALID', 'Cart quantities must be positive', 422);
    }
    if (method === 'credit' && !input.partyId)
      throw new DomainError(
        'POS_CREDIT_CUSTOMER_REQUIRED',
        'A postponed sale needs a customer account',
        422,
        { field: 'partyId' },
      );
    /**
     * R4 — «لا يمكن تعديل السعر» (`frmPOS.xaml.cs` L1377، والحارس `User.EditPrice` من
     * `Class/User.cs` L24 · L95 عبر OperNo 13).
     *
     * الديسكتوب لا يمنع كتابة سعرٍ في الحقل فحسب، بل يُعطّل زرّ التعديل على مَن لا يملك
     * الرمز. والسحابة تفحص **النتيجة**: سعرُ سطرٍ يخالف `items.sale_price` يحتاج
     * `pos.priceoverride` — ومَن يحمله يعمل كما يعمل المشرف في الديسكتوب بالضبط.
     * وصنفٌ بلا سعر بيع (`NULL`) لا يُقارَن به شيء فلا يُحجب.
     */
    await this.assertPriceOverridesAllowed(tenantId, input.lines);

    // The engine recomputes and remains authoritative; this pre-check exists so a
    // short tender can be refused *before* anything is written.
    const priceIncludesVat = input.priceIncludesVat ?? true;
    const totals = calculateInvoiceTotals({
      lines: input.lines.map((line) => ({ ...line, taxRate: line.taxRate ?? '0' })),
      priceIncludesVat,
      invoiceDiscount: input.invoiceDiscount,
    });
    const tendered = input.payment.tendered ? new Decimal(input.payment.tendered) : undefined;
    if (tendered && !tendered.isFinite())
      throw new DomainError('POS_TENDER_INVALID', 'The tendered amount is not a number', 422, {
        field: 'payment.tendered',
      });
    if (tendered && !split.length && tendered.lt(totals.total))
      throw new DomainError('POS_INSUFFICIENT_CASH', 'The tendered amount is less than the sale total', 422, {
        field: 'payment.tendered',
      });

    /**
     * ⚖️ F6 مطابقة — `frmPOSPay.xaml` L548.
     *
     * مجموع الطرق يجب أن يطابق صافي الفاتورة. والزيادة رفضٌ صريح (`POS_TENDER_MISMATCH`
     * بعدد الفرق لا برسالةٍ مبهمة)، والنقص مسموحٌ **بشرط** حساب عميلٍ يقف عليه الباقي —
     * وإلا فاتورةٌ نصف مدفوعة بلا مدين، وهو ما لا يجده المحاسب لاحقاً.
     */
    const tenderedTotal = split.reduce((sum, tender) => sum.plus(tender.amount), new Decimal(0));
    if (split.length) {
      const diff = tenderedTotal.minus(totals.total);
      if (diff.gt(0))
        throw new DomainError(
          errorCodes.POS_TENDER_MISMATCH,
          `The tenders are more than the total by ${diff.toFixed(4)}`,
          422,
          { field: 'payments', difference: diff.toFixed(4) },
        );
      if (diff.lt(0) && !input.partyId)
        throw new DomainError(
          errorCodes.POS_TENDER_MISMATCH,
          `The tenders are short of the total by ${diff.abs().toFixed(4)} — name a customer account for the rest`,
          422,
          { field: 'payments', difference: diff.toFixed(4) },
        );
    }
    const cashPortion = split.length
      ? split.reduce(
          (sum, tender) => (tender.method === 'cash' ? sum.plus(tender.amount) : sum),
          new Decimal(0),
        )
      : totals.total;
    if (tendered && tendered.lt(cashPortion))
      throw new DomainError('POS_INSUFFICIENT_CASH', 'The tendered amount is less than the cash due', 422, {
        field: 'payment.tendered',
      });
    const change = tendered ? tendered.minus(cashPortion).toFixed(4) : '0.0000';

    const target =
      method === 'credit' || split.length
        ? undefined
        : await this.resolveTenderTarget(tenantId, input.branchId, input.payment);
    const settlements = split.length
      ? await Promise.all(
          split.map(async (tender) => {
            const resolved = await this.resolveTenderTarget(tenantId, input.branchId, {
              method: tender.method,
              cashLocationId: tender.cashLocationId,
              settlementAccountId: tender.settlementAccountId,
            });
            return {
              method: tender.method,
              amount: new Decimal(tender.amount).toFixed(4),
              accountId: resolved.accountId,
              cashLocationId: resolved.cashLocationId,
              reference: tender.reference,
            };
          }),
        )
      : undefined;
    const shiftId = await this.resolveShiftId(
      tenantId,
      input.branchId,
      userId,
      input.shiftId,
      split.length ? split.some((tender) => tender.method === 'cash') : method === 'cash',
    );

    const invoice = await this.sales.createAndPost(
      tenantId,
      {
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        partyId: input.partyId,
        cashCustomerName: input.cashCustomerName ?? (input.partyId ? undefined : 'عميل نقدي'),
        cashCustomerMobile: input.cashCustomerMobile,
        kind: 'sale',
        priceIncludesVat,
        invoiceDiscount: input.invoiceDiscount,
        orderType: input.orderType ?? 'pos',
        shiftId,
        // 🧑‍💼 مَن كان على الصندوق — R4: `cashier_id` لا يقوله `created_by` دائماً.
        cashierId: userId,
        lines: input.lines.map((line) => ({
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate ?? '0',
          discountAmount: line.discountAmount ?? '0',
        })),
      },
      settlements
        ? { settlements }
        : {
            settlement: method === 'credit' ? 'credit' : method,
            settlementAccountId: target?.accountId,
            settlementCashLocationId: target?.cashLocationId,
          },
    );

    return {
      data: {
        invoiceId: invoice.id,
        number: invoice.number,
        subtotal: invoice.subtotal,
        taxTotal: invoice.taxTotal,
        total: invoice.total,
        paidTotal: invoice.paidTotal,
        paymentStatus: invoice.paymentStatus,
        method: split.length ? 'split' : method,
        // 🔀 متعدد: الشاشة تعرض ما قبضته فعلاً طريقةً طريقة، والباقي على الحساب إن بقي.
        tenders: settlements?.map((entry) => ({ method: entry.method, amount: entry.amount })) ?? null,
        onAccount: split.length ? new Decimal(invoice.total).minus(tenderedTotal).toFixed(4) : null,
        cashierId: invoice.cashierId ?? userId,
        cashLocationId: target?.cashLocationId ?? null,
        shiftId: shiftId ?? null,
        change,
        tendered: tendered ? tendered.toFixed(4) : null,
      },
    };
  }

  /**
   * «لا يمكن تعديل السعر» — R4.
   *
   * الرمز `pos.priceoverride` مُعلَنٌ في السجلّ («Override POS item prices where tenant caps
   * permit it») وكان بلا قارئ. صار القارئ: سعرُ سطرٍ في السلة يخالف سعر الصنف المعلن
   * يحتاج الرمز، ويُرفض بـ403 ورسالة النافذة نفسها. والديسكتوب اسمُها عنده `User.EditPrice`؛
   * والسحابة تُسمّي الرمز لا الخانة.
   */
  private async assertPriceOverridesAllowed(tenantId: string, lines: PosCheckoutLine[]) {
    const tenant = getRequestContext().tenant;
    if (tenant?.permissions.includes('*') || tenant?.permissions.includes('pos.priceoverride'))
      return;
    const itemIds = [...new Set(lines.map((line) => line.itemId))];
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select({ id: items.id, salePrice: items.salePrice })
        .from(items)
        .where(and(eq(items.tenantId, tenantId), sql`${items.id} in ${itemIds}`)),
    );
    const priceOf = new Map(rows.map((row) => [row.id, row.salePrice]));
    const overridden = lines.find((line) => {
      const stated = priceOf.get(line.itemId);
      if (!stated) return false;
      return new Decimal(stated).minus(new Decimal(line.unitPrice)).abs().gt(0.00005);
    });
    if (overridden)
      throw new DomainError(
        errorCodes.POS_PRICE_OVERRIDE_FORBIDDEN,
        'لا يمكن تعديل السعر',
        403,
        { field: 'lines', itemId: overridden.itemId, unitPrice: overridden.unitPrice },
      );
  }

  async openLines(tenantId: string, tableId: string): Promise<OpenLine[]> {
    const rows = await withTenantTx(this.database.db, tenantId, (tx) =>
      tx
        .select()
        .from(orderEvents)
        .where(and(eq(orderEvents.tenantId, tenantId), eq(orderEvents.tableId, tableId)))
        .orderBy(orderEvents.createdAt),
    );
    const voided = new Set(rows.filter((row) => row.kind === 'void_item').map((row) => row.lineKey));
    return rows
      .filter((row) => row.kind === 'add_item' && !voided.has(row.lineKey) && !row.invoiceId)
      .map((row) => ({
        lineKey: row.lineKey,
        itemId: row.itemId,
        description: row.description,
        qty: row.qty,
        unitValue: row.unitValue,
        modifiers: row.modifiers,
      }));
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function decoratedDescription(line: OpenLine): string {
  return JSON.stringify({ text: line.description ?? 'POS item', modifiers: line.modifiers });
}

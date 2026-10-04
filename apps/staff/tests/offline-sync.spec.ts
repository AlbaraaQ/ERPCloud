import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  refreshOfflineCatalog,
  retryOfflineConflict,
  startOfflineAutoSync,
  syncOfflineInvoices,
} from '../lib/sync-engine';

/**
 * Behavioural tests for the offline sync engine.
 *
 * `tests/offline-pos.spec.ts` covers the PWA surface — manifest, service worker,
 * and the fact that certain strings appear in the source. It never executes the
 * engine, so it would stay green if `syncOfflineInvoices` stopped sending the
 * payload the server needs, or if a conflict were silently recorded as synced.
 * Both of those are exactly the failures a cashier discovers at the worst moment:
 * the invoice looks queued, the customer has left, and the money is not in the ledger.
 *
 * These tests mock the two collaborators (`./api`, `./offline-db`) and drive the
 * real engine, so the contract it depends on is asserted rather than assumed.
 */

const api = vi.hoisted(() => ({
  apiData: vi.fn(),
  apiPost: vi.fn(),
}));

const db = vi.hoisted(() => ({
  getOrCreateDeviceId: vi.fn(),
  listOfflineInvoices: vi.fn(),
  pendingOfflineInvoices: vi.fn(),
  saveOfflineCatalog: vi.fn(),
  updateOfflineInvoice: vi.fn(),
}));

vi.mock('../lib/api', () => ({ apiData: api.apiData, apiPost: api.apiPost }));
vi.mock('../lib/offline-db', () => ({
  getOrCreateDeviceId: db.getOrCreateDeviceId,
  listOfflineInvoices: db.listOfflineInvoices,
  pendingOfflineInvoices: db.pendingOfflineInvoices,
  saveOfflineCatalog: db.saveOfflineCatalog,
  updateOfflineInvoice: db.updateOfflineInvoice,
}));

/** A queued checkout, shaped exactly as `saveOfflineInvoice` would have stored it. */
function queuedInvoice(overrides: Record<string, unknown> = {}) {
  return {
    offlineId: 'OFFLINE-dev-1-abcdef',
    deviceId: 'dev',
    sequenceNo: 1,
    createdAt: '2026-10-04T10:00:00.000Z',
    payload: {
      branchId: 'branch-1',
      lines: [{ itemId: 'item-1', quantity: '2', unitPrice: '10.00' }],
      payment: { method: 'cash' as const },
    },
    status: 'pending' as const,
    ...overrides,
  };
}

/** The engine reads `navigator.onLine`; Node's global navigator has none. */
function goOnline() {
  vi.stubGlobal('navigator', { onLine: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  goOnline();
  db.getOrCreateDeviceId.mockResolvedValue('dev');
  db.updateOfflineInvoice.mockResolvedValue(undefined);
});

describe('syncOfflineInvoices', () => {
  it('sends the pending queue with the fields the server reconciles on', async () => {
    const record = queuedInvoice();
    db.pendingOfflineInvoices.mockResolvedValue([record]);
    api.apiPost.mockResolvedValue({ processed: 1, synced: 1, conflicts: 0, results: [] });

    await syncOfflineInvoices();

    expect(api.apiPost).toHaveBeenCalledTimes(1);
    const [path, body] = api.apiPost.mock.calls[0]!;
    expect(path).toBe('/pos/offline-sync');
    // Identity and ordering are what make the sync idempotent server-side; if any
    // of these were dropped the server could not deduplicate a retried batch.
    expect(body).toEqual({
      deviceId: 'dev',
      invoices: [
        {
          offlineId: 'OFFLINE-dev-1-abcdef',
          deviceId: 'dev',
          sequenceNo: 1,
          createdAt: '2026-10-04T10:00:00.000Z',
          payload: record.payload,
        },
      ],
    });
  });

  it('records a synced result with the real invoice id and number', async () => {
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);
    api.apiPost.mockResolvedValue({
      processed: 1,
      synced: 1,
      conflicts: 0,
      results: [
        {
          offlineId: 'OFFLINE-dev-1-abcdef',
          sequenceNo: 1,
          status: 'synced',
          invoiceId: 'inv-9',
          number: 'SI-000042',
        },
      ],
    });

    await syncOfflineInvoices();

    expect(db.updateOfflineInvoice).toHaveBeenCalledWith('OFFLINE-dev-1-abcdef', {
      status: 'synced',
      invoiceId: 'inv-9',
      number: 'SI-000042',
      errorCode: undefined,
      message: undefined,
      resolution: undefined,
    });
  });

  it('records a conflict as a conflict, never as synced', async () => {
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);
    api.apiPost.mockResolvedValue({
      processed: 1,
      synced: 0,
      conflicts: 1,
      results: [
        {
          offlineId: 'OFFLINE-dev-1-abcdef',
          sequenceNo: 1,
          status: 'conflict',
          errorCode: 'STOCK_INSUFFICIENT',
          message: 'لا رصيد كافٍ',
          resolution: { adjusted: true },
        },
      ],
    });

    await syncOfflineInvoices();

    expect(db.updateOfflineInvoice).toHaveBeenCalledWith('OFFLINE-dev-1-abcdef', {
      status: 'conflict',
      invoiceId: undefined,
      number: undefined,
      errorCode: 'STOCK_INSUFFICIENT',
      message: 'لا رصيد كافٍ',
      resolution: { adjusted: true },
    });
  });

  it('writes back every result, not just the first', async () => {
    db.pendingOfflineInvoices.mockResolvedValue([
      queuedInvoice({ offlineId: 'OFFLINE-a', sequenceNo: 1 }),
      queuedInvoice({ offlineId: 'OFFLINE-b', sequenceNo: 2 }),
    ]);
    api.apiPost.mockResolvedValue({
      processed: 2,
      synced: 1,
      conflicts: 1,
      results: [
        { offlineId: 'OFFLINE-a', sequenceNo: 1, status: 'synced', invoiceId: 'inv-1' },
        { offlineId: 'OFFLINE-b', sequenceNo: 2, status: 'conflict', errorCode: 'PRICE_CHANGED' },
      ],
    });

    const response = await syncOfflineInvoices();

    expect(db.updateOfflineInvoice).toHaveBeenCalledTimes(2);
    expect(response.synced).toBe(1);
    expect(response.conflicts).toBe(1);
  });

  it('does not call the API when there is nothing pending', async () => {
    db.pendingOfflineInvoices.mockResolvedValue([]);

    const response = await syncOfflineInvoices();

    expect(api.apiPost).not.toHaveBeenCalled();
    expect(response).toEqual({ processed: 0, synced: 0, conflicts: 0, results: [] });
  });

  it('does not call the API while the device is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);

    const response = await syncOfflineInvoices();

    expect(api.apiPost).not.toHaveBeenCalled();
    // The queue is untouched — a rejected sync must not look like a synced one.
    expect(db.updateOfflineInvoice).not.toHaveBeenCalled();
    expect(response.processed).toBe(0);
  });
});

describe('retryOfflineConflict', () => {
  it('clears the conflict state before re-sending, so a stale error cannot survive', async () => {
    // The retry resets the record to pending, so the follow-up sync sees it again.
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);
    api.apiPost.mockResolvedValue({ processed: 0, synced: 0, conflicts: 0, results: [] });

    await retryOfflineConflict('OFFLINE-dev-1-abcdef');

    expect(db.updateOfflineInvoice).toHaveBeenCalledWith('OFFLINE-dev-1-abcdef', {
      status: 'pending',
      errorCode: undefined,
      message: undefined,
      resolution: undefined,
    });
    expect(api.apiPost).toHaveBeenCalledTimes(1);
  });

  it('sends the retried record, which is pending again', async () => {
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);
    api.apiPost.mockResolvedValue({
      processed: 1,
      synced: 1,
      conflicts: 0,
      results: [{ offlineId: 'OFFLINE-dev-1-abcdef', sequenceNo: 1, status: 'synced', invoiceId: 'inv-3' }],
    });

    const response = await retryOfflineConflict('OFFLINE-dev-1-abcdef');

    expect(api.apiPost).toHaveBeenCalledTimes(1);
    expect(response.synced).toBe(1);
    expect(db.updateOfflineInvoice).toHaveBeenLastCalledWith('OFFLINE-dev-1-abcdef', {
      status: 'synced',
      invoiceId: 'inv-3',
      number: undefined,
      errorCode: undefined,
      message: undefined,
      resolution: undefined,
    });
  });
});

describe('refreshOfflineCatalog', () => {
  it('fetches the catalog and persists it before returning it', async () => {
    const catalog = { schemaVersion: 1, items: [{ id: 'item-1', salePrice: '10.00' }] };
    api.apiData.mockResolvedValue(catalog);
    db.saveOfflineCatalog.mockResolvedValue(undefined);

    const result = await refreshOfflineCatalog();

    expect(api.apiData).toHaveBeenCalledWith('/pos/offline-data');
    expect(db.saveOfflineCatalog).toHaveBeenCalledWith(catalog);
    expect(result).toBe(catalog);
  });
});

describe('startOfflineAutoSync', () => {
  function fakeWindow() {
    return {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setInterval: vi.fn(() => 7),
      clearInterval: vi.fn(),
    };
  }

  it('runs immediately, on reconnect, and on a ten-second timer', async () => {
    const win = fakeWindow();
    vi.stubGlobal('window', win);
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);
    api.apiPost.mockResolvedValue({ processed: 1, synced: 1, conflicts: 0, results: [] });

    const stop = startOfflineAutoSync();
    await vi.waitFor(() => expect(api.apiPost).toHaveBeenCalledTimes(1));

    expect(win.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(win.setInterval).toHaveBeenCalledWith(expect.any(Function), 10_000);

    // Reconnect fires the same handler.
    const onOnline = win.addEventListener.mock.calls.find((c) => c[0] === 'online')![1] as () => void;
    onOnline();
    await vi.waitFor(() => expect(api.apiPost).toHaveBeenCalledTimes(2));

    stop();
    expect(win.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(win.clearInterval).toHaveBeenCalledWith(7);
  });

  it('does not overlap two syncs of the same queue', async () => {
    const win = fakeWindow();
    vi.stubGlobal('window', win);
    let release!: (value: unknown) => void;
    api.apiPost.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);

    startOfflineAutoSync();
    await vi.waitFor(() => expect(api.apiPost).toHaveBeenCalledTimes(1));

    const onOnline = win.addEventListener.mock.calls.find((c) => c[0] === 'online')![1] as () => void;
    onOnline();
    onOnline();
    // Still one in flight — a second batch would duplicate the server-side work.
    expect(api.apiPost).toHaveBeenCalledTimes(1);

    release({ processed: 1, synced: 1, conflicts: 0, results: [] });
    await vi.waitFor(() => expect(api.apiPost).toHaveBeenCalledTimes(1));
  });

  it('stays silent while offline and does not throw', async () => {
    const win = fakeWindow();
    vi.stubGlobal('window', win);
    vi.stubGlobal('navigator', { onLine: false });
    db.pendingOfflineInvoices.mockResolvedValue([queuedInvoice()]);

    expect(() => startOfflineAutoSync()).not.toThrow();
    await Promise.resolve();
    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it('returns a no-op disposer when there is no window', () => {
    vi.stubGlobal('window', undefined);
    const stop = startOfflineAutoSync();
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
  });
});

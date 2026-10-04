import { describe, expect, it } from 'vitest';

import { notificationText, type Notification } from '../components/notification-bell';

/**
 * Behavioural tests for the words the notification inbox renders.
 *
 * Wave 4's live browser check (plan 4.2) cannot run here: this environment has
 * no browser at all, and the shared Chromium libraries are absent. But the half
 * of that check which can actually break is testable without one. The inbox
 * draws its title and body out of `payload` through `notificationText`, and the
 * demo seed writes exactly the `announcement` payload — `titleAr`/`titleEn`/
 * `bodyAr`/`bodyEn` + `href` — see `seedNotifications` in
 * `packages/database/src/seed-demo.ts`.
 *
 * If that mapping breaks, nothing crashes: the bell still opens and the list
 * still renders. It just shows the type name where the announcement's words
 * belong, or an empty line. That is RC-8's visible symptom ("the centre opens
 * and looks empty"), and every test that only asserts `GET /notifications`
 * returns rows would stay green through it.
 *
 * These tests execute the real helper; nothing here is asserted on source text.
 */

function makeItem(over: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    type: 'announcement',
    payload: {},
    readAt: null,
    createdAt: '2026-10-04T09:00:00.000Z',
    ...over,
  };
}

/**
 * The payload the seed inserts, with sentinel values. Sentinels keep the test
 * about *which key* is read — the actual coupling between seed and component —
 * rather than about any particular wording.
 */
function seededAnnouncement(): Notification {
  return makeItem({
    type: 'announcement',
    payload: {
      seed: 'rc-8-welcome',
      titleAr: 'AR-TITLE',
      titleEn: 'EN-TITLE',
      bodyAr: 'AR-BODY',
      bodyEn: 'EN-BODY',
      href: '/notifications',
    },
  });
}

describe('notificationText — the announcement the seed writes', () => {
  it('reads the Arabic pair for an Arabic reader', () => {
    const text = notificationText(seededAnnouncement(), 'ar');
    expect(text.title).toBe('AR-TITLE');
    expect(text.body).toBe('AR-BODY');
  });

  it('reads the English pair for an English reader', () => {
    const text = notificationText(seededAnnouncement(), 'en');
    expect(text.title).toBe('EN-TITLE');
    expect(text.body).toBe('EN-BODY');
  });

  it('never shows the type name, and never shows a blank line', () => {
    // The centre opening "full but empty" is the defect, not an exception.
    for (const locale of ['ar', 'en'] as const) {
      const text = notificationText(seededAnnouncement(), locale);
      expect(text.title).not.toContain('announcement');
      expect(text.title.length).toBeGreaterThan(0);
      expect(text.body.length).toBeGreaterThan(0);
    }
  });

  it('does not leak the other language into either reader', () => {
    expect(notificationText(seededAnnouncement(), 'ar').title).not.toBe('EN-TITLE');
    expect(notificationText(seededAnnouncement(), 'en').title).not.toBe('AR-TITLE');
  });
});

describe('notificationText — a payload the seed would not write', () => {
  it('falls back to a heading when the Arabic title is absent', () => {
    const item = makeItem({ payload: { titleEn: 'EN-TITLE' } });
    const arabic = notificationText(item, 'ar');
    expect(arabic.title.length).toBeGreaterThan(0);
    expect(arabic.title).not.toBe('EN-TITLE');
    expect(notificationText(item, 'en').title).toBe('EN-TITLE');
  });

  it('renders an empty body, never the word "undefined"', () => {
    const item = makeItem({ payload: { titleAr: 'AR-TITLE' } });
    expect(notificationText(item, 'ar').body).toBe('');
    expect(notificationText(item, 'ar').body).not.toContain('undefined');
  });

  it('survives a null payload without throwing', () => {
    const item = makeItem({ payload: null as unknown as Record<string, unknown> });
    expect(() => notificationText(item, 'ar')).not.toThrow();
  });
});

describe('notificationText — types the inbox does not know', () => {
  it('shows the type id as the title instead of inventing a sentence', () => {
    const item = makeItem({ type: 'settings.updated', payload: { message: 'MSG' } });
    const text = notificationText(item, 'ar');
    expect(text.title).toBe('settings.updated');
    expect(text.body).toBe('MSG');
  });

  it('treats a comment mention as a titled note', () => {
    const item = makeItem({ type: 'comment.mention', payload: { title: 'T', message: 'MSG' } });
    expect(notificationText(item, 'en')).toEqual({ title: 'T', body: 'MSG' });
  });
});

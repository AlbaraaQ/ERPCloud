'use client';

/**
 * Shared console widgets — the pieces only this console has.
 *
 * `Tabs` used to live here as a verbatim copy of the staff surface. That was
 * meant to prevent divergence, but it produced exactly the divergence ADR-030
 * forbids: a second implementation of a control `@erp/ui` already owns. It now
 * comes from the package, and what remains are the widgets with no
 * design-system counterpart.
 */

/**
 * A metered value as a bar. `ratio` is capped at 1 for the drawing and rounded for the
 * label, so «١ من ١» reads as full even when the counter is 1.4 of a fractional limit.
 */
export function MeterBar({ ratio, tone = 'ok' }: { ratio: number; tone?: 'ok' | 'warn' | 'danger' }) {
  const width = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="meter" role="presentation">
      <span className={`meter-fill ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

/**
 * «من أين جاءت هذه القيمة؟» — one tag for both endpoints, because they share one
 * vocabulary (`default | platform | tenant`): the usage limits and the settings tab must not
 * answer that question in two languages.
 */
export function SourceTag({ source }: { source: 'default' | 'platform' | 'tenant' }) {
  const label =
    source === 'tenant' ? 'تجاوزٌ خاص بالعميل' : source === 'platform' ? 'من إعدادات المنصّة' : 'القيمة الافتراضية';
  return <span className={`tag ${source}`}>{label}</span>;
}

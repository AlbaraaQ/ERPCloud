'use client';

import { motion } from 'framer-motion';

import { cn } from '../lib/cn';

/**
 * Toggle — a switch for one boolean that takes effect immediately.
 *
 * It is `role="switch"` with `aria-checked`, not a checkbox, because the
 * thing it controls is applied on change rather than submitted with a form.
 * The knob is positioned with *logical* margins (`margin-inline-*`), so the
 * same component animates toward the trailing edge in Arabic and the leading
 * edge in English without a direction branch (Design v3 §4).
 *
 * The spring is deliberately short — a switch that slides for half a second
 * reads as lag rather than as polish.
 */
export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Renders the label row; without it only the bare switch is returned. */
  label?: string;
  /** Secondary line under the label, e.g. what enabling this actually does. */
  hint?: string;
  className?: string;
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  className = '',
}: ToggleProps) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        checked ? 'bg-brand' : 'bg-line-raised',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="inline-block size-5 rounded-full bg-surface shadow-2"
        style={{ marginInlineStart: checked ? 'auto' : 2, marginInlineEnd: checked ? 2 : 'auto' }}
      />
    </button>
  );

  if (!label) return switchEl;

  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4',
        disabled ? 'opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] leading-snug text-muted">{hint}</span> : null}
      </span>
      {switchEl}
    </label>
  );
}

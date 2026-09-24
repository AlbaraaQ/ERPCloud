'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { CountUp } from './count-up';

export type MetricTone = 'violet' | 'green' | 'amber' | 'red' | 'sky' | 'slate';

const TONES: Record<MetricTone, { accent: string; text: string }> = {
  violet: { accent: '#7c3aed', text: 'text-violet-600' },
  green: { accent: '#10b981', text: 'text-emerald-600' },
  amber: { accent: '#f59e0b', text: 'text-amber-600' },
  red: { accent: '#ef4444', text: 'text-red-600' },
  sky: { accent: '#0ea5e9', text: 'text-sky-600' },
  slate: { accent: '#64748b', text: 'text-slate-500' },
};

/**
 * بطاقة مقياس — الأرقام بخط Mono (JetBrains) مع وسم اتجاه وخط شرارة صغير.
 * صك Vercel/Linear: بطاقة خفيفة، رقم كبير، شرارة 40px.
 */
export function MetricCard({
  label,
  value,
  suffix,
  icon,
  tone = 'violet',
  delta,
  deltaLabel,
  spark,
  hint,
  delay = 0,
  live,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: ReactNode;
  tone?: MetricTone;
  /** نسبة التغيّر (تُعرض سهمًا أخضر/أحمر). */
  delta?: number;
  deltaLabel?: string;
  /** نقاط الشرارة (تُرسم آخر 30 نقطة). */
  spark?: number[];
  hint?: string;
  delay?: number;
  /** نقطة نابضة — «live» مثل مؤشرات Linear. */
  live?: boolean;
}) {
  const toneDef = TONES[tone];
  const positive = (delta ?? 0) >= 0;
  const points = (spark ?? []).slice(-30);
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[10px] border border-slate-200 bg-white p-4 shadow-1 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-3"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${toneDef.accent}, transparent 70%)` }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-[11.5px] font-bold tracking-wide text-slate-500">
            {label}
            {live ? (
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              </span>
            ) : null}
          </p>
          <p
            className="m-0 mt-2 text-[26px] font-bold leading-none tracking-tight text-slate-900"
            style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
            dir="ltr"
          >
            <CountUp value={value} />
            {suffix ? <span className="text-[15px] font-semibold text-slate-400"> {suffix}</span> : null}
          </p>
        </div>
        {icon ? (
          <span className={`grid size-9 flex-none place-items-center rounded-lg border border-slate-100 bg-slate-50 ${toneDef.text}`}>
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta !== null && delta !== undefined ? (
            <p className="m-0 flex items-center gap-1 text-[11.5px] font-bold" style={{ color: positive ? '#059669' : '#dc2626' }}>
              <span dir="ltr">{positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>
              {deltaLabel ? <span className="font-medium text-slate-400">{deltaLabel}</span> : null}
            </p>
          ) : hint ? (
            <p className="m-0 truncate text-[11.5px] font-medium text-slate-400">{hint}</p>
          ) : null}
        </div>
        {points.length > 1 ? (
          <svg width="88" height="36" viewBox="0 0 88 36" className="flex-none overflow-visible" aria-hidden>
            <polyline
              fill="none"
              stroke={toneDef.accent}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points.map((p, i) => `${(i / (points.length - 1)) * 88},${32 - ((p - min) / range) * 28 + 2}`).join(' ')}
            />
            <circle
              cx="88"
              cy={32 - (((points[points.length - 1] ?? max) - min) / range) * 28 + 2}
              r="2.4"
              fill={toneDef.accent}
            />
          </svg>
        ) : null}
      </div>
    </motion.article>
  );
}

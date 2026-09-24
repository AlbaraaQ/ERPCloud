'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * حالة فارغة — أيقونة 64px في مربع ملوّن، عنوان، وصف، وزر إجراء اختياري.
 */
export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
};

const TONES = {
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-emerald-50 text-emerald-500',
  amber: 'bg-amber-50 text-amber-500',
  red: 'bg-red-50 text-red-400',
  slate: 'bg-slate-100 text-slate-400',
} as const;

export function EmptyState({ icon, title, description, action, tone = 'slate' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="grid place-items-center gap-3 py-14 px-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60"
    >
      <span className={`grid place-items-center size-16 rounded-2xl ${TONES[tone]}`} aria-hidden>
        {icon}
      </span>
      <div>
        <h3 className="m-0 text-[15px] font-bold text-slate-800">{title}</h3>
        {description ? <p className="m-0 mt-1 text-[13px] text-slate-500 max-w-sm mx-auto">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </motion.div>
  );
}

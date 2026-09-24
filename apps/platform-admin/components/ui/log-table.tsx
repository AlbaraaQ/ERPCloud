'use client';

import { type ReactNode } from 'react';

import { type Column } from './table';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'ok';

const LEVEL_CLS: Record<LogLevel, string> = {
  info: 'text-sky-700 bg-sky-50',
  warn: 'text-amber-700 bg-amber-50',
  error: 'text-red-700 bg-red-50',
  debug: 'text-slate-500 bg-slate-100',
  ok: 'text-emerald-700 bg-emerald-50',
};

/**
 * جدول سجلات — Monospace بالكامل، مستوى ملوّن، ترويسة داكنة مثبّتة، وكثافة 12.5px.
 * صك Vercel/Linear: خلفية رأس slate-900 وقيم mono.
 */
export function LogTable<T>({
  rows,
  rowKey,
  columns,
  levelOf,
  maxH = '62vh',
  empty,
}: {
  rows: T[];
  rowKey: (row: T, index: number) => string;
  columns: Array<Column<T>>;
  /** يُحدد مستوى السطر (يُلون أول عمود). */
  levelOf?: (row: T) => LogLevel;
  maxH?: string;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-auto rounded-[10px] border border-slate-800 bg-slate-950 shadow-2" style={{ maxHeight: maxH }}>
      <table className="w-full border-collapse text-[12.5px]" style={{ fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-800 bg-slate-900 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 ${
                  col.numeric ? 'text-end' : 'text-start'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-slate-500" style={{ fontFamily: 'var(--font-sans)' }}>
                {empty ?? 'لا توجد سجلات.'}
              </td>
            </tr>
          ) : null}
          {rows.map((row, index) => {
            const key = rowKey(row, index);
            const level = levelOf?.(row);
            return (
              <tr key={key} className="border-b border-slate-800/60 transition-colors duration-100 hover:bg-slate-900/60">
                {columns.map((col, ci) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 align-top ${col.numeric ? 'text-end' : 'text-start'}`}
                    dir={col.ltr ? 'ltr' : undefined}
                    style={{ color: ci === 0 && level ? undefined : '#cbd5e1' }}
                  >
                    {ci === 0 && level ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${LEVEL_CLS[level]}`}>
                        {col.cell(row, index) as ReactNode}
                      </span>
                    ) : (
                      col.cell(row, index)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

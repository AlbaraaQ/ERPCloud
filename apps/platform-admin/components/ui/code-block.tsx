'use client';

import { Check, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';

type Token = { text: string; cls: string };

/**
 * إبراز خفيف لـ JSON/مفاتيح: سلاسل، أرقام، مفتاح/قيمة، وأقواس — بلا مكتبة خارجية.
 * صك Linear/المفحط: خلفية slate-950، أقواس، رقم سطر اختياري.
 */
function tokenizeJson(line: string, lineIdx: number): Token[] {
  const tokens: Token[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\],:])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) tokens.push({ text: line.slice(last, match.index), cls: 'text-slate-400' });
    const [full, str, colon, num, bool, nul, punct] = match;
    if (str !== undefined) tokens.push({ text: str, cls: colon ? 'text-sky-300' : 'text-emerald-300' });
    if (colon) tokens.push({ text: colon, cls: 'text-slate-500' });
    if (num !== undefined) tokens.push({ text: num, cls: 'text-amber-300' });
    if (bool !== undefined) tokens.push({ text: bool, cls: 'text-violet-300' });
    if (nul !== undefined) tokens.push({ text: nul, cls: 'text-slate-500' });
    if (punct !== undefined) tokens.push({ text: punct, cls: 'text-slate-500' });
    last = match.index + full.length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last), cls: 'text-slate-300' });
  void lineIdx;
  return tokens;
}

/** بلوك كود — نسخ بنقرة، وأرقام أسطر، وإبراز JSON/مفاتيح خفيف. */
export function CodeBlock({ code, title, lines = true }: { code: string; title?: string; lines?: boolean }) {
  const [copied, setCopied] = useState(false);
  const rows = code.replace(/\n$/, '').split('\n');

  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-800 bg-slate-950 shadow-2">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/60 px-3 py-2">
        <span className="flex items-center gap-2 text-[11.5px] font-bold text-slate-400">
          <Terminal size={13} />
          {title ?? 'output'}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11.5px] font-bold text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-white"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>
      <pre
        dir="ltr"
        className="m-0 overflow-auto p-3 text-start font-mono text-[12px] leading-[1.7] text-slate-300"
        style={{ fontFamily: 'var(--font-mono)', maxHeight: 420 }}
      >
        {rows.map((row, i) => (
          <div key={i} className="flex">
            {lines ? (
              <span className="w-8 flex-none select-none pe-3 text-end text-slate-600">{i + 1}</span>
            ) : null}
            <span className="whitespace-pre-wrap break-all">
              {tokenizeJson(row, i).map((token, j) => (
                <span key={j} className={token.cls}>
                  {token.text}
                </span>
              ))}
              {row === '' ? ' ' : ''}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

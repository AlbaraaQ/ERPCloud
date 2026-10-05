'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, FolderKanban, Lock, ShieldAlert } from 'lucide-react';

import { findScreenByHref } from '../lib/navigation';

/**
 * Standard page chrome — v3: breadcrumbs + 26px title + subtitle + actions,
 * matching the redesigned staff screens.
 */
export function Screen({
  title,
  subtitle,
  crumbs,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-end justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-1">
        <div className="min-w-0">
          {crumbs && crumbs.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-slate-400 mb-1" aria-label="المسار">
              {crumbs.map((crumb, i) => (
                <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 ? <ChevronLeft size={12} className="text-slate-300" aria-hidden /> : null}
                  <span className={i === crumbs.length - 1 ? 'text-brand-600' : undefined}>{crumb}</span>
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="m-0 text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">{title}</h1>
          {subtitle ? <p className="m-0 mt-1 text-[13.5px] text-slate-500 font-medium">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5 no-print">{actions}</div> : null}
      </section>
      {children}
    </div>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-1 grid gap-3.5"
      aria-busy="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded-lg bg-slate-100 animate-pulse"
          style={{ width: `${100 - index * 8}%` }}
        />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-1 grid gap-3">
      <p className="m-0 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13.5px] font-semibold text-red-700">
        <ShieldAlert size={18} className="flex-none text-red-600" />
        تعذر تحميل البيانات: {message ?? 'خطأ غير معروف'}
      </p>
      {onRetry ? (
        <button
          className="h-10 px-4 rounded-[10px] bg-brand-600 text-white text-[13.5px] font-bold hover:bg-brand-700 transition-colors duration-150"
          type="button"
          onClick={onRetry}
          style={{ justifyContent: 'flex-start' }}
        >
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-1 grid place-items-center text-center gap-3">
      <span className="grid place-items-center size-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
        <Lock size={26} />
      </span>
      <p className="m-0 text-[16px] font-bold text-slate-800">لا تملك صلاحية الوصول</p>
      <p className="m-0 text-[13.5px] text-slate-500 max-w-md leading-relaxed">
        اطلب من مالك الحساب منحك الصلاحية المطلوبة من «صلاحيات المستخدمين».
      </p>
    </div>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-1 grid place-items-center text-center gap-3">
      <span className="grid place-items-center size-14 rounded-2xl bg-slate-100 text-slate-400">
        <FolderKanban size={26} />
      </span>
      <p className="m-0 text-[16px] font-bold text-slate-800">{title}</p>
      {detail ? <p className="m-0 text-[13.5px] text-slate-500 max-w-md leading-relaxed">{detail}</p> : null}
    </div>
  );
}

/**
 * Placeholder for a screen that exists in the menu tree but is not built yet.
 */
export function ScreenScaffold({ href }: { href: string }) {
  const item = findScreenByHref(href);

  if (!item) {
    return (
      <Screen title="شاشة غير معروفة" subtitle={href}>
        <Empty title="هذه الشاشة غير مسجلة في شجرة النظام" detail="تحقق من الرابط أو ارجع للرئيسية." />
        <Link className="btn" href="/">
          الرئيسية
        </Link>
      </Screen>
    );
  }

  return (
    <Screen
      title={item.labelAr}
      subtitle={item.labelEn}
      crumbs={[item.moduleLabelAr, item.groupLabelAr]}
      actions={
        <Link className="btn" href="/">
          الرئيسية
        </Link>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-1">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${
              item.status === 'api' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {item.status === 'api' ? 'الواجهة البرمجية جاهزة — الشاشة قيد التنفيذ' : 'قيد التطوير'}
          </span>
        </div>
        {item.status === 'api' ? (
          <p className="m-0 text-[13.5px] text-slate-600">
            منطق هذه الشاشة موجود بالفعل في الخادم ويمكن استدعاؤه الآن عبر المسار أدناه؛ ما ينقص هو واجهة
            الإدخال والعرض.
          </p>
        ) : (
          <p className="m-0 text-[13.5px] text-slate-600">
            هذه الشاشة مدرجة في خطة النظام ولم تُنفذ بعد، لا في الواجهة ولا في الخادم.
          </p>
        )}
        {item.endpoint ? (
          <dl className="grid gap-1.5 mt-4 text-[13px] bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <dt className="text-slate-400 font-bold">المسار البرمجي</dt>
            <dd className="m-0 font-bold text-slate-800 font-mono" dir="ltr">
              {item.endpoint}
            </dd>
            {item.permission ? (
              <>
                <dt className="text-slate-400 font-bold">الصلاحية</dt>
                <dd className="m-0 font-bold text-slate-800 font-mono" dir="ltr">
                  {item.permission}
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
    </Screen>
  );
}

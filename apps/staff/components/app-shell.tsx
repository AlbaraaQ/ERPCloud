'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  User,
} from 'lucide-react';

import { useLang, type Lang } from '../lib/i18n';
import { useSession } from '../lib/session';
import { visibleModules, type ModuleNode, type ScreenItem } from '../lib/navigation';

import { ImpersonationBanner } from './impersonation-banner';
import { NotificationBell } from './notification-bell';

const label = (lang: Lang, item: { labelAr: string; labelEn: string }): string =>
  lang === 'ar' ? item.labelAr : item.labelEn;

function statusDot(status: string, lang: Lang) {
  const title =
    status === 'ready'
      ? lang === 'ar'
        ? 'جاهز'
        : 'Ready'
      : status === 'api'
        ? lang === 'ar'
          ? 'الواجهة البرمجية جاهزة'
          : 'API ready'
        : lang === 'ar'
          ? 'قيد التطوير'
          : 'Planned';
  return <span className={`dot ${status}`} title={title} aria-label={title} />;
}

function ModuleBlock({
  module,
  pathname,
  filter,
  lang,
}: {
  module: ModuleNode;
  pathname: string;
  filter: string;
  lang: Lang;
}) {
  const matches = (text: string) => text.toLowerCase().includes(filter.toLowerCase());
  const groups = filter
    ? module.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matches(item.labelAr) || matches(item.labelEn)),
        }))
        .filter((group) => group.items.length > 0)
    : module.groups;

  const active = groups.some((group) => group.items.some((item) => pathname === item.href.split('?')[0]));
  const [open, setOpen] = useState(active || Boolean(filter));

  if (groups.length === 0) return null;
  const expanded = open || Boolean(filter);

  return (
    <div className={`nav-module ${expanded ? 'open' : ''}`}>
      <button
        type="button"
        className="nav-module-head"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
      >
        <span className="nav-icon" aria-hidden>
          {module.icon}
        </span>
        <span className="nav-module-label">
          {label(lang, module)}
          <small>{lang === 'ar' ? module.labelEn : module.labelAr}</small>
        </span>
        <span className="chev" aria-hidden>
          {expanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
        </span>
      </button>
      {expanded && (
        <div className="nav-groups">
          {groups.map((group) => (
            <div className="nav-group" key={group.key}>
              <p className="nav-group-title">{label(lang, group)}</p>
              {group.items.map((item: ScreenItem) =>
                item.status === 'ready' ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={pathname === item.href.split('?')[0] ? 'nav-link active' : 'nav-link'}
                  >
                    {statusDot(item.status, lang)}
                    <span>{label(lang, item)}</span>
                  </Link>
                ) : (
                  <span
                    key={item.key}
                    className="nav-link disabled"
                    title={item.endpoint ?? (lang === 'ar' ? 'قيد التطوير' : 'Planned')}
                    aria-disabled="true"
                  >
                    {statusDot(item.status, lang)}
                    <span>{label(lang, item)}</span>
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, isPlatformAdmin, signOut } = useSession();
  const { lang, t } = useLang();
  const pathname = usePathname() ?? '/';
  const [filter, setFilter] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const tree = useMemo(
    () => visibleModules(me?.permissions ?? [], isPlatformAdmin),
    [me?.permissions, isPlatformAdmin],
  );

  return (
    <div className="shell">
      <aside className={`side ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="logo">ERP</span>
          <span>
            Cloud SaaS ERP
            <small>{me?.membership.tenantName ?? '—'}</small>
          </span>
        </div>

        <Link href="/" className={pathname === '/' ? 'nav-link home active' : 'nav-link home'}>
          <Home size={16} className="text-brand-600" />
          <span>{t('nav.home')}</span>
        </Link>

        <div className="relative">
          <input
            className="nav-search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            aria-label={t('nav.searchPlaceholder')}
          />
        </div>

        <nav className="nav" aria-label={t('nav.searchPlaceholder')}>
          {tree.map((module) => (
            <ModuleBlock key={module.key} module={module} pathname={pathname} filter={filter} lang={lang} />
          ))}
        </nav>

        <div className="nav-legend">
          <span>
            <span className="dot ready" /> {t('nav.status.ready')}
          </span>
          <span>
            <span className="dot api" /> API
          </span>
          <span>
            <span className="dot planned" /> {t('nav.status.planned')}
          </span>
        </div>
      </aside>

      <main className="main">
        {/* P-C8: Impersonation banner */}
        <ImpersonationBanner impersonation={me?.impersonation} lang={lang} />
        <header className="topbar">
          <div className="row" style={{ alignItems: 'center' }}>
            <button
              className="btn only-mobile"
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t('nav.searchPlaceholder')}
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center gap-3">
              <span className="grid place-items-center size-9 rounded-xl bg-brand-50 text-brand-600 font-bold text-[13px]">
                {me?.membership.tenantCode?.slice(0, 2).toUpperCase() ?? 'ERP'}
              </span>
              <div>
                <strong className="text-[14px] font-bold text-slate-900">{me?.membership.tenantName ?? '—'}</strong>
                <p className="muted text-[12px]" style={{ margin: 0 }}>
                  {me?.membership.tenantCode
                    ? lang === 'ar'
                      ? `رمز المنشأة: ${me.membership.tenantCode}`
                      : `Tenant code: ${me.membership.tenantCode}`
                    : '—'}
                  {me?.membership.isOwner ? (lang === 'ar' ? ' · مالك' : ' · Owner') : ''}
                  {isPlatformAdmin ? (lang === 'ar' ? ' · مدير منصة' : ' · Platform admin') : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              <User size={14} className="text-slate-500" />
              <span className="text-[13px] font-semibold text-slate-800">{me?.user.fullName}</span>
            </div>
            {/* Notification bell */}
            <NotificationBell label={lang === 'ar' ? 'الإشعارات' : 'Notifications'} />
            <Link className="btn" href="/settings/change-password">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </Link>
            <Link
              className="btn"
              href="/settings/two-factor"
              title={lang === 'ar' ? 'التحقق بخطوتين' : 'Two-factor authentication'}
            >
              <ShieldCheck size={16} className="text-emerald-600" />
            </Link>
            <button className="btn danger" type="button" onClick={() => void signOut()}>
              <LogOut size={14} />
              {t('nav.logout')}
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

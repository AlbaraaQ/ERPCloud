'use client';

import { useEffect, useState } from 'react';

import { Notice } from '../../../components/data-view';
import { Screen } from '../../../components/screen';
import { ApiError, apiData, apiPut } from '../../../lib/api';

type Settings = {
  enabled: boolean;
  platformSuspended: boolean;
  platformEnabled: boolean;
  provider: string | null;
  effectiveProvider: string;
  model: string | null;
  effectiveModel: string;
  monthlyTokenLimit: number | null;
  monthlyCostLimit: string | null;
  /** RC-11 — presence booleans. Neither ever carries the key itself. */
  hasApiKey: boolean;
  hasPlatformKey: boolean;
  usage: { tokens: number; spent: string; tokenLimit: number | null; costLimit: string | null; period: string };
};

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [enabled, setEnabled] = useState(true);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [tokenLimit, setTokenLimit] = useState('');
  const [costLimit, setCostLimit] = useState('');
  // Empty means "leave the stored key alone": the box never re-fills with a secret we
  // do not have, so an untouched save cannot rotate the key by accident.
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'danger' | 'info'; text: string }>();

  async function reload() {
    const next = await apiData<Settings>('/ai/settings');
    setSettings(next);
    setEnabled(next.enabled);
    setProvider(next.provider ?? '');
    setModel(next.model ?? '');
    setTokenLimit(next.monthlyTokenLimit === null ? '' : String(next.monthlyTokenLimit));
    setCostLimit(next.monthlyCostLimit ?? '');
    setApiKey('');
    setClearApiKey(false);
  }

  useEffect(() => {
    void reload().catch((error: unknown) => setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) }));
  }, []);

  return (
    <Screen title="إعدادات المساعد" subtitle="التفعيل والحدود للمنشأة. مفتاح النموذج يُحفظ مشفراً في المنصة ولا يُعرض هنا." crumbs={['الإعدادات', 'المساعد']}>
      <Notice notice={notice} />
      {settings?.platformSuspended ? <p className="alert warn">أوقف مشغّل المنصة المساعد لهذه المنشأة.</p> : null}
      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setNotice(undefined);
          void apiPut('/ai/settings', {
            enabled,
            provider: provider || null,
            model: model || null,
            monthlyTokenLimit: tokenLimit === '' ? null : Number(tokenLimit),
            monthlyCostLimit: costLimit || null,
            ...(apiKey ? { apiKey } : {}),
            ...(clearApiKey ? { clearApiKey: true } : {}),
          })
            .then(() => reload())
            .then(() => setNotice({ kind: 'ok', text: 'حُفظت إعدادات المساعد.' }))
            .catch((error: unknown) => setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) }))
            .finally(() => setBusy(false));
        }}
      >
        <label className="field">
          <span>التفعيل</span>
          <select className="input" value={enabled ? 'on' : 'off'} onChange={(event) => setEnabled(event.target.value === 'on')}>
            <option value="on">مفعّل</option>
            <option value="off">متوقف</option>
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>المزود</span>
            <select className="input" value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="">وراثة إعداد المنصة</option>
              <option value="local">محلي — مجاميع فقط</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label className="field">
            <span>النموذج</span>
            <input className="input" dir="ltr" value={model} onChange={(event) => setModel(event.target.value)} placeholder={settings?.effectiveModel} />
          </label>
          <label className="field">
            <span>حد التوكنز الشهري</span>
            <input className="input" dir="ltr" inputMode="numeric" value={tokenLimit} onChange={(event) => setTokenLimit(event.target.value)} />
          </label>
          <label className="field">
            <span>حد التكلفة الشهري</span>
            <input className="input" dir="ltr" value={costLimit} onChange={(event) => setCostLimit(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>مفتاح المزوّد (اختياري)</span>
          <input
            className="input"
            dir="ltr"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={settings?.hasApiKey ? 'محفوظ — اتركه فارغاً للإبقاء عليه' : 'sk-…'}
          />
        </label>
        <label className="field">
          <span>
            <input type="checkbox" checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} /> حذف المفتاح المحفوظ
          </span>
        </label>
        <p className="muted">
          {settings?.hasApiKey
            ? 'هذه المنشأة تملك مفتاحها الخاص، وهو المستعمل الآن بدل مفتاح المنصة.'
            : settings?.hasPlatformKey
              ? 'المساعد يعمل بمفتاح المنصة. ضع مفتاحاً هنا لتستعمل هذه المنشأة مفتاحها الخاص.'
              : 'لا مفتاح لهذه المنشأة ولا للمنصة — الأجوبة محلية من مجاميعك حتى يُضبط مفتاح.'}
        </p>
        <p className="muted">
          الاستهلاك هذا الشهر ({settings?.usage.period ?? '—'}): {settings?.usage.tokens ?? 0} توكن · {settings?.usage.spent ?? '0'} تكلفة.
          المزود الفعّال: {settings?.effectiveProvider ?? 'local'}.{' '}
          {settings?.hasApiKey || settings?.hasPlatformKey
            ? 'يوجد مفتاح يعمل به المزوّد.'
            : 'لا مفتاح بعد — الإجابة محلية من مجاميعك.'}
        </p>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </form>
    </Screen>
  );
}

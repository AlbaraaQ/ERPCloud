'use client';

import { useEffect, useState } from 'react';

import { Notice } from '../../../components/data-view';
import { ErrorBox, Forbidden, Loading, Screen } from '../../../components/screen';
import { ApiError, apiData, apiPut } from '../../../lib/api';
import { useQuery } from '../../../lib/use-query';

type Settings = Record<string, unknown>;

/**
 * ⚙️ إعدادات الكاشير — نافذة `frmCasherSetting.xaml` (٣٠٧ أسطر) بترويساتها الحرفية:
 * «الباركود أوتوماتيك» (س239) · «تاتش سكرين» (س252) · «عرض المجموعات والأصناف» (س265) ·
 * «قيمة التوصيل» (س271) · «التأمين» (س279) · «الوحدة» (س287) — وزرّ «حفظ» (س300) هو
 * `PUT /settings/pos.*` نفسها. والشاشة تقرأ ما هو مكتوبٌ بالفعل وتعرضه بجانب حقوله، فلا
 * تظهر خانةٌ فارغة وكأنّ الإعداد غير قائم.
 */
const CASHER_FIELDS: Array<{ key: string; label: string; kind: 'boolean' | 'number' | 'text' }> = [
  // النصوص حرفيةٌ من `frmCasherSetting.xaml` — بالأيقونة واللفظ الذي يراه المشرف هناك.
  { key: 'pos.barcodeAuto', label: '📷 الباركود أوتوماتيك', kind: 'boolean' },
  { key: 'pos.touchScreen', label: '👆 الشاشة تدعم التاتش سكرين', kind: 'boolean' },
  { key: 'pos.showGroups', label: '📦 عرض المجموعات والأصناف', kind: 'boolean' },
  { key: 'pos.defaultDeliveryFee', label: '🚗 قيمة التوصيل الافتراضية', kind: 'number' },
  { key: 'pos.defaultInsurance', label: '🛡️ قيمة التأمين الافتراضية', kind: 'number' },
  { key: 'pos.defaultUnitId', label: '📏 الوحدة الافتراضية', kind: 'text' },
];

export default function GeneralSettingsPage() {
  const settings = useQuery<Settings>(() => apiData<Settings>('/settings'), []);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'danger'; text: string } | undefined>();

  useEffect(() => {
    if (settings.status !== 'success') return;
    const next: Record<string, string> = {};
    for (const field of CASHER_FIELDS) {
      const value = settings.data?.[field.key];
      next[field.key] = value === undefined || value === null ? '' : String(value);
    }
    setDraft(next);
  }, [settings.status, settings.data]);

  async function saveCasher() {
    setBusy(true);
    setNotice(undefined);
    try {
      for (const field of CASHER_FIELDS) {
        const raw = draft[field.key] ?? '';
        const value =
          field.kind === 'boolean' ? raw === 'true' : field.kind === 'number' ? Number(raw || 0) : raw;
        await apiPut(`/settings/${field.key}`, { value });
      }
      setNotice({ kind: 'ok', text: 'تم حفظ إعدادات الكاشير.' });
      settings.reload();
    } catch (error) {
      setNotice({ kind: 'danger', text: error instanceof ApiError ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  const entries = Object.entries(settings.data ?? {});

  return (
    <Screen
      title="إعدادات عامة"
      subtitle="الإعدادات المطبقة على هذه المنشأة (العملة، الضريبة، سياسة الترقيم، …)."
      crumbs={['الإعدادات', 'إعدادات عامة']}
      actions={
        <button className="btn" type="button" onClick={settings.reload}>
          تحديث
        </button>
      }
    >
      {settings.status === 'loading' && <Loading />}
      {settings.status === 'forbidden' && <Forbidden />}
      {settings.status === 'error' && <ErrorBox message={settings.error} onRetry={settings.reload} />}
      {settings.status === 'success' && (
        <div className="card">
          <div className="card-head">⚙️ إعدادات الكاشير</div>
          <div className="form-grid">
            {CASHER_FIELDS.map((field) => (
              <label className="field" key={field.key}>
                <span>{field.label}</span>
                {field.kind === 'boolean' ? (
                  <select
                    className="input"
                    value={draft[field.key] ?? ''}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  >
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                ) : (
                  <input
                    className="input"
                    dir={field.kind === 'number' ? 'ltr' : undefined}
                    inputMode={field.kind === 'number' ? 'decimal' : undefined}
                    value={draft[field.key] ?? ''}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                )}
                <span className="muted small" dir="ltr">
                  {field.key}
                </span>
              </label>
            ))}
          </div>
          <Notice notice={notice} />
          <button className="btn primary" type="button" disabled={busy} onClick={saveCasher}>
            حفظ
          </button>
        </div>
      )}

      {settings.status === 'success' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المفتاح</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key}>
                  <td dir="ltr">{key}</td>
                  <td dir="ltr" className="small">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}

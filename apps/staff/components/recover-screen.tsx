'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { ApiError, apiPost } from '../lib/api';
import { useLang } from '../lib/i18n';

/**
 * Password recovery — the missing half of the auth surface.
 *
 * Two steps in one component because they share everything that matters: the tenant
 * code the user typed, and the fact that neither is authenticated. Step one asks for a
 * link; step two consumes the token that arrived in the `?reset=` query parameter.
 *
 * The wording after step one is deliberately conditional — "if that address is
 * registered". The server answers `204` either way and says nothing about whether the
 * account exists; if this screen then said "the link has been sent" it would hand back
 * the exact information the endpoint is built to withhold.
 */
export function RecoverScreen() {
  const { t } = useLang();
  const params = useSearchParams();
  const token = params.get('reset');

  // Which of the two steps this screen shows is **derived**, not state: it is decided
  // entirely by whether the e-mailed link carried a token, and nothing the user does
  // here moves between them. Leaving recovery means going back to the sign-in screen,
  // which is a navigation, not a step change — so there is nothing to set.
  const step: 'request' | 'reset' = token ? 'reset' : 'request';
  const [tenantCode, setTenantCode] = useState(params.get('tenant') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  async function requestLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      // 204 whether or not the address exists — see the note above.
      await apiPost<void>('/auth/forgot-password', {
        tenantCode: tenantCode.trim(),
        email: email.trim(),
      });
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError(t('recover.error.rateLimited'));
      } else if (caught instanceof ApiError && caught.message) {
        setError(caught.message);
      } else {
        setError(t('login.error.unreachable'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function applyReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await apiPost<void>('/auth/reset-password', {
        tenantCode: tenantCode.trim(),
        token: token ?? '',
        new: password,
      });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        // The policy rejection and the dead-link rejection are both 400 here. They are
        // separated by the `field` the API attaches, so the user is told which one it is.
        setError(
          caught.message && caught.message.length > 0 && caught.message !== 'Validation failed'
            ? caught.message
            : t('recover.reset.error.weak'),
        );
      } else if (caught instanceof ApiError && caught.message) {
        setError(caught.message);
      } else {
        setError(t('login.error.unreachable'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span className="logo big">ERP</span>
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')}</p>
      </div>

      <form className="auth-card" onSubmit={step === 'reset' ? applyReset : requestLink}>
        <h2>{step === 'reset' ? t('recover.reset.title') : t('recover.title')}</h2>
        <p className="muted">
          {step === 'reset' ? t('recover.reset.subtitle') : t('recover.subtitle')}
        </p>

        {done ? (
          <>
            <p className="alert ok" role="status">
              {t('recover.reset.done')}
            </p>
            <a className="btn primary block" href="/">
              {t('recover.back')}
            </a>
          </>
        ) : sent ? (
          <>
            <p className="alert ok" role="status">
              {t('recover.sent')}
            </p>
            <a className="btn block" href="/">
              {t('recover.back')}
            </a>
          </>
        ) : (
          <>
            <label className="field">
              <span>{t('login.tenantCode')}</span>
              <input
                className="input"
                value={tenantCode}
                onChange={(event) => setTenantCode(event.target.value)}
                placeholder="demo"
                autoComplete="organization"
                required
                dir="ltr"
              />
            </label>

            {step === 'reset' ? (
              <label className="field">
                <span>{t('login.password')}</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  dir="ltr"
                />
              </label>
            ) : (
              <label className="field">
                <span>{t('login.email')}</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  dir="ltr"
                />
              </label>
            )}

            {error && (
              <p className="alert danger" role="alert">
                {error}
              </p>
            )}

            <button className="btn primary block" type="submit" disabled={busy}>
              {busy
                ? step === 'reset'
                  ? t('recover.reset.busy')
                  : t('recover.busy')
                : step === 'reset'
                  ? t('recover.reset.submit')
                  : t('recover.submit')}
            </button>

            <a className="btn block" href="/">
              {t('recover.back')}
            </a>
          </>
        )}
      </form>
    </div>
  );
}

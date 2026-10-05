'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { permissionAliases as CONTRACT_PERMISSION_ALIASES } from '@erp/contracts';

import {
  ApiError,
  consumeSupportFragment,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  readSession,
  writeSession,
  type MePayload,
} from './api';

export type SessionState = {
  status: 'loading' | 'anonymous' | 'authenticated';
  me?: MePayload;
  error?: string;
};

type SessionContextValue = SessionState & {
  can: (permission?: string) => boolean;
  isPlatformAdmin: boolean;
  signIn: (email: string, password: string, tenantCode: string, mfaCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Canonical ↔ legacy permission alias pairs.
 *
 * Imported from `@erp/contracts` rather than re-declared here. This table was
 * previously hand-mirrored, and the copy had drifted: 9 of its 11 pairs named
 * canonical codes that do not exist (`tenant.profile.view`,
 * `tenant.billing.view`, `tenant.users.view`, `tenant.roles.view`, …), while
 * 5 real codes were missing entirely. That drift is what made `can()` answer
 * "no" for codes the API does enforce, so screens gated on them silently
 * disappeared from the sidebar.
 *
 * `resolveAlias` below is unchanged; only the source of truth for the pairs
 * moved. `permissionAliases` is `as const`, hence the widening copy.
 */
const PERMISSION_ALIASES: Record<string, string> = { ...CONTRACT_PERMISSION_ALIASES };

function resolveAlias(permission: string): string | undefined {
  const direct = PERMISSION_ALIASES[permission];
  if (direct) return direct;
  for (const [legacy, canonical] of Object.entries(PERMISSION_ALIASES)) {
    if (canonical === permission) return legacy;
  }
  return undefined;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const load = useCallback(async () => {
    // P-C8: رمز الدخول المؤقّت يصل في جزء العنوان من شاشة اللوحة — يُلتقط قبل أول نداء.
    consumeSupportFragment();
    if (!readSession()) {
      setState({ status: 'anonymous' });
      return;
    }
    try {
      const me = await fetchMe();
      setState({ status: 'authenticated', me });
    } catch (error) {
      if (error instanceof ApiError && error.isAuthError) {
        writeSession(undefined);
        setState({ status: 'anonymous' });
        return;
      }
      // The API is unreachable or misconfigured — say so rather than bouncing the user
      // back to a login form that will also fail.
      setState({
        status: 'anonymous',
        error: error instanceof Error ? error.message : 'تعذر الاتصال بالخادم',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = useCallback(
    async (email: string, password: string, tenantCode: string, mfaCode?: string) => {
      await apiLogin(email, password, tenantCode, mfaCode);
      const me = await fetchMe();
      setState({ status: 'authenticated', me });
    },
    [],
  );

  const signOut = useCallback(async () => {
    await apiLogout();
    setState({ status: 'anonymous' });
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const permissions = state.me?.permissions ?? [];
    return {
      ...state,
      isPlatformAdmin: state.me?.user.isPlatformAdmin === true,
      can: (permission?: string) => {
        if (!permission) return true;
        if (permissions.includes('*') || permissions.includes(permission)) return true;
        const alias = resolveAlias(permission);
        return alias !== undefined && permissions.includes(alias);
      },
      signIn,
      signOut,
      reload: load,
    };
  }, [state, signIn, signOut, load]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}

'use client';

import type { ReactNode } from 'react';

import type { QueryState } from '../lib/use-query';

import { Empty, ErrorBox, Forbidden, Loading } from './screen';


/**
 * Renders the four states of a query in one place.
 *
 * Every module screen needs the same ladder — loading → forbidden → error → empty →
 * data — and repeating it per page is where inconsistencies (and silently swallowed
 * 403s) creep in.
 */
export function QueryView<T>({
  query,
  empty,
  emptyDetail,
  isEmpty,
  children,
}: {
  query: QueryState<T>;
  empty?: string;
  emptyDetail?: string;
  /** Defaults to "an array with no elements". */
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.status === 'loading') return <Loading />;
  if (query.status === 'forbidden') return <Forbidden />;
  if (query.status === 'error') return <ErrorBox message={query.error} onRetry={query.reload} />;

  const data = query.data as T;
  const blank = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0;
  if (blank) return <Empty title={empty ?? 'لا توجد بيانات'} detail={emptyDetail} />;
  return <>{children(data)}</>;
}


/** Inline feedback after a mutation. */
export function Notice({ notice }: { notice?: { kind: 'ok' | 'danger' | 'info' | 'warn'; text: string } }) {
  if (!notice) return null;
  return <p className={`alert ${notice.kind}`}>{notice.text}</p>;
}

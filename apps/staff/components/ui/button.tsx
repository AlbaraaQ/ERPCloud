'use client';

import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * زر واحد لكل الحالات — 5 variants × 3 sizes, with loading state and an icon slot.
 * The button is a flex row so RTL flips icon/label order automatically.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white border-brand-600 shadow-2 hover:bg-brand-700 hover:border-brand-700',
  secondary:
    'bg-white text-slate-700 border-slate-300 shadow-1 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400',
  success: 'bg-emerald-600 text-white border-emerald-600 shadow-2 hover:bg-emerald-700',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-[13.5px] rounded-[10px] gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-xl gap-2',
};

export function Spinner({ size = 15 }: { size?: number }) {
  return <LoaderCircle size={size} className="animate-spin" aria-hidden />;
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon rendered before the label (flips in RTL automatically). */
  icon?: ReactNode;
  block?: boolean;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap border transition-all duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:opacity-55 disabled:cursor-not-allowed disabled:active:translate-y-0 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

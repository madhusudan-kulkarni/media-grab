import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_BASE =
  'inline-flex select-none items-center justify-center gap-1.5 rounded-[10px] font-semibold ' +
  'transition-[transform,background-color,border-color,color,opacity] duration-150 ease-[var(--ease-out)] ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[12px]',
  md: 'h-10 px-3.5 text-[13px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft',
        'transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)]',
        'hover:bg-surface-2 hover:text-ink active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-[42px] shrink-0 rounded-full',
        'transition-colors duration-150 ease-[var(--ease-out)]',
        checked ? 'bg-ink' : 'bg-line'
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-[3px] h-[18px] w-[18px] rounded-full bg-surface shadow-sm ring-1 ring-ink/20',
          'transition-transform duration-150 ease-[var(--ease-out)]',
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  );
}

export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <span className={cn('relative inline-flex items-center', wrapperClassName)}>
      <select
        className={cn(
          'h-9 appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-[12.5px] font-medium',
          'text-ink transition-colors duration-150 hover:border-ink-soft/40',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-ink-soft"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4 px-4 pt-3.5 pb-2">
        <div>
          <h2 className="m-0 text-[13.5px] font-semibold tracking-[-0.015em]">{title}</h2>
          {hint && <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-soft">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="px-4 pb-1.5">{children}</div>
    </section>
  );
}

export function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[46px] items-center justify-between gap-4 border-b border-line/70 py-1.5 last:border-0">
      <div className="min-w-0">
        <p className="m-0 text-[12.5px] font-medium leading-tight">{title}</p>
        {hint && <p className="m-0 mt-0.5 text-[11px] leading-snug text-ink-soft">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[9px] bg-ink text-surface"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 128 128" width={size * 0.66} height={size * 0.66} fill="none">
        <path d="M47 33 86 55 47 77Z" fill="currentColor" />
        <path d="M31 92h66" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      </svg>
    </span>
  );
}

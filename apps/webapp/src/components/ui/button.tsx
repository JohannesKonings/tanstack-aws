import * as React from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * TanStack DS Button — adapted from tanstack.com `src/components/ds/ui/index.tsx`.
 * Re-sync: diff against upstream Button section and update this registry item.
 */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'icon'
  | 'link'
  | 'subtle-link'
  | 'gradient';
type ButtonColor =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'purple'
  | 'gray'
  | 'emerald'
  | 'cyan'
  | 'yellow';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';
type ButtonRounded = 'none' | 'md' | 'lg' | 'xl' | 'full';

type ButtonOwnProps<TElement extends React.ElementType = 'button'> = {
  as?: TElement;
  children: React.ReactNode;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  className?: string;
};

type ButtonProps<TElement extends React.ElementType = 'button'> = ButtonOwnProps<TElement> &
  Omit<React.ComponentPropsWithRef<TElement>, keyof ButtonOwnProps<TElement>>;

type ButtonComponent = <TElement extends React.ElementType = 'button'>(
  props: ButtonProps<TElement>,
) => React.ReactNode;

type ButtonInnerProps = ButtonOwnProps & Record<string, unknown>;

const primaryColorStyles: Record<ButtonColor, string> = {
  neutral:
    'bg-background-inverse text-text-inverse border-background-inverse hover:bg-background-inverse/90 max-[899px]:bg-background-inverse/90',
  blue: 'bg-ds-blue-500 text-white border-ds-blue-500 hover:bg-ds-blue-400 max-[899px]:bg-ds-blue-400',
  green:
    'bg-ds-green-400 text-white border-ds-green-400 hover:bg-ds-green-300 max-[899px]:bg-ds-green-300',
  red: 'bg-ds-terracotta-400 text-white border-ds-terracotta-400 hover:bg-ds-terracotta-300 max-[899px]:bg-ds-terracotta-300',
  orange:
    'bg-ds-terracotta-300 text-white border-ds-terracotta-300 hover:bg-ds-terracotta-200 max-[899px]:bg-ds-terracotta-200',
  purple:
    'bg-ds-purple-400 text-white border-ds-purple-400 hover:bg-ds-purple-300 max-[899px]:bg-ds-purple-300',
  gray: 'bg-ds-neutral-400 text-white border-ds-neutral-400 hover:bg-ds-neutral-300 max-[899px]:bg-ds-neutral-300',
  emerald:
    'bg-ds-green-400 text-white border-ds-green-400 hover:bg-ds-green-300 max-[899px]:bg-ds-green-300',
  cyan: 'bg-lib-start text-white border-lib-start hover:bg-lib-start/90 max-[899px]:bg-lib-start/90',
  yellow:
    'bg-ds-amber-300 text-ds-neutral-500 border-ds-amber-300 hover:bg-ds-amber-200 max-[899px]:bg-ds-amber-200',
};

const iconColorStyles: Record<ButtonColor, string> = {
  neutral: 'text-text-primary hover:bg-surface-state-hover max-[899px]:bg-surface-state-hover',
  blue: 'text-ds-blue-500 hover:bg-ds-blue-500/10 max-[899px]:bg-ds-blue-500/10',
  green: 'text-ds-green-400 hover:bg-ds-green-400/10 max-[899px]:bg-ds-green-400/10',
  red: 'text-ds-terracotta-400 hover:bg-ds-terracotta-400/10 max-[899px]:bg-ds-terracotta-400/10',
  orange:
    'text-ds-terracotta-300 hover:bg-ds-terracotta-300/10 max-[899px]:bg-ds-terracotta-300/10',
  purple: 'text-ds-purple-400 hover:bg-ds-purple-400/10 max-[899px]:bg-ds-purple-400/10',
  gray: 'text-text-muted hover:bg-surface-state-hover max-[899px]:bg-surface-state-hover max-[899px]:text-text-primary',
  emerald: 'text-ds-green-400 hover:bg-ds-green-400/10 max-[899px]:bg-ds-green-400/10',
  cyan: 'text-lib-start hover:bg-lib-start/10 max-[899px]:bg-lib-start/10',
  yellow: 'text-ds-amber-400 hover:bg-ds-amber-400/10 max-[899px]:bg-ds-amber-400/10',
};

const linkColorStyles: Record<ButtonColor, string> = {
  neutral: 'text-text-primary hover:text-text-primary/70 max-[899px]:text-text-primary/70',
  blue: 'text-ds-blue-500 hover:text-ds-blue-400 max-[899px]:text-ds-blue-400',
  green: 'text-ds-green-400 hover:text-ds-green-300 max-[899px]:text-ds-green-300',
  red: 'text-ds-terracotta-400 hover:text-ds-terracotta-300 max-[899px]:text-ds-terracotta-300',
  orange: 'text-ds-terracotta-300 hover:text-ds-terracotta-200 max-[899px]:text-ds-terracotta-200',
  purple: 'text-ds-purple-400 hover:text-ds-purple-300 max-[899px]:text-ds-purple-300',
  gray: 'text-text-secondary hover:text-text-primary max-[899px]:text-text-primary',
  emerald: 'text-ds-green-400 hover:text-ds-green-300 max-[899px]:text-ds-green-300',
  cyan: 'text-lib-start hover:text-lib-start/80 max-[899px]:text-lib-start/80',
  yellow: 'text-ds-amber-400 hover:text-ds-amber-300 max-[899px]:text-ds-amber-300',
};

const gradientColorStyles: Record<ButtonColor, string> = {
  neutral:
    '[--btn-grad-accent:var(--color-category-tooling-accent)] [--btn-grad-bright:var(--color-category-tooling-bright)] [--btn-grad-tint:var(--color-category-tooling-tint)] [--btn-grad-ink:var(--color-category-tooling-ink)] [--btn-grad-glow:var(--color-category-tooling-glow)]',
  blue: '[--btn-grad-accent:var(--color-category-ui-accent)] [--btn-grad-bright:var(--color-category-ui-bright)] [--btn-grad-tint:var(--color-category-ui-tint)] [--btn-grad-ink:var(--color-category-ui-ink)] [--btn-grad-glow:var(--color-category-ui-glow)]',
  green:
    '[--btn-grad-accent:var(--color-category-framework-accent)] [--btn-grad-bright:var(--color-category-framework-bright)] [--btn-grad-tint:var(--color-category-framework-tint)] [--btn-grad-ink:var(--color-category-framework-ink)] [--btn-grad-glow:var(--color-category-framework-glow)]',
  red: '[--btn-grad-accent:var(--color-category-data-accent)] [--btn-grad-bright:var(--color-category-data-bright)] [--btn-grad-tint:var(--color-category-data-tint)] [--btn-grad-ink:var(--color-category-data-ink)] [--btn-grad-glow:var(--color-category-data-glow)]',
  orange:
    '[--btn-grad-accent:var(--color-category-performance-accent)] [--btn-grad-bright:var(--color-category-performance-bright)] [--btn-grad-tint:var(--color-category-performance-tint)] [--btn-grad-ink:var(--color-category-performance-ink)] [--btn-grad-glow:var(--color-category-performance-glow)]',
  purple:
    '[--btn-grad-accent:var(--color-ds-purple-400)] [--btn-grad-bright:var(--color-ds-purple-300)] [--btn-grad-tint:var(--color-ds-purple-100)] [--btn-grad-ink:#ffffff] [--btn-grad-glow:175_87_188]',
  gray: '[--btn-grad-accent:var(--color-category-tooling-accent)] [--btn-grad-bright:var(--color-category-tooling-bright)] [--btn-grad-tint:var(--color-category-tooling-tint)] [--btn-grad-ink:var(--color-category-tooling-ink)] [--btn-grad-glow:var(--color-category-tooling-glow)]',
  emerald:
    '[--btn-grad-accent:var(--color-category-framework-accent)] [--btn-grad-bright:var(--color-category-framework-bright)] [--btn-grad-tint:var(--color-category-framework-tint)] [--btn-grad-ink:var(--color-category-framework-ink)] [--btn-grad-glow:var(--color-category-framework-glow)]',
  cyan: '[--btn-grad-accent:var(--color-category-ui-accent)] [--btn-grad-bright:var(--color-category-ui-bright)] [--btn-grad-tint:var(--color-category-ui-tint)] [--btn-grad-ink:var(--color-category-ui-ink)] [--btn-grad-glow:var(--color-category-ui-glow)]',
  yellow:
    '[--btn-grad-accent:var(--color-category-performance-accent)] [--btn-grad-bright:var(--color-category-performance-bright)] [--btn-grad-tint:var(--color-category-performance-tint)] [--btn-grad-ink:var(--color-category-performance-ink)] [--btn-grad-glow:var(--color-category-performance-glow)]',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border font-medium shadow-[0_1px_2px_0_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:-translate-y-px hover:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.28),inset_0_1px_0_0_rgba(255,255,255,0.25)] max-[899px]:-translate-y-px max-[899px]:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.28),inset_0_1px_0_0_rgba(255,255,255,0.25)] active:translate-y-0 active:shadow-[0_1px_2px_0_rgba(0,0,0,0.12)]',
  secondary:
    'bg-action-secondary text-text-primary hover:bg-action-secondary-hover max-[899px]:bg-action-secondary-hover border-transparent font-medium shadow-sm hover:-translate-y-px hover:shadow-md max-[899px]:-translate-y-px max-[899px]:shadow-md active:translate-y-0',
  ghost:
    'border border-border-default text-text-primary hover:bg-background-subtle hover:border-border-strong max-[899px]:bg-background-subtle max-[899px]:border-border-strong font-medium hover:shadow-sm max-[899px]:shadow-sm',
  icon: 'border-transparent active:scale-90',
  link: 'border-transparent font-medium underline-offset-2 hover:underline max-[899px]:underline',
  'subtle-link':
    'border-transparent font-ds-mono uppercase tracking-wider no-underline hover:no-underline [&>svg:last-child]:size-3.5 [&>svg:last-child]:transition-transform hover:[&>svg:last-child]:translate-x-0.5 max-[899px]:[&>svg:last-child]:translate-x-0.5 motion-reduce:[&>svg:last-child]:transition-none',
  gradient:
    'border-transparent font-medium text-[var(--btn-grad-ink)] [background-image:linear-gradient(105deg,var(--btn-grad-accent),var(--btn-grad-bright))] shadow-[inset_-5px_-5px_7px_-5px_var(--btn-grad-tint),0_12px_35px_-6px_rgb(var(--btn-grad-glow)/0.35)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[inset_-5px_-5px_7px_-5px_var(--btn-grad-tint),0_18px_45px_-6px_rgb(var(--btn-grad-glow)/0.5)] max-[899px]:-translate-y-0.5 max-[899px]:shadow-[inset_-5px_-5px_7px_-5px_var(--btn-grad-tint),0_18px_45px_-6px_rgb(var(--btn-grad-glow)/0.5)] active:translate-y-0 focus-visible:ring-[var(--btn-grad-bright)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1.5 text-xs',
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  'icon-sm': 'p-1.5',
  'icon-md': 'p-2',
};

const roundedStyles: Record<ButtonRounded, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-background-default';

function getDefaultSize(variant: ButtonVariant): ButtonSize {
  if (variant === 'icon') return 'icon-md';
  if (variant === 'gradient') return 'lg';
  return 'md';
}

function getDefaultRounded(size: ButtonSize): ButtonRounded {
  if (size === 'xs' || size === 'sm') return 'md';
  return 'lg';
}

// forwardRef cannot express polymorphic `as` prop typing; cast restores the generic call signature.
export const Button: ButtonComponent = React.forwardRef<HTMLElement, ButtonInnerProps>(
  function Button(props, ref) {
    const {
      as,
      children,
      variant = 'primary',
      color = 'neutral',
      size,
      rounded,
      className,
      ...rest
      // ButtonInnerProps includes Record<string, unknown> for rest spreading; narrow owned props before use.
    } = props as ButtonOwnProps & Record<string, unknown>;
    const Component = as || 'button';
    const resolvedSize = size ?? getDefaultSize(variant);
    const resolvedRounded =
      rounded ?? (variant === 'gradient' ? 'xl' : getDefaultRounded(resolvedSize));
    const colorStyles =
      variant === 'primary'
        ? primaryColorStyles[color]
        : variant === 'icon'
          ? iconColorStyles[color]
          : variant === 'link' || variant === 'subtle-link'
            ? linkColorStyles[color]
            : variant === 'gradient'
              ? gradientColorStyles[color]
              : '';

    return React.createElement(
      Component,
      {
        ref,
        className: twMerge(
          baseStyles,
          variantStyles[variant],
          sizeStyles[resolvedSize],
          roundedStyles[resolvedRounded],
          colorStyles,
          className,
        ),
        ...rest,
      },
      children,
    );
  },
) as unknown as ButtonComponent;

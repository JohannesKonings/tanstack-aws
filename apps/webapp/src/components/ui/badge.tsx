import * as React from 'react';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Badge — adapted from tanstack.com/src/components/ds/ui/index.tsx.
 */

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'teal'
  | 'orange';
type BadgeRounded = 'md' | 'full';

const badgeVariantStyles: Record<BadgeVariant, string> = {
  default: 'bg-background-subtle text-text-secondary',
  success: 'bg-status-success-bg text-text-success',
  warning: 'bg-status-warning-bg text-text-warning',
  error: 'bg-status-error-bg text-text-error',
  info: 'bg-status-info-bg text-text-info',
  purple: 'bg-accent-creative/15 text-accent-creative',
  teal: 'bg-lib-start/15 text-lib-start',
  orange: 'bg-accent-warm/20 text-accent-warm',
};

export function Badge({
  children,
  variant = 'default',
  rounded = 'full',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  rounded?: BadgeRounded;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 text-xs font-medium',
        rounded === 'full' ? 'rounded-full' : 'rounded-md',
        badgeVariantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

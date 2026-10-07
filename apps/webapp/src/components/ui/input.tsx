import * as React from 'react';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Input — adapted from tanstack.com/src/components/ds/ui/index.tsx (FormInput).
 * Re-sync: diff against upstream FormInput section and update this registry item.
 */

const inputFocusClass = 'focus:border-border-strong focus:outline-none';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border-default bg-background-surface px-3 py-2 text-text-primary placeholder-text-muted transition',
        inputFocusClass,
        className,
      )}
      {...props}
    />
  );
});

import * as React from 'react';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Card — adapted from tanstack.com/src/components/ds/ui/index.tsx.
 */

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg corner-squircle border border-border-default bg-background-surface shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

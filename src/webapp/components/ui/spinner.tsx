import { CircleNotchIcon } from '@phosphor-icons/react';
import { cn } from '#src/webapp/lib/utils';

/**
 * TanStack DS Spinner — adapted from tanstack.com/src/components/ds/ui/index.tsx.
 */

export function Spinner({ className }: { className?: string }) {
  return (
    <CircleNotchIcon
      className={cn('size-6 animate-spin text-text-primary', className)}
      aria-label="Loading"
    />
  );
}

export { PalmSpinner } from './palm-spinner';
export { PixelSpinner } from './pixel-spinner';

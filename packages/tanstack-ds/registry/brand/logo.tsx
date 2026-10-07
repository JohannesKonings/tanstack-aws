import type { ImgHTMLAttributes } from 'react';
import { cn } from '#src/webapp/lib/utils';

/**
 * TanStack DS brand logo components — adapted from tanstack.com/src/components/Logo.tsx
 * and public/assets/images/brand assets. Uses static SVG assets instead of inline SVG + context menu.
 */

type BrandLogoProps = ImgHTMLAttributes<HTMLImageElement>;

export function TanStackEmblem({ className, ...props }: BrandLogoProps) {
  return (
    <img
      src="/assets/images/brand/tanstack-emblem-black.svg"
      alt="TanStack"
      className={cn('dark:invert', className)}
      {...props}
    />
  );
}

export function TanStackStackedLogo({ className, ...props }: BrandLogoProps) {
  return (
    <img
      src="/assets/images/brand/tanstack-stacked-black.svg"
      alt="TanStack"
      className={cn('dark:invert', className)}
      {...props}
    />
  );
}

export function TanStackLandscapeLogo({ className, ...props }: BrandLogoProps) {
  return (
    <img
      src="/assets/images/brand/tanstack-landscape-black.svg"
      alt="TanStack"
      className={cn('dark:invert', className)}
      {...props}
    />
  );
}

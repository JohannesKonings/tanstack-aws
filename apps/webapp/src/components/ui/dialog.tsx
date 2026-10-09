import { CircleNotchIcon, XIcon } from '@phosphor-icons/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Dialog — adapted from tanstack.com/src/components/ds/ui/Dialog.tsx.
 * Re-sync: diff against upstream Dialog and update this registry item.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeStyles: Record<DialogSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

type DialogContentProps = {
  children: React.ReactNode;
  size?: DialogSize;
  className?: string;
  onInteractOutside?: DialogPrimitive.DialogContentProps['onInteractOutside'];
};

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent({ children, size = 'sm', className, onInteractOutside }, ref) {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-ds-dialog-scrim=""
          className="fixed inset-0 z-[var(--z-scrim)] bg-scrim"
        />
        <DialogPrimitive.Content
          ref={ref}
          data-ds-dialog-panel=""
          onInteractOutside={onInteractOutside}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'z-[var(--z-overlay)] outline-none',
            'w-[calc(100vw-2rem)]',
            'max-h-[calc(100dvh-2rem)] flex flex-col',
            'rounded-xl corner-squircle border border-border-default bg-background-elevated text-text-primary shadow-2xl',
            sizeStyles[size],
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);

type DialogHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  media?: React.ReactNode;
  tint?: string;
  showClose?: boolean;
  className?: string;
};

export function DialogHeader({
  title,
  description,
  actions,
  media,
  tint,
  showClose = true,
  className,
}: DialogHeaderProps) {
  const tinted = media != null && tint != null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between gap-4 px-6 pt-6',
        description ? 'pb-2' : 'pb-4',
        tinted && 'items-center border-b border-border-default py-4',
        className,
      )}
      style={
        tint
          ? {
              backgroundColor: `color-mix(in srgb, ${tint} 8%, transparent)`,
            }
          : undefined
      }
    >
      {media ? (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg corner-squircle"
          style={tint ? { backgroundColor: tint } : undefined}
          aria-hidden="true"
        >
          {media}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <DialogPrimitive.Title className="text-lg font-semibold text-text-primary">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description
          className={description ? 'mt-1 text-sm text-text-muted' : 'sr-only'}
        >
          {description ?? 'Dialog'}
        </DialogPrimitive.Description>
      </div>

      <div className="flex shrink-0 items-center gap-1 self-start">
        {actions}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="rounded-full corner-squircle p-1 text-icon-muted transition-colors hover:bg-surface-state-hover hover:text-icon-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </div>
    </div>
  );
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6', className)}>{children}</div>;
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex shrink-0 items-center justify-end gap-3 px-6 pb-6 pt-6', className)}>
      {children}
    </div>
  );
}

export type DialogStatusTone = 'neutral' | 'success' | 'error' | 'loading';

const statusToneStyles: Record<
  Exclude<DialogStatusTone, 'loading'>,
  { ring: string; icon: string }
> = {
  neutral: { ring: 'bg-background-subtle', icon: 'text-icon-default' },
  success: { ring: 'bg-status-success-bg', icon: 'text-status-success' },
  error: { ring: 'bg-status-error-bg', icon: 'text-status-error' },
};

export function DialogStatus({
  tone = 'neutral',
  icon,
  title,
  description,
  actions,
  children,
  className,
}: {
  tone?: DialogStatusTone;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center py-4 text-center', className)}
      role={tone === 'error' ? 'alert' : undefined}
      aria-live={tone === 'loading' ? 'polite' : undefined}
    >
      {tone === 'loading' ? (
        <CircleNotchIcon className="size-8 animate-spin text-icon-muted" aria-hidden="true" />
      ) : icon ? (
        <div
          className={cn(
            'mb-4 flex size-16 items-center justify-center rounded-full',
            statusToneStyles[tone].ring,
          )}
          aria-hidden="true"
        >
          <span className={cn('[&>svg]:size-8', statusToneStyles[tone].icon)}>{icon}</span>
        </div>
      ) : null}

      {title ? (
        <h3
          className={cn(
            'text-lg font-medium text-text-primary',
            tone === 'loading' ? 'mt-4' : 'mb-2',
          )}
        >
          {title}
        </h3>
      ) : null}

      {description ? (
        <p className={cn('text-sm text-text-muted', tone === 'loading' && !title && 'mt-4')}>
          {description}
        </p>
      ) : null}

      {children}

      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

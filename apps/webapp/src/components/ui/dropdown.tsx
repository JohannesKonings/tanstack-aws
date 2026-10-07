import { CaretDownIcon } from '@phosphor-icons/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Dropdown — adapted from tanstack.com/src/components/Dropdown.tsx.
 * Re-sync: diff against upstream Dropdown and update this registry item.
 */

type DropdownProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
};

type DropdownTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

type DropdownContentProps = {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  portal?: boolean;
  maxHeight?: number;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
};

type DropdownItemProps = {
  children: React.ReactNode;
  className?: string;
  onSelect?: () => void;
  asChild?: boolean;
};

type DropdownSeparatorProps = {
  className?: string;
};

export function Dropdown({ children, open, onOpenChange, modal = false }: DropdownProps) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      {children}
    </DropdownMenu.Root>
  );
}

export function DropdownTrigger({ children, className, asChild = true }: DropdownTriggerProps) {
  return (
    <DropdownMenu.Trigger asChild={asChild} className={className}>
      {children}
    </DropdownMenu.Trigger>
  );
}

export function DropdownContent({
  children,
  className,
  align = 'end',
  sideOffset = 6,
  portal = true,
  maxHeight,
  onFocus,
  onPointerEnter,
  onPointerLeave,
}: DropdownContentProps) {
  const content = (
    <DropdownMenu.Content
      align={align}
      sideOffset={sideOffset}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      className={cn(
        'dropdown-content z-[var(--z-above-overlay)] min-w-48 rounded-lg border border-border-default bg-background-elevated p-1.5 text-text-primary shadow-lg',
        className,
      )}
    >
      {children}
    </DropdownMenu.Content>
  );

  if (!portal) {
    return content;
  }

  return <DropdownMenu.Portal>{content}</DropdownMenu.Portal>;
}

export function DropdownItem({ children, className, onSelect, asChild }: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      asChild={asChild}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary outline-none',
        'hover:bg-surface-state-hover focus:bg-surface-state-hover',
        'transition-colors duration-150',
        className,
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

export function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return <DropdownMenu.Separator className={cn('my-1 h-px bg-border-default', className)} />;
}

const selectTriggerClass =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-border-default bg-background-surface px-3 py-2 text-left text-text-primary transition focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-40';

export function SelectDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  disabled,
  onBlur,
  clearable = false,
}: {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  clearable?: boolean;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onBlur={onBlur}
          className={cn(selectTriggerClass, className)}
        >
          <span className={selected ? undefined : 'text-text-muted'}>
            {selected?.label ?? placeholder}
          </span>
          <CaretDownIcon className="size-4 shrink-0 text-icon-muted" aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {clearable ? (
          <>
            <DropdownItem onSelect={() => onChange(undefined)}>{placeholder}</DropdownItem>
            <DropdownSeparator />
          </>
        ) : null}
        {options.map((option) => (
          <DropdownItem key={option.value} onSelect={() => onChange(option.value)}>
            {option.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

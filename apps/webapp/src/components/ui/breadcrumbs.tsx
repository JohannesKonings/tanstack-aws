import { CaretDownIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '#apps/webapp/components/ui/dropdown';
import { cn } from '#apps/webapp/lib/utils';

/**
 * TanStack DS Breadcrumbs — adapted from tanstack.com/src/components/ds/ui/index.tsx.
 */

export type BreadcrumbHeading = {
  id: string;
  text: string;
  level: number;
};

export function Breadcrumbs({
  section,
  sectionTo,
  headings,
  tocHiddenBreakpoint = 'lg',
}: {
  section: string;
  sectionTo?: string;
  headings?: BreadcrumbHeading[];
  tocHiddenBreakpoint?: 'md' | 'lg' | 'xl';
}) {
  const showTocToggle = headings && headings.length > 1;
  const hiddenClass =
    tocHiddenBreakpoint === 'md'
      ? 'md:hidden'
      : tocHiddenBreakpoint === 'xl'
        ? 'xl:hidden'
        : 'lg:hidden';

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-text-muted">
      {sectionTo ? (
        <Link
          to={sectionTo}
          className="whitespace-nowrap transition-colors hover:text-text-primary"
        >
          {section}
        </Link>
      ) : (
        <span className="whitespace-nowrap">{section}</span>
      )}
      {showTocToggle ? (
        <Dropdown>
          <DropdownTrigger>
            <button
              type="button"
              className={cn(
                hiddenClass,
                'inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-text-muted transition-colors hover:text-text-primary',
              )}
            >
              <span>On this page</span>
              <CaretDownIcon className="size-3.5" />
            </button>
          </DropdownTrigger>
          <DropdownContent align="end" sideOffset={8} className={hiddenClass}>
            {headings.map((heading) => (
              <DropdownItem key={`breadcrumb-toc-${heading.id}`} asChild>
                <Link
                  to="."
                  hash={heading.id}
                  style={{
                    paddingLeft: `${(heading.level - 2) * 0.5 + 0.5}rem`,
                  }}
                  resetScroll={false}
                  hashScrollIntoView={{ behavior: 'smooth' }}
                >
                  <span dangerouslySetInnerHTML={{ __html: heading.text }} />
                </Link>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      ) : null}
    </div>
  );
}

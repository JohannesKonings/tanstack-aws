import { type CSSProperties, type ReactNode } from 'react';
import { Breadcrumbs } from '#src/webapp/components/ui/breadcrumbs';
import { Card } from '#src/webapp/components/ui/card';

type DemoPageShellProps = {
  title: string;
  badge?: ReactNode;
  section?: string;
  sectionTo?: string;
  backgroundStyle?: CSSProperties;
  cardClassName?: string;
  children: ReactNode;
};

export function DemoPageShell({
  title,
  badge,
  section,
  sectionTo = '/',
  backgroundStyle,
  cardClassName,
  children,
}: DemoPageShellProps) {
  return (
    <div
      className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background-default p-4 text-text-primary"
      style={backgroundStyle}
    >
      <Card className={`w-full max-w-2xl p-8 ${cardClassName ?? ''}`}>
        {section ? (
          <div className="mb-4">
            <Breadcrumbs section={section} sectionTo={sectionTo} />
          </div>
        ) : null}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {badge}
        </div>
        {children}
      </Card>
    </div>
  );
}

export function DemoListItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border border-border-default bg-background-subtle p-3 ${className ?? ''}`}
    >
      {children}
    </li>
  );
}

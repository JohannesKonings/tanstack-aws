import { type CSSProperties, type ReactNode } from 'react';
import { Card } from '#src/webapp/components/ui/card';

type DemoPageShellProps = {
  title: string;
  badge?: ReactNode;
  backgroundStyle?: CSSProperties;
  cardClassName?: string;
  children: ReactNode;
};

export function DemoPageShell({
  title,
  badge,
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

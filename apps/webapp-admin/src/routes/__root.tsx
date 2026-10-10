import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '#apps/webapp-admin/styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack AWS Examples Admin' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: '/assets/favicon-light.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        rel: 'icon',
        href: '/assets/favicon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            TanStack AWS Examples Admin
          </Link>
          <nav>
            <Link to="/db-aurora" className="text-sm text-zinc-300">
              DB Aurora
            </Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

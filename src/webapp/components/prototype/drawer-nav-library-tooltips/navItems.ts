/**
 * PROTOTYPE — demo drawer items + primary TanStack library association.
 */
import type { LinkProps } from '@tanstack/react-router';
import type { LibraryId } from './libraryMarks';

export type PrototypeNavItem = {
  id: string;
  label: string;
  to: LinkProps['to'];
  /** Primary TanStack library for icon+name mark; omit if none. */
  libraryId?: LibraryId;
  children?: Array<{
    id: string;
    label: string;
    to: LinkProps['to'];
    libraryId?: LibraryId;
  }>;
};

export const prototypeNavItems: PrototypeNavItem[] = [
  { id: 'home', label: 'Home', to: '/' },
  {
    id: 'start-server-funcs',
    label: 'Start - Server Functions',
    to: '/demo/start/server-funcs',
    libraryId: 'start',
  },
  {
    id: 'start-api',
    label: 'Start - API Request',
    to: '/demo/start/api-request',
    libraryId: 'start',
  },
  {
    id: 'start-ssr',
    label: 'Start - SSR Demos',
    to: '/demo/start/ssr',
    libraryId: 'start',
    children: [
      {
        id: 'spa-mode',
        label: 'SPA Mode',
        to: '/demo/start/ssr/spa-mode',
        libraryId: 'start',
      },
      {
        id: 'full-ssr',
        label: 'Full SSR',
        to: '/demo/start/ssr/full-ssr',
        libraryId: 'start',
      },
      {
        id: 'data-only',
        label: 'Data Only',
        to: '/demo/start/ssr/data-only',
        libraryId: 'start',
      },
    ],
  },
  { id: 'trpc', label: 'tRPC Todo', to: '/demo/trpc-todo' },
  {
    id: 'query',
    label: 'TanStack Query',
    to: '/demo/tanstack-query',
    libraryId: 'query',
  },
  {
    id: 'tanchat',
    label: 'Chat (TanStack AI with Amazon Bedrock)',
    to: '/demo/tanchat',
    libraryId: 'ai',
  },
  {
    id: 'guitars',
    label: 'Guitar Demo',
    to: '/example/guitars',
    libraryId: 'ai',
  },
  { id: 'store', label: 'Store', to: '/demo/store', libraryId: 'store' },
  { id: 'db-todo', label: 'DB Todo', to: '/demo/db-todo', libraryId: 'db' },
  {
    id: 'db-person',
    label: 'DB Persons',
    to: '/demo/db-person',
    libraryId: 'db',
  },
];

/**
 * Drawer Variant C — primary TanStack library mark (icon + short name).
 * Icons come from the tanstack.com libraries map; short names match libraries-card text.
 */
import type { Icon } from '@phosphor-icons/react';
import { categoryOf, categoryTextColor } from '#src/webapp/lib/library-categories';
import { fallbackLibraryIcon, libraryIcons } from '#src/webapp/lib/library-icons';

/** Libraries that appear as drawer marks in this showcase. */
export type DrawerLibraryId = 'start' | 'query' | 'db' | 'store' | 'ai';

/** Short product names (TanStack prefix stripped), libraries-card style. */
export const drawerLibraryNames: Record<DrawerLibraryId, string> = {
  start: 'Start',
  query: 'Query',
  db: 'DB',
  store: 'Store',
  ai: 'AI',
};

export type DrawerLibraryMark = {
  id: DrawerLibraryId;
  name: string;
  Icon: Icon;
  iconClass: string;
};

export function resolveDrawerLibraryMark(id: DrawerLibraryId): DrawerLibraryMark {
  const Icon = libraryIcons[id] ?? fallbackLibraryIcon;
  const category = categoryOf(id);
  const name = drawerLibraryNames[id as DrawerLibraryId] ?? id;
  return {
    id: id as DrawerLibraryId,
    name,
    Icon,
    iconClass: categoryTextColor[category],
  };
}

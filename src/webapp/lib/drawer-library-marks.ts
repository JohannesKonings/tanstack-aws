/**
 * Drawer Variant C — primary TanStack library mark (icon + short name).
 * Icons come from the synced DS map; short names match libraries-card text.
 */
import type { Icon } from '@phosphor-icons/react';
import { categoryOf, type LibraryCategory } from '#src/webapp/ds/libraries/categories.ts';
import { fallbackLibraryIcon, libraryIcons } from '#src/webapp/ds/libraries/icons.ts';

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

/**
 * Literal Tailwind classes so the scanner sees them outside the excluded
 * `src/webapp/ds/**` tree (same tokens as synced `categoryTextColor`).
 */
export const drawerCategoryIconClass: Record<LibraryCategory, string> = {
  framework: 'text-category-framework',
  data: 'text-category-data',
  ui: 'text-category-ui',
  performance: 'text-category-performance',
  tooling: 'text-category-tooling',
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
  return {
    id,
    name: drawerLibraryNames[id],
    Icon,
    iconClass: drawerCategoryIconClass[category],
  };
}

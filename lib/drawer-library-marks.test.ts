import { describe, expect, it } from 'vite-plus/test';
import {
  type DrawerLibraryId,
  drawerLibraryNames,
  resolveDrawerLibraryMark,
} from '#apps/webapp/lib/drawer-library-marks';
import { fallbackLibraryIcon, libraryIcons } from '#apps/webapp/lib/library-icons';

describe('drawer library marks', () => {
  it('maps showcase drawer libraries to short TanStack product names', () => {
    expect(drawerLibraryNames.start).toBe('Start');
    expect(drawerLibraryNames.query).toBe('Query');
    expect(drawerLibraryNames.db).toBe('DB');
    expect(drawerLibraryNames.store).toBe('Store');
    expect(drawerLibraryNames.ai).toBe('AI');
  });

  it('resolves known library icons and category colors', () => {
    const mark = resolveDrawerLibraryMark('query');
    expect(mark.Icon).toBe(libraryIcons.query);
    expect(mark.name).toBe('Query');
    expect(mark.iconClass).toBe('text-category-data');
  });

  it('uses fallback icon for unmapped library ids', () => {
    const unknownId = 'unknown-lib' as DrawerLibraryId;
    const mark = resolveDrawerLibraryMark(unknownId);
    expect(mark.Icon).toBe(fallbackLibraryIcon);
    expect(mark.iconClass).toBe('text-category-tooling');
  });
});

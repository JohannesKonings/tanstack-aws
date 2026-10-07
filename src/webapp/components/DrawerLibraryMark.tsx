import { IconContext } from '@phosphor-icons/react';
import {
  type DrawerLibraryId,
  resolveDrawerLibraryMark,
} from '#src/webapp/lib/drawer-library-marks';

const lightIconContext = { weight: 'light' } as const;

/** Always-on libraries-card mark under a drawer demo title (Variant C). */
export function DrawerLibraryMark({ libraryId }: { libraryId: DrawerLibraryId }) {
  const mark = resolveDrawerLibraryMark(libraryId);
  const Icon = mark.Icon;
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-ds-body-xs text-text-muted">
      <IconContext.Provider value={lightIconContext}>
        <Icon className={`size-3.5 ${mark.iconClass}`} />
      </IconContext.Provider>
      <span>{mark.name}</span>
    </span>
  );
}

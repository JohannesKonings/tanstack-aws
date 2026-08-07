/**
 * PROTOTYPE — throwaway. Slim copy of tanstack.com libraries icon + name map
 * for drawer-nav tooltip experiments (issue #66).
 */
import { BrainIcon } from '@phosphor-icons/react/Brain';
import { DatabaseIcon } from '@phosphor-icons/react/Database';
import { DresserIcon } from '@phosphor-icons/react/Dresser';
import { SealQuestionIcon } from '@phosphor-icons/react/SealQuestion';
import { SunHorizonIcon } from '@phosphor-icons/react/SunHorizon';
import { TrafficSignIcon } from '@phosphor-icons/react/TrafficSign';
import type { Icon } from '@phosphor-icons/react';

export type LibraryId = 'start' | 'router' | 'query' | 'db' | 'store' | 'ai';

export type LibraryCategory = 'framework' | 'data' | 'ui' | 'performance' | 'tooling';

export type LibraryMark = {
  id: LibraryId;
  name: string;
  Icon: Icon;
  category: LibraryCategory;
};

export const libraryMarks: Record<LibraryId, LibraryMark> = {
  start: {
    id: 'start',
    name: 'Start',
    Icon: SunHorizonIcon,
    category: 'framework',
  },
  router: {
    id: 'router',
    name: 'Router',
    Icon: TrafficSignIcon,
    category: 'framework',
  },
  query: {
    id: 'query',
    name: 'Query',
    Icon: SealQuestionIcon,
    category: 'data',
  },
  db: { id: 'db', name: 'DB', Icon: DatabaseIcon, category: 'data' },
  store: { id: 'store', name: 'Store', Icon: DresserIcon, category: 'data' },
  ai: { id: 'ai', name: 'AI', Icon: BrainIcon, category: 'data' },
};

/** Approximate DS category ramp colors (no DS theme synced yet). */
export const categoryIconClass: Record<LibraryCategory, string> = {
  framework: 'text-emerald-400',
  data: 'text-orange-400',
  ui: 'text-sky-400',
  performance: 'text-amber-400',
  tooling: 'text-neutral-300',
};

/**
 * PROTOTYPE — floating variant switcher for drawer-nav library mark experiments.
 * Three variants of library icon+name in the drawer, switchable via ?variant=.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const DRAWER_NAV_PROTO_VARIANTS = [
  { key: 'A', name: 'Hover chip tip' },
  { key: 'B', name: 'Card peek tip' },
  { key: 'C', name: 'Inline library row' },
] as const;

export type DrawerNavProtoVariant = (typeof DRAWER_NAV_PROTO_VARIANTS)[number]['key'];

export function parseDrawerNavProtoVariant(raw: unknown): DrawerNavProtoVariant {
  if (raw === 'B' || raw === 'C' || raw === 'A') {
    return raw;
  }
  return 'A';
}

function readVariantFromUrl(): DrawerNavProtoVariant {
  if (typeof window === 'undefined') {
    return 'A';
  }
  return parseDrawerNavProtoVariant(new URLSearchParams(window.location.search).get('variant'));
}

const DrawerNavProtoContext = createContext<{
  variant: DrawerNavProtoVariant;
  setVariant: (v: DrawerNavProtoVariant) => void;
} | null>(null);

export function DrawerNavProtoProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<DrawerNavProtoVariant>(readVariantFromUrl);

  const setVariant = useCallback((next: DrawerNavProtoVariant) => {
    setVariantState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    const onPop = () => setVariantState(readVariantFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value = useMemo(() => ({ variant, setVariant }), [variant, setVariant]);

  return (
    <DrawerNavProtoContext.Provider value={value}>{children}</DrawerNavProtoContext.Provider>
  );
}

export function useDrawerNavProtoVariant(): DrawerNavProtoVariant {
  const ctx = useContext(DrawerNavProtoContext);
  return ctx?.variant ?? 'A';
}

export function PrototypeNavSwitcher() {
  const ctx = useContext(DrawerNavProtoContext);
  if (!ctx || import.meta.env.PROD) {
    return null;
  }

  const { variant: current, setVariant: go } = ctx;
  const idx = DRAWER_NAV_PROTO_VARIANTS.findIndex((v) => v.key === current);
  const meta = DRAWER_NAV_PROTO_VARIANTS[idx] ?? DRAWER_NAV_PROTO_VARIANTS[0];

  const cycle = (dir: -1 | 1) => {
    const nextIdx =
      (idx + dir + DRAWER_NAV_PROTO_VARIANTS.length) % DRAWER_NAV_PROTO_VARIANTS.length;
    go(DRAWER_NAV_PROTO_VARIANTS[nextIdx].key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cycle(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        cycle(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, go]);

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-yellow-400 bg-black px-3 py-2 text-sm text-yellow-50 shadow-xl">
      <button
        type="button"
        className="rounded-full px-2 py-1 hover:bg-yellow-400/20"
        aria-label="Previous prototype variant"
        onClick={() => cycle(-1)}
      >
        ←
      </button>
      <span className="min-w-[11rem] text-center font-mono text-xs tracking-wide">
        {meta.key} — {meta.name}
      </span>
      <button
        type="button"
        className="rounded-full px-2 py-1 hover:bg-yellow-400/20"
        aria-label="Next prototype variant"
        onClick={() => cycle(1)}
      >
        →
      </button>
    </div>
  );
}

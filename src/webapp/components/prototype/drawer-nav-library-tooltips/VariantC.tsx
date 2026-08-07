/**
 * PROTOTYPE Variant C — Inline library row (no tooltip).
 * Demo title + always-visible Phosphor icon + short library name as a second line.
 */
import { IconContext } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { categoryIconClass, libraryMarks } from './libraryMarks';
import { prototypeNavItems, type PrototypeNavItem } from './navItems';

type Props = { onNavigate: () => void };

function LibraryInline({
  libraryId,
}: {
  libraryId: NonNullable<PrototypeNavItem['libraryId']>;
}) {
  const mark = libraryMarks[libraryId];
  const Icon = mark.Icon;
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
      <IconContext.Provider value={{ weight: 'light' }}>
        <Icon className={`size-3.5 ${categoryIconClass[mark.category]}`} />
      </IconContext.Provider>
      <span>{mark.name}</span>
    </span>
  );
}

function NavRow({
  item,
  onNavigate,
}: {
  item: PrototypeNavItem | NonNullable<PrototypeNavItem['children']>[number];
  onNavigate: () => void;
}) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex flex-col rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-800"
      activeProps={{
        className:
          'flex flex-col rounded-lg bg-cyan-600 px-3 py-2.5 transition-colors hover:bg-cyan-700',
      }}
    >
      <span className="font-medium">{item.label}</span>
      {item.libraryId ? <LibraryInline libraryId={item.libraryId} /> : null}
    </Link>
  );
}

export function VariantC({ onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 px-1 text-[10px] tracking-wider text-yellow-400/80 uppercase">
        PROTOTYPE C — inline library row (always on)
      </p>
      {prototypeNavItems.map((item) => {
        if (!item.children) {
          return <NavRow key={item.id} item={item} onNavigate={onNavigate} />;
        }
        return (
          <div key={item.id}>
            <div className="flex flex-row justify-between">
              <Link
                to={item.to}
                onClick={onNavigate}
                className="flex min-w-0 flex-1 flex-col rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-800"
                activeProps={{
                  className:
                    'flex min-w-0 flex-1 flex-col rounded-lg bg-cyan-600 px-3 py-2.5 transition-colors hover:bg-cyan-700',
                }}
              >
                <span className="font-medium">{item.label}</span>
                {item.libraryId ? <LibraryInline libraryId={item.libraryId} /> : null}
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 transition-colors hover:bg-gray-800"
                onClick={() => setExpanded((v) => !v)}
                aria-label="Toggle SSR demos"
              >
                {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
            </div>
            {expanded ? (
              <div className="ml-4 flex flex-col gap-1">
                {item.children.map((child) => (
                  <NavRow key={child.id} item={child} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const variantCName = 'Inline library row';

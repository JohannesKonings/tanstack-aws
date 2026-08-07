/**
 * PROTOTYPE Variant A — Hover chip tip (mega-menu row DNA).
 * Keep demo labels; on hover show Phosphor library icon + short name to the right.
 */
import { IconContext } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { categoryIconClass, libraryMarks } from './libraryMarks';
import { prototypeNavItems, type PrototypeNavItem } from './navItems';

type Props = { onNavigate: () => void };

function LibraryChip({ libraryId }: { libraryId: NonNullable<PrototypeNavItem['libraryId']> }) {
  const mark = libraryMarks[libraryId];
  const Icon = mark.Icon;
  return (
    <span className="pointer-events-none mt-1 hidden w-fit items-center gap-2 rounded-full border border-white/10 bg-gray-950 px-3 py-1.5 whitespace-nowrap shadow-lg group-hover/nav:inline-flex">
      <IconContext.Provider value={{ weight: 'light' }}>
        <Icon className={`size-4 ${categoryIconClass[mark.category]}`} />
      </IconContext.Provider>
      <span className="text-sm font-medium text-white">{mark.name}</span>
    </span>
  );
}

function NavRow({
  item,
  onNavigate,
  nested,
}: {
  item: PrototypeNavItem | NonNullable<PrototypeNavItem['children']>[number];
  onNavigate: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`group/nav flex flex-col rounded-lg p-3 transition-colors hover:bg-gray-800 ${nested ? '' : ''}`}
      activeProps={{
        className:
          'group/nav flex flex-col rounded-lg bg-cyan-600 p-3 transition-colors hover:bg-cyan-700',
      }}
    >
      <span className="font-medium">{item.label}</span>
      {item.libraryId ? <LibraryChip libraryId={item.libraryId} /> : null}
    </Link>
  );
}

export function VariantA({ onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 px-1 text-[10px] tracking-wider text-yellow-400/80 uppercase">
        PROTOTYPE A — hover chip (icon + name)
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
                className="group/nav flex min-w-0 flex-1 flex-col rounded-lg p-3 transition-colors hover:bg-gray-800"
                activeProps={{
                  className:
                    'group/nav flex min-w-0 flex-1 flex-col rounded-lg bg-cyan-600 p-3 transition-colors hover:bg-cyan-700',
                }}
              >
                <span className="font-medium">{item.label}</span>
                {item.libraryId ? <LibraryChip libraryId={item.libraryId} /> : null}
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
                  <NavRow key={child.id} item={child} onNavigate={onNavigate} nested />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const variantAName = 'Hover chip tip';

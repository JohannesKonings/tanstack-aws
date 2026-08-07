/**
 * PROTOTYPE Variant B — Card peek tip (libraries-card DNA).
 * Hover reveals a mini card: category-tinted Phosphor icon + short name + eyebrow.
 */
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { categoryIconClass, libraryMarks } from './libraryMarks';
import { prototypeNavItems, type PrototypeNavItem } from './navItems';

type Props = { onNavigate: () => void };

function LibraryCardPeek({
  libraryId,
}: {
  libraryId: NonNullable<PrototypeNavItem['libraryId']>;
}) {
  const mark = libraryMarks[libraryId];
  const Icon = mark.Icon;
  return (
    <div className="pointer-events-none mt-2 hidden w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-3 shadow-inner group-hover/nav:block">
      <p className="mb-1.5 text-[10px] tracking-wider text-white/40 uppercase">TanStack</p>
      <div className="flex items-center gap-3">
        <Icon className={`size-7 shrink-0 ${categoryIconClass[mark.category]}`} />
        <span className="text-xl leading-tight font-medium text-white/90">{mark.name}</span>
      </div>
    </div>
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
      className="group/nav flex flex-col rounded-lg p-3 transition-colors hover:bg-gray-800"
      activeProps={{
        className:
          'group/nav flex flex-col rounded-lg bg-cyan-600 p-3 transition-colors hover:bg-cyan-700',
      }}
    >
      <span className="font-medium">{item.label}</span>
      {item.libraryId ? <LibraryCardPeek libraryId={item.libraryId} /> : null}
    </Link>
  );
}

export function VariantB({ onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 px-1 text-[10px] tracking-wider text-yellow-400/80 uppercase">
        PROTOTYPE B — card peek (icon + name)
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
                {item.libraryId ? <LibraryCardPeek libraryId={item.libraryId} /> : null}
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

export const variantBName = 'Card peek tip';

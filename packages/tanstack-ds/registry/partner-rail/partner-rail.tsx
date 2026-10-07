import { CrownIcon, MedalIcon, StarIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '#src/webapp/lib/utils';

/**
 * TanStack DS Partner Rail — adapted from tanstack.com/src/components/ds/ui/PartnerRail.tsx.
 * Self-contained presentational version without upstream analytics/partner-placement deps.
 */

export type PartnerTier = 'gold' | 'silver' | 'bronze';

export type RailPartner = {
  id: string;
  name: string;
  href: string;
  tier?: PartnerTier;
  logoSrc: string;
  logoAlt?: string;
};

const partnerTierLabels: Record<PartnerTier, string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

const partnerTierFlares: Record<
  PartnerTier,
  { labelColor: string; iconColor: string; icon: ReactNode }
> = {
  gold: {
    labelColor: 'text-ds-amber-300',
    iconColor: 'text-ds-amber-400',
    icon: <CrownIcon className="size-3.5" weight="fill" aria-hidden />,
  },
  silver: {
    labelColor: 'text-text-muted',
    iconColor: 'text-text-secondary',
    icon: <MedalIcon className="size-3.5" weight="fill" aria-hidden />,
  },
  bronze: {
    labelColor: 'text-ds-terracotta-300',
    iconColor: 'text-ds-terracotta-400',
    icon: <StarIcon className="size-3.5" weight="fill" aria-hidden />,
  },
};

const tierLayout: Record<PartnerTier, { rowHeight: string; idleOpacity: string }> = {
  gold: { rowHeight: 'h-[80px]', idleOpacity: '' },
  silver: { rowHeight: 'h-[62px]', idleOpacity: 'opacity-80' },
  bronze: { rowHeight: 'h-[56px]', idleOpacity: 'opacity-65' },
};

const TIER_ORDER: PartnerTier[] = ['gold', 'silver', 'bronze'];

function TierHeader({ tier }: { tier: PartnerTier }) {
  const flare = partnerTierFlares[tier];
  return (
    <div className="flex w-full items-center gap-2">
      <span className={cn('h-px flex-1 bg-current/40', flare.labelColor)} />
      <span className={cn('flex items-center gap-1.5', flare.labelColor)}>
        <span className={flare.iconColor}>{flare.icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          {partnerTierLabels[tier]}
        </span>
      </span>
      <span className={cn('h-px flex-1 bg-current/40', flare.labelColor)} />
    </div>
  );
}

function groupPartnersByTier(partners: RailPartner[]) {
  const groups: Record<PartnerTier, RailPartner[]> = {
    gold: [],
    silver: [],
    bronze: [],
  };
  for (const partner of partners) {
    const tier = partner.tier ?? 'bronze';
    groups[tier].push(partner);
  }
  return TIER_ORDER.map((tier) => ({ tier, partners: groups[tier] })).filter(
    (row) => row.partners.length > 0,
  );
}

export function PartnerRail({
  partners,
  title = 'Partners',
  titleTo = '/',
  inquiryHref = 'https://tanstack.com/partners',
}: {
  partners: RailPartner[];
  title?: string;
  titleTo?: string;
  inquiryHref?: string;
}) {
  const rowsByTier = groupPartnersByTier(partners);

  return (
    <div className="group/rail flex w-full flex-col gap-6">
      <div className="flex w-full items-center justify-between gap-2">
        <Link className="text-xs font-medium opacity-60 hover:opacity-100" to={titleTo}>
          {title}
        </Link>
        <a
          href={inquiryHref}
          className="text-xs font-medium opacity-60 hover:underline hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          Become a Partner
        </a>
      </div>
      {rowsByTier.map((row) => (
        <section key={row.tier} className="flex w-full flex-col gap-2.5">
          <TierHeader tier={row.tier} />
          <div className="flex flex-col">
            {row.partners.map((partner) => {
              const tier = partner.tier ?? 'bronze';
              const layout = tierLayout[tier];
              return (
                <a
                  key={partner.id}
                  href={partner.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'flex w-full items-center justify-center overflow-hidden px-2 transition-colors duration-150 ease-out hover:bg-gray-500/10',
                    layout.rowHeight,
                  )}
                >
                  <img
                    src={partner.logoSrc}
                    alt={partner.logoAlt ?? partner.name}
                    className={cn(
                      'max-h-10 w-auto max-w-[170px] object-contain grayscale brightness-90 transition-[filter,opacity] duration-500 ease-out group-hover/rail:grayscale-0 group-hover/rail:brightness-100 group-hover/rail:opacity-100',
                      layout.idleOpacity,
                    )}
                  />
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

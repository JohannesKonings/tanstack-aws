import { AuroraConfigurationError, createStageDatabaseClient } from '@tanstack-aws/aurora';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn, useServerFn } from '@tanstack/react-start';
import {
  countStageDatabaseTables,
  type StageTableCounts,
} from '#apps/webapp-admin/db-aurora/counts.ts';

const getStageDatabaseCounts = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const counts = await countStageDatabaseTables(createStageDatabaseClient(), process.env);
    return { counts, status: 'ready' as const };
  } catch (error) {
    if (error instanceof AuroraConfigurationError) {
      return { status: 'configuration-error' as const };
    }
    throw error;
  }
});

export const Route = createFileRoute('/db-aurora')({
  component: DbAuroraPage,
});

const countLabels = [
  ['Persons', 'persons'],
  ['Addresses', 'addresses'],
  ['Bank accounts', 'bankAccounts'],
  ['Contacts', 'contacts'],
  ['Employment', 'employments'],
] as const satisfies ReadonlyArray<readonly [string, keyof StageTableCounts]>;

function DbAuroraPage() {
  const getCounts = useServerFn(getStageDatabaseCounts);
  const countsQuery = useQuery({
    queryFn: () => getCounts(),
    queryKey: ['db-aurora', 'counts'],
  });
  const readyCounts = countsQuery.data?.status === 'ready' ? countsQuery.data.counts : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-8">
      <h1 className="text-3xl font-semibold tracking-tight">DB Aurora</h1>
      <p className="mt-3 text-zinc-400">Row counts for the stage database.</p>
      {countsQuery.isPending ? <p className="mt-8 text-zinc-400">Loading counts…</p> : null}
      {countsQuery.isError ? (
        <p className="mt-8 text-red-300" role="alert">
          The stage database counts could not be loaded.
        </p>
      ) : null}
      {countsQuery.data?.status === 'configuration-error' ? (
        <p className="mt-8 text-amber-200" role="alert">
          Aurora settings are missing. The stage database counts are unavailable.
        </p>
      ) : null}
      {readyCounts ? (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          {countLabels.map(([label, key]) => (
            <div key={key} className="rounded-lg border border-zinc-800 px-4 py-3">
              <dt className="text-sm text-zinc-400">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{readyCounts[key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </main>
  );
}

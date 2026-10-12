import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { AuroraPersonDetail } from '#apps/webapp/aurora-persons/detail.tsx';
import {
  auroraPersonDetailQuery,
  getAuroraPersonDetail,
} from '#apps/webapp/aurora-persons/server.ts';
import { Button } from '#apps/webapp/components/ui/button';

export const Route = createFileRoute('/demo/db-persons/aurora_/$id')({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(
      auroraPersonDetailQuery(params.id, () =>
        getAuroraPersonDetail({ data: { personId: params.id } }),
      ),
    ),
  component: AuroraPersonPage,
});

function AuroraPersonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getPerson = useServerFn(getAuroraPersonDetail);
  const personQuery = useQuery(
    auroraPersonDetailQuery(id, () => getPerson({ data: { personId: id } })),
  );
  const leave = () => {
    void navigate({ to: '/demo/db-persons/aurora' });
  };

  return (
    <div className="min-h-screen bg-background-default p-4 text-text-primary md:p-6 lg:p-8">
      <div className="mb-6">
        <Button as={Link} to="/demo/db-persons/aurora" variant="link">
          ← Aurora persons
        </Button>
      </div>

      {personQuery.isPending ? <p className="text-text-secondary">Loading person…</p> : null}
      {personQuery.isError ? (
        <p className="text-ds-terracotta-400" role="alert">
          Aurora person could not be loaded.
        </p>
      ) : null}
      {personQuery.data?.status === 'configuration-error' ? (
        <p className="text-ds-terracotta-400" role="alert">
          Aurora settings are missing. Aurora persons are unavailable.
        </p>
      ) : null}
      {personQuery.data?.status === 'missing' ? (
        <p className="text-text-secondary">This person is no longer available.</p>
      ) : null}
      {personQuery.data?.status === 'ready' ? (
        <AuroraPersonDetail
          person={personQuery.data.person}
          addresses={personQuery.data.addresses}
          contacts={personQuery.data.contacts}
          bankAccounts={personQuery.data.bankAccounts}
          employments={personQuery.data.employments}
          onClose={leave}
        />
      ) : null}
    </div>
  );
}

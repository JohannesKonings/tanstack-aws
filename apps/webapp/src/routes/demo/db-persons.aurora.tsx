import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { useCreateAuroraPerson } from '#apps/webapp/aurora-persons/mutations.ts';
import { auroraPersonListQuery, getAuroraPersonList } from '#apps/webapp/aurora-persons/server.ts';
import { AuroraPersonsTable } from '#apps/webapp/aurora-persons/table.tsx';
import { CreatePersonModal } from '#apps/webapp/components/persons/CreatePersonModal';
import { Button } from '#apps/webapp/components/ui/button';

export const Route = createFileRoute('/demo/db-persons/aurora')({
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(auroraPersonListQuery(() => getAuroraPersonList())),
  component: AuroraPersonsPage,
});

function AuroraPersonsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const getPersons = useServerFn(getAuroraPersonList);
  const createPerson = useCreateAuroraPerson();
  const personsQuery = useQuery(auroraPersonListQuery(() => getPersons()));
  const persons = personsQuery.data?.status === 'ready' ? personsQuery.data.persons : undefined;

  return (
    <div className="min-h-screen bg-background-default p-4 text-text-primary md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aurora persons</h1>
          <p className="mt-1 text-text-secondary">Manage persons stored in the stage database</p>
        </div>
        {persons ? (
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            Create Person
          </Button>
        ) : null}
      </div>

      {personsQuery.isPending ? (
        <p className="text-text-secondary">Loading Aurora persons…</p>
      ) : null}
      {personsQuery.isError ? (
        <p className="text-ds-terracotta-400" role="alert">
          Aurora persons could not be loaded.
        </p>
      ) : null}
      {personsQuery.data?.status === 'configuration-error' ? (
        <p className="text-ds-terracotta-400" role="alert">
          Aurora settings are missing. Aurora persons are unavailable.
        </p>
      ) : null}
      {createPerson.isError ? (
        <p className="mb-4 text-ds-terracotta-400" role="alert">
          Aurora person could not be created.
        </p>
      ) : null}

      {persons ? <AuroraPersonsTable data={persons} /> : null}
      {showCreateModal ? (
        <CreatePersonModal
          onCancel={() => setShowCreateModal(false)}
          onSave={(values) => {
            createPerson.mutate(
              {
                firstName: values.firstName,
                lastName: values.lastName,
                dateOfBirth: values.dateOfBirth,
                gender: values.gender,
              },
              { onSuccess: () => setShowCreateModal(false) },
            );
          }}
        />
      ) : null}
    </div>
  );
}

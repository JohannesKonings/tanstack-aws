import { AuroraConfigurationError, createStageDatabaseClient } from '@tanstack-aws/aurora';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn, useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { AuroraPersonDetail } from '#apps/webapp/aurora-persons/detail.tsx';
import { readAuroraPersons } from '#apps/webapp/aurora-persons/read.ts';
import { PersonsTable, type PersonTableRow } from '#apps/webapp/components/persons/PersonsTable';

const getAuroraPersons = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const rows = await readAuroraPersons(createStageDatabaseClient(), process.env);
    return { rows, status: 'ready' as const };
  } catch (error) {
    if (error instanceof AuroraConfigurationError) {
      return { status: 'configuration-error' as const };
    }
    throw error;
  }
});

export const Route = createFileRoute('/demo/db-persons/aurora')({
  component: AuroraPersonsPage,
});

function AuroraPersonsPage() {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const getPersons = useServerFn(getAuroraPersons);
  const personsQuery = useQuery({
    queryFn: () => getPersons(),
    queryKey: ['aurora-persons'],
  });
  const rows = personsQuery.data?.status === 'ready' ? personsQuery.data.rows : undefined;
  const selectedPerson = rows?.persons.find((person) => person.id === selectedPersonId);

  const tableData: PersonTableRow[] = (rows?.persons ?? []).map((person) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    gender: person.gender ?? undefined,
    dateOfBirth: person.dateOfBirth ?? undefined,
  }));

  const handleRowSelect = (person: PersonTableRow) => {
    setSelectedPersonId(person.id);
  };

  return (
    <div className="min-h-screen bg-background-default p-4 text-text-primary md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Aurora persons</h1>
        <p className="mt-1 text-text-secondary">Browse persons stored in the stage database</p>
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

      {rows ? (
        <div className="flex gap-6">
          <div className={selectedPerson ? 'w-1/2 min-w-0' : 'w-full'}>
            <PersonsTable
              data={tableData}
              loading={personsQuery.isPending}
              selectedId={selectedPersonId ?? undefined}
              onRowSelect={handleRowSelect}
            />
          </div>
          {selectedPerson ? (
            <div className="w-1/2 min-w-0">
              <AuroraPersonDetail
                person={selectedPerson}
                addresses={rows.addresses.filter(
                  (address) => address.personId === selectedPerson.id,
                )}
                contacts={rows.contacts.filter((contact) => contact.personId === selectedPerson.id)}
                bankAccounts={rows.bankAccounts.filter(
                  (bankAccount) => bankAccount.personId === selectedPerson.id,
                )}
                employments={rows.employments.filter(
                  (employment) => employment.personId === selectedPerson.id,
                )}
                onClose={() => setSelectedPersonId(null)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

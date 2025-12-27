import { CreatePersonModal } from '#src/webapp/components/persons/CreatePersonModal';
import { PersonDetailPanel } from '#src/webapp/components/persons/PersonDetailPanel';
import { PersonsTable, type PersonTableRow } from '#src/webapp/components/persons/PersonsTable';
import { Button } from '#src/webapp/components/ui/button';
import { usePersons } from '#src/webapp/hooks/useDbPersons';
// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/demo/db-person')({
  ssr: false,
  component: DbPersons,
});

function DbPersons() {
  const [mounted, setMounted] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { persons, isLoading, addPerson } = usePersons();

  // Ensure client-side only rendering to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert persons to table rows
  const tableData: PersonTableRow[] = useMemo(() => {
    const maxDisplay = 100;
    const startIndex = 0;
    return persons.slice(startIndex, maxDisplay).map((person) => ({
      id: String(person.id),
      firstName: String(person.firstName),
      lastName: String(person.lastName),
      gender: person.gender,
      dateOfBirth: person.dateOfBirth,
    }));
  }, [persons]);

  const handleRowSelect = (person: PersonTableRow) => {
    setSelectedPersonId(person.id);
  };

  const handleCloseDetail = () => {
    setSelectedPersonId(null);
  };

  const getTableContainerClass = (hasSelection: string | null) => {
    if (hasSelection) {
      return 'w-1/2 min-w-0';
    }
    return 'w-full';
  };

  // Show loading state until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div
        className="min-h-screen p-4 md:p-6 lg:p-8 text-white"
        style={{
          backgroundImage:
            'radial-gradient(50% 50% at 80% 20%, #1a4d3e 0%, #0d7377 60%, #0a2e36 100%)',
        }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">DB Persons</h1>
          <p className="mt-1 text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-6 lg:p-8 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 20%, #1a4d3e 0%, #0d7377 60%, #0a2e36 100%)',
      }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DB Persons</h1>
          <p className="mt-1 text-white/70">Browse and manage persons with multi-entity support</p>
        </div>
        <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
          Create Person
        </Button>
      </div>

      {/* Main Content - Table and Detail Panel */}
      <div className="flex gap-6">
        {/* Persons Table */}
        <div className={getTableContainerClass(selectedPersonId)}>
          <PersonsTable
            data={tableData}
            loading={isLoading}
            selectedId={selectedPersonId ?? undefined}
            onRowSelect={handleRowSelect}
          />
        </div>

        {/* Selected Person Detail Panel */}
        {selectedPersonId && (
          <div className="w-1/2 min-w-0">
            <PersonDetailPanel personId={selectedPersonId} onClose={handleCloseDetail} />
          </div>
        )}
      </div>
      {showCreateModal && (
        <CreatePersonModal
          onCancel={() => setShowCreateModal(false)}
          onSave={(values) => {
            const now = new Date().toISOString();
            addPerson({
              id: crypto.randomUUID(),
              firstName: values.firstName,
              lastName: values.lastName,
              dateOfBirth: values.dateOfBirth ?? '',
              gender: values.gender ?? 'other',
              createdAt: now,
              updatedAt: now,
            } as any);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

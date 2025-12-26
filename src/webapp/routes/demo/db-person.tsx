// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import type { PersonSearchResult } from '#src/webapp/integrations/orama/personSearch';
import { PersonDetailPanel } from '#src/webapp/components/persons/PersonDetailPanel';
import { PersonSearchInput } from '#src/webapp/components/persons/PersonSearchInput';
import { PersonsTable, type PersonTableRow } from '#src/webapp/components/persons/PersonsTable';
import { usePersons } from '#src/webapp/hooks/useDbPersons';

export const Route = createFileRoute('/demo/db-person')({
  ssr: false,
  component: DbPersons,
});

function DbPersons() {
  const [mounted, setMounted] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<PersonSearchResult | null>(null);

  const { persons, isLoading } = usePersons();

  // Ensure client-side only rendering to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert persons to table rows with address data from search results
  const tableData: PersonTableRow[] = useMemo(() => {
    // If there's a search result, filter to just that person with full data
    if (searchResult) {
      const foundPerson = persons.find((person) => person.id === searchResult.id);
      if (foundPerson) {
        return [
          {
            id: String(foundPerson.id),
            firstName: String(foundPerson.firstName),
            lastName: String(foundPerson.lastName),
            gender: foundPerson.gender,
            dateOfBirth: foundPerson.dateOfBirth,
          },
        ];
      }
    }

    // Otherwise show all persons
    const maxDisplay = 100;
    const startIndex = 0;
    return persons.slice(startIndex, maxDisplay).map((person) => ({
      id: String(person.id),
      firstName: String(person.firstName),
      lastName: String(person.lastName),
      gender: person.gender,
      dateOfBirth: person.dateOfBirth,
    }));
  }, [persons, searchResult]);

  const handleResultSelect = (result: PersonSearchResult) => {
    setSearchResult(result);
    setSelectedPersonId(result.document.id);
  };

  const handleRowSelect = (person: PersonTableRow) => {
    setSelectedPersonId(person.id);
  };

  const handleClearSearch = () => {
    setSearchResult(null);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">DB Persons</h1>
        <p className="mt-1 text-white/70">Search and manage persons with cross-entity search</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <PersonSearchInput onResultSelect={handleResultSelect} />
        {searchResult && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="mt-2 text-sm text-cyan-400 hover:underline"
          >
            Clear search filter
          </button>
        )}
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
    </div>
  );
}

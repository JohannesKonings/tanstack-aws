import type { PersonSummary } from '#src/webapp/types/person';
import { PersonCard } from './PersonCard';

interface PersonListProps {
  persons: PersonSummary[];
  loading?: boolean;
  selectedId?: string;
  onSelect?: (person: PersonSummary) => void;
}

export const PersonList = ({ persons, loading, selectedId, onSelect }: PersonListProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_unused, index) => (
          <PersonListSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  const hasNoPersons = !persons.length;

  if (hasNoPersons) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/30 p-12 text-center">
        <p className="text-lg font-medium text-white/70">No persons found</p>
        <p className="mt-1 text-sm text-white/60">Try adjusting your search or add some persons.</p>
      </div>
    );
  }

  const handleClick = (person: PersonSummary) => {
    if (onSelect) {
      onSelect(person);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {persons.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          selected={selectedId === person.id}
          onClick={() => handleClick(person)}
        />
      ))}
    </div>
  );
};

const PersonListSkeleton = () => (
  <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-4">
    <div className="h-6 w-3/4 animate-pulse rounded bg-white/20" />
    <div className="mt-3 space-y-2">
      <div className="h-4 w-1/2 animate-pulse rounded bg-white/20" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-white/20" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-white/20" />
    </div>
  </div>
);

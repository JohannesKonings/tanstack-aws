import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import type { PersonSearchResult } from '#src/webapp/integrations/orama/personSearch';
import { usePersonSearch } from '#src/webapp/hooks/useDbPersons';

// Constants
const BLUR_DELAY_MS = 200;
const MIN_SEARCH_LENGTH = 2;
const EMPTY_RESULTS = 0;
const HAS_RESULTS = 0;

interface PersonSearchInputProps {
  onResultSelect?: (result: PersonSearchResult) => void;
}

export const PersonSearchInput = ({ onResultSelect }: PersonSearchInputProps) => {
  const { searchTerm, setSearchTerm, results, isIndexBuilding, isReady, personCount } =
    usePersonSearch();

  const [showResults, setShowResults] = useState(false);

  const getPlaceholder = () => {
    if (isIndexBuilding) {
      return 'Building search index...';
    }
    return `Search ${personCount} persons...`;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleBlur = () => {
    setTimeout(() => setShowResults(false), BLUR_DELAY_MS);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
        <input
          type="text"
          placeholder={getPlaceholder()}
          value={searchTerm}
          onChange={handleChange}
          onFocus={() => setShowResults(true)}
          onBlur={handleBlur}
          disabled={!isReady}
          className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-2 pl-10 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isIndexBuilding && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/60" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > HAS_RESULTS && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/20 bg-black/80 backdrop-blur-md shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {results.map((result) => (
              <li
                key={result.id}
                onClick={() => onResultSelect?.(result)}
                className="cursor-pointer px-4 py-2 hover:bg-white/10 text-white"
              >
                <div className="font-medium">{result.document.fullName}</div>
                {result.document.email && (
                  <div className="text-sm text-white/70">{result.document.email}</div>
                )}
                {(result.document.city || result.document.companyName) && (
                  <div className="text-xs text-white/60">
                    {[result.document.city, result.document.companyName]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Results */}
      {showResults &&
        searchTerm.length >= MIN_SEARCH_LENGTH &&
        results.length === EMPTY_RESULTS &&
        isReady && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-white/20 bg-black/80 backdrop-blur-md p-4 text-center text-sm text-white/70 shadow-lg">
            No persons found matching "{searchTerm}"
          </div>
        )}
    </div>
  );
};

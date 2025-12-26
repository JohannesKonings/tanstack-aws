import {
  create,
  insert,
  insertMultiple,
  type Orama,
  remove,
  type Results,
  search,
  type SearchParams,
} from '@orama/orama';
import type { AllEntitiesData } from '#src/webapp/integrations/electrodb/personsClient';
import type { PersonSummary } from '#src/webapp/types/person';

// =============================================================================
// Types
// =============================================================================

/**
 * Schema for Orama search index
 * Includes fields from all entity types for cross-entity search:
 * - Person: firstName, lastName
 * - Address: city, country
 * - Contact: email, phone
 * - Employment: companyName, position
 * - Bank: bankName
 */
export interface PersonSearchDocument {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  // Address fields
  city: string;
  country: string;
  // Contact fields
  email: string;
  phone: string;
  // Employment fields
  companyName: string;
  position: string;
  // Bank fields
  bankName: string;
}

export type PersonSearchIndex = Orama<{
  id: 'string';
  firstName: 'string';
  lastName: 'string';
  fullName: 'string';
  city: 'string';
  country: 'string';
  email: 'string';
  phone: 'string';
  companyName: 'string';
  position: 'string';
  bankName: 'string';
}>;

export interface PersonSearchResult {
  id: string;
  score: number;
  document: PersonSearchDocument;
}

export interface SearchOptions {
  limit?: number;
  tolerance?: number;
  threshold?: number;
}

// =============================================================================
// Index Creation
// =============================================================================

/**
 * Create a new Orama search index for persons
 */
export const createPersonSearchIndex = async (): Promise<PersonSearchIndex> =>
  (await create({
    schema: {
      id: 'string',
      firstName: 'string',
      lastName: 'string',
      fullName: 'string',
      city: 'string',
      country: 'string',
      email: 'string',
      phone: 'string',
      companyName: 'string',
      position: 'string',
      bankName: 'string',
    },
  })) as PersonSearchIndex;

// =============================================================================
// Index Population
// =============================================================================

/**
 * Convert a person summary to a search document
 */
export const toSearchDocument = (person: PersonSummary): PersonSearchDocument => ({
  id: person.id,
  firstName: person.firstName,
  lastName: person.lastName,
  fullName: `${person.firstName} ${person.lastName}`,
  city: person.city ?? '',
  country: person.country ?? '',
  email: person.email ?? '',
  phone: person.phone ?? '',
  companyName: person.companyName ?? '',
  position: person.position ?? '',
  bankName: person.bankName ?? '',
});

/**
 * Convert AllEntitiesData to PersonSummary array for search indexing
 * Merges data from all entities into a flat structure per person
 */
export const mergeEntitiesToSummaries = (data: AllEntitiesData): PersonSummary[] => {
  const summaryMap = new Map<string, PersonSummary>();

  // Start with persons
  for (const person of data.persons) {
    summaryMap.set(person.id, {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
    });
  }

  // Add primary address fields
  for (const address of data.addresses) {
    const summary = summaryMap.get(address.personId);
    if (summary && address.isPrimary) {
      summary.city = address.city;
      summary.country = address.country;
    }
  }

  // Add primary contact fields (email and phone)
  for (const contact of data.contacts) {
    const summary = summaryMap.get(contact.personId);
    if (summary && contact.isPrimary) {
      if (contact.type === 'email') {
        summary.email = contact.value;
      } else if (contact.type === 'phone' || contact.type === 'mobile') {
        summary.phone = contact.value;
      }
    }
  }

  // Add current employment fields
  for (const employment of data.employments) {
    const summary = summaryMap.get(employment.personId);
    if (summary && employment.isCurrent) {
      summary.companyName = employment.companyName;
      summary.position = employment.position;
    }
  }

  // Add primary bank fields
  for (const bank of data.bankAccounts) {
    const summary = summaryMap.get(bank.personId);
    if (summary && bank.isPrimary) {
      summary.bankName = bank.bankName;
    }
  }

  return Array.from(summaryMap.values());
};

/**
 * Populate index from AllEntitiesData (used for paginated loading)
 */
export const populateIndexFromEntities = async (
  index: PersonSearchIndex,
  data: AllEntitiesData,
): Promise<number> => {
  const summaries = mergeEntitiesToSummaries(data);
  const documents = summaries.map(toSearchDocument);
  await insertMultiple(index, documents);
  return documents.length;
};

/**
 * Add a single person to the search index
 */
export const addToIndex = async (
  index: PersonSearchIndex,
  person: PersonSummary,
): Promise<void> => {
  await insert(index, toSearchDocument(person));
};

/**
 * Add multiple persons to the search index
 */
export const addMultipleToIndex = async (
  index: PersonSearchIndex,
  persons: PersonSummary[],
): Promise<void> => {
  const documents = persons.map(toSearchDocument);
  await insertMultiple(index, documents);
};

/**
 * Remove a person from the search index
 */
export const removeFromIndex = async (
  index: PersonSearchIndex,
  personId: string,
): Promise<void> => {
  await remove(index, personId);
};

// =============================================================================
// Search Operations
// =============================================================================

const DEFAULT_LIMIT = 50;
const DEFAULT_TOLERANCE = 1;
const DEFAULT_THRESHOLD = 0;

/**
 * Search persons with fuzzy matching
 */
export const searchPersons = async (
  index: PersonSearchIndex,
  term: string,
  options?: SearchOptions,
): Promise<Results<PersonSearchDocument>> => {
  const searchParams: SearchParams<PersonSearchIndex, PersonSearchDocument> = {
    term,
    tolerance: options?.tolerance ?? DEFAULT_TOLERANCE,
    limit: options?.limit ?? DEFAULT_LIMIT,
    threshold: options?.threshold ?? DEFAULT_THRESHOLD,
  };

  return await search(index, searchParams);
};

/**
 * Search persons and return simplified results
 */
export const searchPersonsSimple = async (
  index: PersonSearchIndex,
  term: string,
  options?: SearchOptions,
): Promise<PersonSearchResult[]> => {
  const results = await searchPersons(index, term, options);

  return results.hits.map(
    (hit: { id: unknown; score: number; document: PersonSearchDocument }) => ({
      id: hit.id as string,
      score: hit.score,
      document: hit.document,
    }),
  );
};

// =============================================================================
// Index Statistics
// =============================================================================

/**
 * Get the count of documents in the index
 */
export const getIndexCount = async (index: PersonSearchIndex): Promise<number> => {
  const result = await search(index, { term: '', limit: 0 });
  return result.count;
};

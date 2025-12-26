// oxlint-disable no-magic-numbers
// oxlint-disable func-style
import { useLiveQuery } from '@tanstack/react-db';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
  PersonSummary,
} from '#src/webapp/types/person';
// import { getPrimaryEmail, getPrimaryCity, getCurrentEmployer } from '#src/webapp/data/fake-persons';
import {
  createAddressesCollection,
  createBankAccountsCollection,
  createContactsCollection,
  createEmploymentsCollection,
  personsCollection,
} from '#src/webapp/db-collections/persons';
import {
  addMultipleToIndex,
  createPersonSearchIndex,
  type PersonSearchIndex,
  type PersonSearchResult,
  searchPersonsSimple,
} from '#src/webapp/integrations/orama/personSearch';

// =============================================================================
// Persons List Hook
// =============================================================================

/**
 * Hook for accessing and mutating the persons collection
 */
export function usePersons() {
  // Live query for all persons
  const query = useLiveQuery(personsCollection);

  // Mutation functions
  const addPerson = useCallback((person: Person) => {
    personsCollection.insert(person);
  }, []);

  const updatePerson = useCallback((id: string, changes: Partial<Person>) => {
    personsCollection.update(id, (draft) => {
      Object.assign(draft, changes, { updatedAt: new Date().toISOString() });
    });
  }, []);

  const deletePerson = useCallback((id: string) => {
    personsCollection.delete(id);
  }, []);

  return {
    persons: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addPerson,
    updatePerson,
    deletePerson,
  };
}

// =============================================================================
// Person Search Hook (with Orama)
// =============================================================================

interface UsePersonSearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
  searchLimit?: number;
  tolerance?: number;
}

/**
 * Hook for searching persons with Orama fuzzy search
 */
export function usePersonSearch(options?: UsePersonSearchOptions) {
  const { debounceMs = 200, minSearchLength = 2, searchLimit = 50, tolerance = 1 } = options ?? {};

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searchIndex, setSearchIndex] = useState<PersonSearchIndex | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);
  const lastDataHashRef = useRef<string>('');

  // Get persons from collection
  const { persons, isLoading: isPersonsLoading } = usePersons();

  // Debounce search term using TanStack Pacer
  const [debouncedTerm] = useDebouncedValue(searchTerm, { wait: debounceMs });

  // Build/rebuild search index when persons change
  useEffect(() => {
    async function buildIndex() {
      if (persons.length === 0) return;

      // Create hash to detect changes
      const dataHash = persons
        .map((p) => p.id)
        .sort()
        .join(',');
      if (dataHash === lastDataHashRef.current && searchIndex) return;

      setIsIndexBuilding(true);

      try {
        const index = await createPersonSearchIndex();

        // Convert persons to search summaries
        // Note: In a real app, you'd want to join with addresses/contacts/employments
        // For now, we just use the basic person data
        const summaries: PersonSummary[] = persons.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: undefined, // Would need to fetch from contacts
          city: undefined, // Would need to fetch from addresses
          companyName: undefined, // Would need to fetch from employments
        }));

        await addMultipleToIndex(index, summaries);

        setSearchIndex(index);
        lastDataHashRef.current = dataHash;
      } finally {
        setIsIndexBuilding(false);
      }
    }

    buildIndex();
  }, [persons, searchIndex]);

  // Perform search when debounced term changes
  useEffect(() => {
    async function performSearch() {
      if (!searchIndex) {
        setResults([]);
        return;
      }

      if (debouncedTerm.length < minSearchLength) {
        setResults([]);
        return;
      }

      const searchResults = await searchPersonsSimple(searchIndex, debouncedTerm, {
        limit: searchLimit,
        tolerance,
      });

      setResults(searchResults);
    }

    performSearch();
  }, [debouncedTerm, searchIndex, minSearchLength, searchLimit, tolerance]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isLoading: isPersonsLoading,
    isIndexBuilding,
    isReady: !!searchIndex && !isIndexBuilding,
    personCount: persons.length,
  };
}

// =============================================================================
// Person Detail Hooks (for related entities)
// =============================================================================

/**
 * Hook for accessing addresses of a specific person
 */
export function usePersonAddresses(personId: string) {
  const collection = useMemo(() => createAddressesCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addAddress = useCallback(
    (address: Omit<Address, 'id' | 'personId'>) => {
      const newAddress: Address = {
        ...address,
        id: crypto.randomUUID(),
        personId,
      };
      collection.insert(newAddress);
    },
    [collection, personId],
  );

  const updateAddress = useCallback(
    (addressId: string, changes: Partial<Address>) => {
      collection.update(addressId, (draft) => {
        Object.assign(draft, changes);
      });
    },
    [collection],
  );

  const deleteAddress = useCallback(
    (addressId: string) => {
      collection.delete(addressId);
    },
    [collection],
  );

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addAddress,
    updateAddress,
    deleteAddress,
  };
}

/**
 * Hook for accessing bank accounts of a specific person
 */
export function usePersonBankAccounts(personId: string) {
  const collection = useMemo(() => createBankAccountsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addBankAccount = useCallback(
    (account: Omit<BankAccount, 'id' | 'personId'>) => {
      const newAccount: BankAccount = {
        ...account,
        id: crypto.randomUUID(),
        personId,
      };
      collection.insert(newAccount);
    },
    [collection, personId],
  );

  const updateBankAccount = useCallback(
    (accountId: string, changes: Partial<BankAccount>) => {
      collection.update(accountId, (draft) => {
        Object.assign(draft, changes);
      });
    },
    [collection],
  );

  const deleteBankAccount = useCallback(
    (accountId: string) => {
      collection.delete(accountId);
    },
    [collection],
  );

  return {
    bankAccounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
  };
}

/**
 * Hook for accessing contacts of a specific person
 */
export function usePersonContacts(personId: string) {
  const collection = useMemo(() => createContactsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addContact = useCallback(
    (contact: Omit<ContactInfo, 'id' | 'personId'>) => {
      const newContact: ContactInfo = {
        ...contact,
        id: crypto.randomUUID(),
        personId,
      };
      collection.insert(newContact);
    },
    [collection, personId],
  );

  const updateContact = useCallback(
    (contactId: string, changes: Partial<ContactInfo>) => {
      collection.update(contactId, (draft) => {
        Object.assign(draft, changes);
      });
    },
    [collection],
  );

  const deleteContact = useCallback(
    (contactId: string) => {
      collection.delete(contactId);
    },
    [collection],
  );

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addContact,
    updateContact,
    deleteContact,
  };
}

/**
 * Hook for accessing employments of a specific person
 */
export function usePersonEmployments(personId: string) {
  const collection = useMemo(() => createEmploymentsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addEmployment = useCallback(
    (employment: Omit<Employment, 'id' | 'personId'>) => {
      const newEmployment: Employment = {
        ...employment,
        id: crypto.randomUUID(),
        personId,
      };
      collection.insert(newEmployment);
    },
    [collection, personId],
  );

  const updateEmployment = useCallback(
    (employmentId: string, changes: Partial<Employment>) => {
      collection.update(employmentId, (draft) => {
        Object.assign(draft, changes);
      });
    },
    [collection],
  );

  const deleteEmployment = useCallback(
    (employmentId: string) => {
      collection.delete(employmentId);
    },
    [collection],
  );

  return {
    employments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addEmployment,
    updateEmployment,
    deleteEmployment,
  };
}

// =============================================================================
// Combined Person Detail Hook
// =============================================================================

/**
 * Hook for accessing a person with all related entities
 */
export function usePersonDetail(personId: string) {
  const { persons, updatePerson, deletePerson } = usePersons();
  const person = useMemo(() => persons.find((p) => p.id === personId), [persons, personId]);

  const addresses = usePersonAddresses(personId);
  const bankAccounts = usePersonBankAccounts(personId);
  const contacts = usePersonContacts(personId);
  const employments = usePersonEmployments(personId);

  const isLoading =
    addresses.isLoading || bankAccounts.isLoading || contacts.isLoading || employments.isLoading;

  return {
    person,
    addresses: addresses.addresses,
    bankAccounts: bankAccounts.bankAccounts,
    contacts: contacts.contacts,
    employments: employments.employments,
    isLoading,
    // Person mutations
    updatePerson: (changes: Partial<Person>) => updatePerson(personId, changes),
    deletePerson: () => deletePerson(personId),
    // Address mutations
    addAddress: addresses.addAddress,
    updateAddress: addresses.updateAddress,
    deleteAddress: addresses.deleteAddress,
    // Bank account mutations
    addBankAccount: bankAccounts.addBankAccount,
    updateBankAccount: bankAccounts.updateBankAccount,
    deleteBankAccount: bankAccounts.deleteBankAccount,
    // Contact mutations
    addContact: contacts.addContact,
    updateContact: contacts.updateContact,
    deleteContact: contacts.deleteContact,
    // Employment mutations
    addEmployment: employments.addEmployment,
    updateEmployment: employments.updateEmployment,
    deleteEmployment: employments.deleteEmployment,
  };
}

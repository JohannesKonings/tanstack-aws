import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person';
import {
  addressesCollection,
  bankAccountsCollection,
  contactsCollection,
  employmentsCollection,
  personsCollection,
} from '#src/webapp/db-collections/persons';
// oxlint-disable no-magic-numbers
// oxlint-disable func-style
import { eq, useLiveQuery } from '@tanstack/react-db';

// =============================================================================
// Prefetch Person Entities Hook
// =============================================================================

/**
 * Hook to prefetch all person-related entity collections.
 * Call this after persons are loaded to ensure entity data is available
 * immediately when a user selects a person.
 *
 * This loads addresses, bank accounts, contacts, and employments in parallel.
 */
export function usePrefetchPersonEntities() {
  // Trigger loading of all entity collections
  const addressesQuery = useLiveQuery(addressesCollection);
  const bankAccountsQuery = useLiveQuery(bankAccountsCollection);
  const contactsQuery = useLiveQuery(contactsCollection);
  const employmentsQuery = useLiveQuery(employmentsCollection);

  return {
    isLoading:
      addressesQuery.isLoading ||
      bankAccountsQuery.isLoading ||
      contactsQuery.isLoading ||
      employmentsQuery.isLoading,
    isReady:
      !addressesQuery.isLoading &&
      !bankAccountsQuery.isLoading &&
      !contactsQuery.isLoading &&
      !employmentsQuery.isLoading,
  };
}

// =============================================================================
// Persons List Hook
// =============================================================================

/**
 * Hook for accessing and mutating the persons collection.
 * Also prefetches entity data for instant person detail loading.
 */
export function usePersons() {
  // Live query for all persons
  const query = useLiveQuery(personsCollection);

  // Prefetch entity data once persons start loading.
  // Loads addresses, bank accounts, contacts, and employments in parallel.
  // Data is ready when a user selects a person.
  const entitiesPrefetch = usePrefetchPersonEntities();

  // Mutation functions (React Compiler handles memoization)
  const addPerson = (person: Person) => {
    personsCollection.insert(person);
  };

  const updatePerson = (id: string, changes: Partial<Person>) => {
    personsCollection.update(id, (draft) => {
      Object.assign(draft, changes, { updatedAt: new Date().toISOString() });
    });
  };

  const deletePerson = (id: string) => {
    personsCollection.delete(id);
  };

  return {
    persons: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isEntitiesReady: entitiesPrefetch.isReady,
    addPerson,
    updatePerson,
    deletePerson,
  };
}

// =============================================================================
// Combined Person Detail Hook (Using TanStack DB Joins)
// =============================================================================

/**
 * Creates mutation functions for address operations
 */
function createAddressMutations(personId: string) {
  const addAddress = (address: Omit<Address, 'id' | 'personId'>) => {
    const newAddress: Address = {
      ...address,
      id: crypto.randomUUID(),
      personId,
    };
    addressesCollection.insert(newAddress);
  };

  const updateAddress = (addressId: string, changes: Partial<Address>) => {
    addressesCollection.update(addressId, (draft: Address) => {
      Object.assign(draft, changes);
    });
  };

  const deleteAddress = (addressId: string) => {
    addressesCollection.delete(addressId);
  };

  return { addAddress, updateAddress, deleteAddress };
}

/**
 * Creates mutation functions for bank account operations
 */
function createBankAccountMutations(personId: string) {
  const addBankAccount = (account: Omit<BankAccount, 'id' | 'personId'>) => {
    const newAccount: BankAccount = {
      ...account,
      id: crypto.randomUUID(),
      personId,
    };
    bankAccountsCollection.insert(newAccount);
  };

  const updateBankAccount = (accountId: string, changes: Partial<BankAccount>) => {
    bankAccountsCollection.update(accountId, (draft: BankAccount) => {
      Object.assign(draft, changes);
    });
  };

  const deleteBankAccount = (accountId: string) => {
    bankAccountsCollection.delete(accountId);
  };

  return { addBankAccount, updateBankAccount, deleteBankAccount };
}

/**
 * Creates mutation functions for contact operations
 */
function createContactMutations(personId: string) {
  const addContact = (contact: Omit<ContactInfo, 'id' | 'personId'>) => {
    const newContact: ContactInfo = {
      ...contact,
      id: crypto.randomUUID(),
      personId,
    };
    contactsCollection.insert(newContact);
  };

  const updateContact = (contactId: string, changes: Partial<ContactInfo>) => {
    contactsCollection.update(contactId, (draft: ContactInfo) => {
      Object.assign(draft, changes);
    });
  };

  const deleteContact = (contactId: string) => {
    contactsCollection.delete(contactId);
  };

  return { addContact, updateContact, deleteContact };
}

/**
 * Creates mutation functions for employment operations
 */
function createEmploymentMutations(personId: string) {
  const addEmployment = (employment: Omit<Employment, 'id' | 'personId'>) => {
    const newEmployment: Employment = {
      ...employment,
      id: crypto.randomUUID(),
      personId,
    };
    employmentsCollection.insert(newEmployment);
  };

  const updateEmployment = (employmentId: string, changes: Partial<Employment>) => {
    employmentsCollection.update(employmentId, (draft: Employment) => {
      Object.assign(draft, changes);
    });
  };

  const deleteEmployment = (employmentId: string) => {
    employmentsCollection.delete(employmentId);
  };

  return { addEmployment, updateEmployment, deleteEmployment };
}

/**
 * Hook for accessing a person with all related entities using global collections.
 *
 * Benefits over factory-based collections:
 * - All data loaded once at app startup
 * - Navigation between persons is instant (sub-millisecond)
 * - No network requests when switching between person details
 * - Differential dataflow updates only what changed
 */
export function usePersonDetail(personId: string) {
  // Query person by ID using eq() from global collection
  const personQuery = useLiveQuery(
    (query) =>
      query.from({ persons: personsCollection }).where(({ persons }) => eq(persons.id, personId)),
    [personId],
  );

  // Query addresses for this person from global collection
  const addressesQuery = useLiveQuery(
    (query) =>
      query
        .from({ addresses: addressesCollection })
        .where(({ addresses }) => eq(addresses.personId, personId)),
    [personId],
  );

  // Query bank accounts for this person from global collection
  const bankAccountsQuery = useLiveQuery(
    (query) =>
      query
        .from({ bankAccounts: bankAccountsCollection })
        .where(({ bankAccounts }) => eq(bankAccounts.personId, personId)),
    [personId],
  );

  // Query contacts for this person from global collection
  const contactsQuery = useLiveQuery(
    (query) =>
      query
        .from({ contacts: contactsCollection })
        .where(({ contacts }) => eq(contacts.personId, personId)),
    [personId],
  );

  // Query employments for this person from global collection
  const employmentsQuery = useLiveQuery(
    (query) =>
      query
        .from({ employments: employmentsCollection })
        .where(({ employments }) => eq(employments.personId, personId)),
    [personId],
  );

  const isLoading =
    personQuery.isLoading ||
    addressesQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    contactsQuery.isLoading ||
    employmentsQuery.isLoading;

  // Person mutations
  const updatePerson = (changes: Partial<Person>) => {
    personsCollection.update(personId, (draft) => {
      Object.assign(draft, changes, { updatedAt: new Date().toISOString() });
    });
  };

  const deletePerson = () => {
    personsCollection.delete(personId);
  };

  return {
    // Data - first person from query result (should be 0 or 1)
    person: personQuery.data?.[0],
    addresses: addressesQuery.data ?? [],
    bankAccounts: bankAccountsQuery.data ?? [],
    contacts: contactsQuery.data ?? [],
    employments: employmentsQuery.data ?? [],
    isLoading,
    // Person mutations
    updatePerson,
    deletePerson,
    // Related entity mutations
    ...createAddressMutations(personId),
    ...createBankAccountMutations(personId),
    ...createContactMutations(personId),
    ...createEmploymentMutations(personId),
  };
}

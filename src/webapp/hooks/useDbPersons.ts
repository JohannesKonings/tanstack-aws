import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person';
import {
  createAddressesCollection,
  createBankAccountsCollection,
  createContactsCollection,
  createEmploymentsCollection,
  personsCollection,
} from '#src/webapp/db-collections/persons';
// oxlint-disable no-magic-numbers
// oxlint-disable func-style
import { useLiveQuery } from '@tanstack/react-db';
import { useCallback, useMemo } from 'react';

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

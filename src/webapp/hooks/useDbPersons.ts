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
import { useMemo } from 'react';

// =============================================================================
// Persons List Hook
// =============================================================================

/**
 * Hook for accessing and mutating the persons collection
 */
export function usePersons() {
  // Live query for all persons
  const query = useLiveQuery(personsCollection);

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
function usePersonAddresses(personId: string) {
  const collection = useMemo(() => createAddressesCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addAddress = (address: Omit<Address, 'id' | 'personId'>) => {
    const newAddress: Address = {
      ...address,
      id: crypto.randomUUID(),
      personId,
    };
    collection.insert(newAddress);
  };

  const updateAddress = (addressId: string, changes: Partial<Address>) => {
    collection.update(addressId, (draft) => {
      Object.assign(draft, changes);
    });
  };

  const deleteAddress = (addressId: string) => {
    collection.delete(addressId);
  };

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addAddress,
    updateAddress,
    deleteAddress,
  };
}

/**
 * Hook for accessing bank accounts of a specific person
 */
function usePersonBankAccounts(personId: string) {
  const collection = useMemo(() => createBankAccountsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addBankAccount = (account: Omit<BankAccount, 'id' | 'personId'>) => {
    const newAccount: BankAccount = {
      ...account,
      id: crypto.randomUUID(),
      personId,
    };
    collection.insert(newAccount);
  };

  const updateBankAccount = (accountId: string, changes: Partial<BankAccount>) => {
    collection.update(accountId, (draft) => {
      Object.assign(draft, changes);
    });
  };

  const deleteBankAccount = (accountId: string) => {
    collection.delete(accountId);
  };

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
function usePersonContacts(personId: string) {
  const collection = useMemo(() => createContactsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addContact = (contact: Omit<ContactInfo, 'id' | 'personId'>) => {
    const newContact: ContactInfo = {
      ...contact,
      id: crypto.randomUUID(),
      personId,
    };
    collection.insert(newContact);
  };

  const updateContact = (contactId: string, changes: Partial<ContactInfo>) => {
    collection.update(contactId, (draft) => {
      Object.assign(draft, changes);
    });
  };

  const deleteContact = (contactId: string) => {
    collection.delete(contactId);
  };

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addContact,
    updateContact,
    deleteContact,
  };
}

/**
 * Hook for accessing employments of a specific person
 */
function usePersonEmployments(personId: string) {
  const collection = useMemo(() => createEmploymentsCollection(personId), [personId]);

  const query = useLiveQuery(collection);

  const addEmployment = (employment: Omit<Employment, 'id' | 'personId'>) => {
    const newEmployment: Employment = {
      ...employment,
      id: crypto.randomUUID(),
      personId,
    };
    collection.insert(newEmployment);
  };

  const updateEmployment = (employmentId: string, changes: Partial<Employment>) => {
    collection.update(employmentId, (draft) => {
      Object.assign(draft, changes);
    });
  };

  const deleteEmployment = (employmentId: string) => {
    collection.delete(employmentId);
  };

  return {
    employments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
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

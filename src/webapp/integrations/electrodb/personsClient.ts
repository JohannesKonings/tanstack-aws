/**
 * ElectroDB-based Persons Client
 *
 * Uses ElectroDB entities for type-safe DynamoDB operations.
 */

import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person.ts';
import {
  AddressEntity,
  BankAccountEntity,
  ContactInfoEntity,
  EmploymentEntity,
  PersonEntity,
} from '#src/webapp/integrations/electrodb/entities.ts';

// =============================================================================
// Types for All Data Response
// =============================================================================

// Note: AllEntitiesData types are removed as GSI2 (used for Orama search) is postponed.
// These will be added back when search functionality is implemented.

// =============================================================================
// Person Operations
// =============================================================================

/**
 * Get all persons using GSI1
 */
export const getAllPersons = async (): Promise<Person[]> => {
  const result = await PersonEntity.query.allPersons({}).go();
  return result.data.map((item) => ({
    id: item.id,
    firstName: item.firstName,
    lastName: item.lastName,
    dateOfBirth: item.dateOfBirth,
    gender: item.gender,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

/**
 * Create a new person
 */
export const createPerson = async (person: Person): Promise<Person> => {
  const result = await PersonEntity.put(person).go();
  return result.data as Person;
};

/**
 * Update a person
 * Uses put with merged data to ensure GSI1 composite keys are properly formatted
 */
export const updatePerson = async (personId: string, updates: Partial<Person>): Promise<Person> => {
  // First, get the current person to merge with updates
  const current = await PersonEntity.get({ id: personId }).go();
  if (!current.data) {
    throw new Error(`Person with id ${personId} not found`);
  }

  // Merge current data with updates and use put to replace the item
  const updatedPerson = {
    id: personId,
    firstName: updates.firstName ?? current.data.firstName,
    lastName: updates.lastName ?? current.data.lastName,
    dateOfBirth: updates.dateOfBirth ?? current.data.dateOfBirth,
    gender: updates.gender ?? current.data.gender,
    createdAt: current.data.createdAt,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  };

  const result = await PersonEntity.put(updatedPerson).go();
  return result.data as Person;
};

/**
 * Delete a person and all related entities
 */
export const deletePerson = async (personId: string): Promise<void> => {
  // Delete all related entities first
  const [addresses, bankAccounts, contacts, employments] = await Promise.all([
    AddressEntity.query.primary({ personId }).go(),
    BankAccountEntity.query.primary({ personId }).go(),
    ContactInfoEntity.query.primary({ personId }).go(),
    EmploymentEntity.query.primary({ personId }).go(),
  ]);

  // Delete all related items
  await Promise.all([
    ...addresses.data.map((addr) => AddressEntity.delete({ personId, id: addr.id }).go()),
    ...bankAccounts.data.map((bank) => BankAccountEntity.delete({ personId, id: bank.id }).go()),
    ...contacts.data.map((contact) => ContactInfoEntity.delete({ personId, id: contact.id }).go()),
    ...employments.data.map((emp) => EmploymentEntity.delete({ personId, id: emp.id }).go()),
    PersonEntity.delete({ id: personId }).go(),
  ]);
};

// =============================================================================
// Address Operations
// =============================================================================

/**
 * Get all addresses using GSI1 (allAddresses)
 * Uses partition key template 'ADDRESSES' for efficient querying
 */
export const getAllAddresses = async (): Promise<Address[]> => {
  const result = await AddressEntity.query.allAddresses({}).go();
  return result.data as Address[];
};

export const createAddress = async (address: Address): Promise<Address> => {
  const result = await AddressEntity.put(address).go();
  return result.data as Address;
};

export const updateAddress = async (address: Address): Promise<Address> => {
  const result = await AddressEntity.put(address).go();
  return result.data as Address;
};

export const deleteAddress = async (personId: string, addressId: string): Promise<void> => {
  await AddressEntity.delete({ personId, id: addressId }).go();
};

// =============================================================================
// BankAccount Operations
// =============================================================================

/**
 * Get all bank accounts using GSI1 (allBankAccounts)
 */
export const getAllBankAccounts = async (): Promise<BankAccount[]> => {
  const result = await BankAccountEntity.query.allBankAccounts({}).go();
  return result.data as BankAccount[];
};

export const createBankAccount = async (bankAccount: BankAccount): Promise<BankAccount> => {
  const result = await BankAccountEntity.put(bankAccount).go();
  return result.data as BankAccount;
};

export const updateBankAccount = async (bankAccount: BankAccount): Promise<BankAccount> => {
  const result = await BankAccountEntity.put(bankAccount).go();
  return result.data as BankAccount;
};

export const deleteBankAccount = async (personId: string, bankAccountId: string): Promise<void> => {
  await BankAccountEntity.delete({ personId, id: bankAccountId }).go();
};

// =============================================================================
// ContactInfo Operations
// =============================================================================

/**
 * Get all contacts using GSI1 (allContacts)
 */
export const getAllContacts = async (): Promise<ContactInfo[]> => {
  const result = await ContactInfoEntity.query.allContacts({}).go();
  return result.data as ContactInfo[];
};

export const createContact = async (contact: ContactInfo): Promise<ContactInfo> => {
  const result = await ContactInfoEntity.put(contact).go();
  return result.data as ContactInfo;
};

export const updateContact = async (contact: ContactInfo): Promise<ContactInfo> => {
  const result = await ContactInfoEntity.put(contact).go();
  return result.data as ContactInfo;
};

export const deleteContact = async (personId: string, contactId: string): Promise<void> => {
  await ContactInfoEntity.delete({ personId, id: contactId }).go();
};

// =============================================================================
// Employment Operations
// =============================================================================

// Helper to convert null to undefined for ElectroDB compatibility
const normalizeEmployment = (employment: Employment) => ({
  ...employment,
  endDate: employment.endDate ?? undefined,
});

/**
 * Get all employments using GSI1 (allEmployments)
 */
export const getAllEmployments = async (): Promise<Employment[]> => {
  const result = await EmploymentEntity.query.allEmployments({}).go();
  return result.data as Employment[];
};

export const createEmployment = async (employment: Employment): Promise<Employment> => {
  const result = await EmploymentEntity.put(normalizeEmployment(employment)).go();
  return result.data as Employment;
};

export const updateEmployment = async (employment: Employment): Promise<Employment> => {
  const result = await EmploymentEntity.put(normalizeEmployment(employment)).go();
  return result.data as Employment;
};

export const deleteEmployment = async (personId: string, employmentId: string): Promise<void> => {
  await EmploymentEntity.delete({ personId, id: employmentId }).go();
};

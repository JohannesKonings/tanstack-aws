/**
 * ElectroDB-based Persons Client
 *
 * Uses ElectroDB entities for type-safe DynamoDB operations.
 * Includes GSI2 query for fetching all entities (for Orama search).
 */

import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
  PersonWithRelations,
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

export interface AllEntitiesData {
  persons: Person[];
  addresses: Address[];
  bankAccounts: BankAccount[];
  contacts: ContactInfo[];
  employments: Employment[];
}

export interface PaginatedAllDataResponse {
  data: AllEntitiesData;
  cursor: string | null;
  hasMore: boolean;
}

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
 * Get a person by ID
 */
export const getPersonById = async (personId: string): Promise<Person | null> => {
  const result = await PersonEntity.get({ id: personId }).go();
  if (!result.data) {
    return null;
  }

  return {
    id: result.data.id,
    firstName: result.data.firstName,
    lastName: result.data.lastName,
    dateOfBirth: result.data.dateOfBirth,
    gender: result.data.gender,
    createdAt: result.data.createdAt,
    updatedAt: result.data.updatedAt,
  };
};

/**
 * Get a person with all related entities
 */
export const getPersonWithRelations = async (
  personId: string,
): Promise<PersonWithRelations | null> => {
  // Use ElectroDB collection query to get all entities for a person
  const [person, addresses, bankAccounts, contacts, employments] = await Promise.all([
    PersonEntity.get({ id: personId }).go(),
    AddressEntity.query.primary({ personId }).go(),
    BankAccountEntity.query.primary({ personId }).go(),
    ContactInfoEntity.query.primary({ personId }).go(),
    EmploymentEntity.query.primary({ personId }).go(),
  ]);

  if (!person.data) {
    return null;
  }

  return {
    id: person.data.id,
    firstName: person.data.firstName,
    lastName: person.data.lastName,
    dateOfBirth: person.data.dateOfBirth,
    gender: person.data.gender,
    createdAt: person.data.createdAt,
    updatedAt: person.data.updatedAt,
    addresses: addresses.data.map((addr) => ({
      id: addr.id,
      personId: addr.personId,
      type: addr.type,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isPrimary: addr.isPrimary ?? false,
    })),
    bankAccounts: bankAccounts.data.map((bank) => ({
      id: bank.id,
      personId: bank.personId,
      bankName: bank.bankName,
      accountType: bank.accountType,
      accountNumberLast4: bank.accountNumberLast4,
      iban: bank.iban,
      bic: bank.bic,
      isPrimary: bank.isPrimary ?? false,
    })),
    contacts: contacts.data.map((contact) => ({
      id: contact.id,
      personId: contact.personId,
      type: contact.type,
      value: contact.value,
      isPrimary: contact.isPrimary ?? false,
      isVerified: contact.isVerified ?? false,
    })),
    employments: employments.data.map((emp) => ({
      id: emp.id,
      personId: emp.personId,
      companyName: emp.companyName,
      position: emp.position,
      department: emp.department,
      startDate: emp.startDate,
      endDate: emp.endDate ?? null,
      isCurrent: emp.isCurrent ?? false,
      salary: emp.salary,
      currency: emp.currency ?? 'USD',
    })),
  };
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
 */
export const updatePerson = async (personId: string, updates: Partial<Person>): Promise<Person> => {
  const result = await PersonEntity.patch({ id: personId })
    .set(updates)
    .go({ response: 'all_new' });
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

export const getAddressesByPersonId = async (personId: string): Promise<Address[]> => {
  const result = await AddressEntity.query.primary({ personId }).go();
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

export const getBankAccountsByPersonId = async (personId: string): Promise<BankAccount[]> => {
  const result = await BankAccountEntity.query.primary({ personId }).go();
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

export const getContactsByPersonId = async (personId: string): Promise<ContactInfo[]> => {
  const result = await ContactInfoEntity.query.primary({ personId }).go();
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

export const getEmploymentsByPersonId = async (personId: string): Promise<Employment[]> => {
  const result = await EmploymentEntity.query.primary({ personId }).go();
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

// =============================================================================
// GSI2: Fetch All Entities for Orama Search (with Pagination)
// =============================================================================

const ITEMS_PER_PAGE = 1000;

/**
 * Fetch all entities from all entity types using GSI2.
 * Returns paginated results for loading into Orama search.
 *
 * @param cursor - The pagination cursor (LastEvaluatedKey as base64)
 * @returns Paginated response with all entity types
 */
export const getAllEntitiesForSearch = async (
  cursor?: string | null,
): Promise<PaginatedAllDataResponse> => {
  const data: AllEntitiesData = {
    persons: [],
    addresses: [],
    bankAccounts: [],
    contacts: [],
    employments: [],
  };

  // Query all entities using GSI2 via the Service
  // We need to query each entity type separately since they share the same GSI2
  const [personsResult, addressesResult, bankAccountsResult, contactsResult, employmentsResult] =
    await Promise.all([
      PersonEntity.query.allData({}).go({
        limit: ITEMS_PER_PAGE,
        cursor: cursor ?? undefined,
      }),
      AddressEntity.query.allData({}).go({
        limit: ITEMS_PER_PAGE,
        cursor: cursor ?? undefined,
      }),
      BankAccountEntity.query.allData({}).go({
        limit: ITEMS_PER_PAGE,
        cursor: cursor ?? undefined,
      }),
      ContactInfoEntity.query.allData({}).go({
        limit: ITEMS_PER_PAGE,
        cursor: cursor ?? undefined,
      }),
      EmploymentEntity.query.allData({}).go({
        limit: ITEMS_PER_PAGE,
        cursor: cursor ?? undefined,
      }),
    ]);

  // Map results to typed arrays
  data.persons = personsResult.data as Person[];
  data.addresses = addressesResult.data as Address[];
  data.bankAccounts = bankAccountsResult.data as BankAccount[];
  data.contacts = contactsResult.data as ContactInfo[];
  data.employments = employmentsResult.data as Employment[];

  // Determine if there's more data (any entity type has a cursor)
  const hasMore = Boolean(
    personsResult.cursor ||
    addressesResult.cursor ||
    bankAccountsResult.cursor ||
    contactsResult.cursor ||
    employmentsResult.cursor,
  );

  // Use the first available cursor for next page
  const nextCursor =
    personsResult.cursor ||
    addressesResult.cursor ||
    bankAccountsResult.cursor ||
    contactsResult.cursor ||
    employmentsResult.cursor ||
    null;

  return {
    data,
    cursor: nextCursor,
    hasMore,
  };
};

/**
 * Fetch ALL entities for Orama (iterates through all pages)
 * Use with caution - for initial load only, consider streaming for large datasets
 */
export const getAllEntitiesComplete = async (): Promise<AllEntitiesData> => {
  const allData: AllEntitiesData = {
    persons: [],
    addresses: [],
    bankAccounts: [],
    contacts: [],
    employments: [],
  };

  const fetchAllPages = async (currentCursor: string | null): Promise<void> => {
    const { data, cursor: nextCursor, hasMore } = await getAllEntitiesForSearch(currentCursor);
    allData.persons.push(...data.persons);
    allData.addresses.push(...data.addresses);
    allData.bankAccounts.push(...data.bankAccounts);
    allData.contacts.push(...data.contacts);
    allData.employments.push(...data.employments);

    if (hasMore && nextCursor) {
      await fetchAllPages(nextCursor);
    }
  };

  await fetchAllPages(null);

  return allData;
};

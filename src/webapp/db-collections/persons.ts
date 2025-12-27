import * as electrodbClient from '#src/webapp/integrations/electrodb/personsClient';
import { getContext } from '#src/webapp/integrations/tanstack-query/root-provider';
import {
  type Address,
  AddressSchema,
  type BankAccount,
  BankAccountSchema,
  type ContactInfo,
  ContactInfoSchema,
  type Employment,
  EmploymentSchema,
  type Person,
  PersonSchema,
} from '#src/webapp/types/person';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { createCollection } from '@tanstack/react-db';
import { createServerFn } from '@tanstack/react-start';

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Get all persons (profile only)
 */
export const fetchPersons = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllPersons(),
);

/**
 * Get a person with all related entities
 */
export const fetchPersonWithRelations = createServerFn({ method: 'GET' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.getPersonWithRelations(personId));

/**
 * Create a new person
 */
export const createPersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Person) => PersonSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createPerson(data));

/**
 * Update a person
 */
export const updatePersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; updates: Partial<Person> }) => input)
  .handler(async ({ data }) => electrodbClient.updatePerson(data.personId, data.updates));

/**
 * Delete a person
 */
export const deletePersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.deletePerson(personId));

// --- Address Server Functions ---

export const fetchAddresses = createServerFn({ method: 'GET' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.getAddressesByPersonId(personId));

export const createAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Address) => AddressSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createAddress(data));

export const updateAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Address) => AddressSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateAddress(data));

export const deleteAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; addressId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteAddress(data.personId, data.addressId));

// --- BankAccount Server Functions ---

export const fetchBankAccounts = createServerFn({ method: 'GET' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.getBankAccountsByPersonId(personId));

export const createBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: BankAccount) => BankAccountSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createBankAccount(data));

export const updateBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: BankAccount) => BankAccountSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateBankAccount(data));

export const deleteBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; bankId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteBankAccount(data.personId, data.bankId));

// --- ContactInfo Server Functions ---

export const fetchContacts = createServerFn({ method: 'GET' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.getContactsByPersonId(personId));

export const createContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ContactInfo) => ContactInfoSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createContact(data));

export const updateContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ContactInfo) => ContactInfoSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateContact(data));

export const deleteContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; contactId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteContact(data.personId, data.contactId));

// --- Employment Server Functions ---

export const fetchEmployments = createServerFn({ method: 'GET' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.getEmploymentsByPersonId(personId));

export const createEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Employment) => EmploymentSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createEmployment(data));

export const updateEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Employment) => EmploymentSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateEmployment(data));

export const deleteEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; employmentId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteEmployment(data.personId, data.employmentId));

// =============================================================================
// TanStack DB Collections
// =============================================================================

/**
 * Persons Collection - Main collection for person profiles
 */
export const personsCollection = createCollection(
  queryCollectionOptions<Person>({
    queryKey: ['persons'],
    queryFn: () => fetchPersons(),
    queryClient: getContext().queryClient,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) =>
          createPersonFn({ data: mutation.modified as Person }),
        ),
      );
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) =>
          updatePersonFn({
            data: {
              personId: mutation.key as string,
              updates: mutation.changes as Partial<Person>,
            },
          }),
        ),
      );
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) => deletePersonFn({ data: mutation.key as string })),
      );
    },
  }),
);

/**
 * Create a collection for addresses of a specific person
 * This is a factory function since we need personId context
 */
export const createAddressesCollection = (personId: string) =>
  createCollection(
    queryCollectionOptions<Address>({
      queryKey: ['persons', personId, 'addresses'],
      queryFn: () => fetchAddresses({ data: personId }),
      queryClient: getContext().queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            createAddressFn({ data: mutation.modified as Address }),
          ),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            updateAddressFn({ data: mutation.modified as Address }),
          ),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            deleteAddressFn({
              data: { personId, addressId: mutation.key as string },
            }),
          ),
        );
      },
    }),
  );

/**
 * Create a collection for bank accounts of a specific person
 */
export const createBankAccountsCollection = (personId: string) =>
  createCollection(
    queryCollectionOptions<BankAccount>({
      queryKey: ['persons', personId, 'bankAccounts'],
      queryFn: () => fetchBankAccounts({ data: personId }),
      queryClient: getContext().queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            createBankAccountFn({ data: mutation.modified as BankAccount }),
          ),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            updateBankAccountFn({ data: mutation.modified as BankAccount }),
          ),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            deleteBankAccountFn({
              data: { personId, bankId: mutation.key as string },
            }),
          ),
        );
      },
    }),
  );

/**
 * Create a collection for contacts of a specific person
 */
export const createContactsCollection = (personId: string) =>
  createCollection(
    queryCollectionOptions<ContactInfo>({
      queryKey: ['persons', personId, 'contacts'],
      queryFn: () => fetchContacts({ data: personId }),
      queryClient: getContext().queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            createContactFn({ data: mutation.modified as ContactInfo }),
          ),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            updateContactFn({ data: mutation.modified as ContactInfo }),
          ),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            deleteContactFn({
              data: { personId, contactId: mutation.key as string },
            }),
          ),
        );
      },
    }),
  );

/**
 * Create a collection for employments of a specific person
 */
export const createEmploymentsCollection = (personId: string) =>
  createCollection(
    queryCollectionOptions<Employment>({
      queryKey: ['persons', personId, 'employments'],
      queryFn: () => fetchEmployments({ data: personId }),
      queryClient: getContext().queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            createEmploymentFn({ data: mutation.modified as Employment }),
          ),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            updateEmploymentFn({ data: mutation.modified as Employment }),
          ),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) =>
            deleteEmploymentFn({
              data: { personId, employmentId: mutation.key as string },
            }),
          ),
        );
      },
    }),
  );

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
const fetchPersons = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllPersons(),
);

/**
 * Get all addresses (global)
 */
const fetchAllAddresses = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllAddresses(),
);

/**
 * Get all bank accounts (global)
 */
const fetchAllBankAccounts = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllBankAccounts(),
);

/**
 * Get all contacts (global)
 */
const fetchAllContacts = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllContacts(),
);

/**
 * Get all employments (global)
 */
const fetchAllEmployments = createServerFn({ method: 'GET' }).handler(async () =>
  electrodbClient.getAllEmployments(),
);

/**
 * Create a new person
 */
const createPersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Person) => PersonSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createPerson(data));

/**
 * Update a person
 */
const updatePersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; updates: Partial<Person> }) => input)
  .handler(async ({ data }) => electrodbClient.updatePerson(data.personId, data.updates));

/**
 * Delete a person
 */
const deletePersonFn = createServerFn({ method: 'POST' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: personId }) => electrodbClient.deletePerson(personId));

// --- Address Server Functions ---

const createAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Address) => AddressSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createAddress(data));

const updateAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Address) => AddressSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateAddress(data));

const deleteAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; addressId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteAddress(data.personId, data.addressId));

// --- BankAccount Server Functions ---

const createBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: BankAccount) => BankAccountSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createBankAccount(data));

const updateBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: BankAccount) => BankAccountSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateBankAccount(data));

const deleteBankAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; bankId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteBankAccount(data.personId, data.bankId));

// --- ContactInfo Server Functions ---

const createContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ContactInfo) => ContactInfoSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createContact(data));

const updateContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ContactInfo) => ContactInfoSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateContact(data));

const deleteContactFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; contactId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteContact(data.personId, data.contactId));

// --- Employment Server Functions ---

const createEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Employment) => EmploymentSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.createEmployment(data));

const updateEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Employment) => EmploymentSchema.parse(input))
  .handler(async ({ data }) => electrodbClient.updateEmployment(data));

const deleteEmploymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { personId: string; employmentId: string }) => input)
  .handler(async ({ data }) => electrodbClient.deleteEmployment(data.personId, data.employmentId));

// =============================================================================
// TanStack DB Collections
// =============================================================================

/**
 * Persons Collection - Main collection for person profiles
 *
 * Uses eager sync mode (default) - all persons loaded upfront.
 * Good for datasets < 10k rows.
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
 * Global Addresses Collection
 *
 * All addresses loaded once, joined client-side with persons.
 * Enables instant navigation between person details without network calls.
 */
export const addressesCollection = createCollection(
  queryCollectionOptions<Address>({
    queryKey: ['addresses'],
    queryFn: () => fetchAllAddresses(),
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
        transaction.mutations.map((mutation) => {
          const address = mutation.modified as Address;
          return deleteAddressFn({
            data: { personId: address.personId, addressId: mutation.key as string },
          });
        }),
      );
    },
  }),
);

/**
 * Global Bank Accounts Collection
 */
export const bankAccountsCollection = createCollection(
  queryCollectionOptions<BankAccount>({
    queryKey: ['bankAccounts'],
    queryFn: () => fetchAllBankAccounts(),
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
        transaction.mutations.map((mutation) => {
          const account = mutation.modified as BankAccount;
          return deleteBankAccountFn({
            data: { personId: account.personId, bankId: mutation.key as string },
          });
        }),
      );
    },
  }),
);

/**
 * Global Contacts Collection
 */
export const contactsCollection = createCollection(
  queryCollectionOptions<ContactInfo>({
    queryKey: ['contacts'],
    queryFn: () => fetchAllContacts(),
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
        transaction.mutations.map((mutation) => {
          const contact = mutation.modified as ContactInfo;
          return deleteContactFn({
            data: { personId: contact.personId, contactId: mutation.key as string },
          });
        }),
      );
    },
  }),
);

/**
 * Global Employments Collection
 */
export const employmentsCollection = createCollection(
  queryCollectionOptions<Employment>({
    queryKey: ['employments'],
    queryFn: () => fetchAllEmployments(),
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
        transaction.mutations.map((mutation) => {
          const employment = mutation.modified as Employment;
          return deleteEmploymentFn({
            data: { personId: employment.personId, employmentId: mutation.key as string },
          });
        }),
      );
    },
  }),
);

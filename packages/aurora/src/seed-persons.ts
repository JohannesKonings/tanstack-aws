import type { RDSDataClient } from '@aws-sdk/client-rds-data';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { addresses, bankAccounts, contacts, employments, persons } from './person-schema.ts';
import { STAGE_DATABASE_SCHEMA } from './stage-database-name.ts';

export const SEED_PERSON_COUNT = 100;

const BATCH_SIZE = 20;

const FIRST_NAMES = [
  'Ada',
  'Alan',
  'Grace',
  'Katherine',
  'Margaret',
  'Radia',
  'Barbara',
  'Frances',
  'Dorothy',
  'Jean',
] as const;

const LAST_NAMES = [
  'Lovelace',
  'Turing',
  'Hopper',
  'Johnson',
  'Hamilton',
  'Perlman',
  'Liskov',
  'Allen',
  'Vaughan',
  'Sammet',
] as const;

const GENDERS = ['female', 'male', 'other', 'prefer_not_to_say'] as const;

const PLACES = [
  { city: 'London', country: 'United Kingdom', postalCode: 'SW1A 1AA', state: 'England' },
  { city: 'Berlin', country: 'Germany', postalCode: '10115', state: 'Berlin' },
  { city: 'Paris', country: 'France', postalCode: '75001', state: 'Île-de-France' },
  { city: 'Amsterdam', country: 'Netherlands', postalCode: '1012 JS', state: 'North Holland' },
  { city: 'Stockholm', country: 'Sweden', postalCode: '111 29', state: 'Stockholm' },
] as const;

const STREET_NAMES = [
  'Analytical Engine Road',
  'Bletchley Avenue',
  'Compiler Street',
  'Packet Lane',
  'Protocol Square',
] as const;

const ADDRESS_TYPES = ['home', 'work', 'billing', 'shipping'] as const;

const CONTACT_TYPES = ['phone', 'mobile', 'linkedin', 'twitter'] as const;

const BANKS = ['Harbor Savings', 'Northwind Capital', 'Fidelity Trust'] as const;

const ACCOUNT_TYPES = ['checking', 'savings', 'investment'] as const;

const COMPANIES = [
  'Analytical Engines',
  'Bletchley Systems',
  'Compiler Works',
  'Packet Foundry',
] as const;

const POSITIONS = ['Mathematician', 'Engineer', 'Researcher', 'Director'] as const;

const DEPARTMENTS = ['Research', 'Platform', 'Finance', 'Operations'] as const;

const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;

type Gender = (typeof GENDERS)[number];
type AddressType = (typeof ADDRESS_TYPES)[number];
type ContactType = 'email' | (typeof CONTACT_TYPES)[number];
type AccountType = (typeof ACCOUNT_TYPES)[number];

export type SeedPerson = {
  createdAt: string;
  dateOfBirth: string;
  firstName: string;
  gender: Gender;
  id: string;
  lastName: string;
  updatedAt: string;
};

export type SeedAddress = {
  city: string;
  country: string;
  id: string;
  isPrimary: boolean;
  personId: string;
  postalCode: string;
  state: string;
  street: string;
  type: AddressType;
};

export type SeedBankAccount = {
  accountNumberLast4: string;
  accountType: AccountType;
  bankName: string;
  bic: string;
  iban: string;
  id: string;
  isPrimary: boolean;
  personId: string;
};

export type SeedContact = {
  id: string;
  isPrimary: boolean;
  isVerified: boolean;
  personId: string;
  type: ContactType;
  value: string;
};

export type SeedEmployment = {
  companyName: string;
  currency: string;
  department: string;
  endDate: string | null;
  id: string;
  isCurrent: boolean;
  personId: string;
  position: string;
  salary: number;
  startDate: string;
};

export type SeedPersonGraph = {
  addresses: SeedAddress[];
  bankAccounts: SeedBankAccount[];
  contacts: SeedContact[];
  employments: SeedEmployment[];
  persons: SeedPerson[];
};

export type SeedStageDatabaseInput = {
  client: RDSDataClient;
  clusterArn: string;
  count?: number;
  secretArn: string;
  stageDatabaseName: string;
};

export type SeedStageDatabaseResult = {
  addresses: number;
  bankAccounts: number;
  contacts: number;
  employments: number;
  persons: number;
};

const seedId = (group: number, index: number): string => {
  const suffix = (group * 1_000_000 + index).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
};

const isoDate = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month - 1, day)).toISOString();

const pick = <T>(values: readonly T[], index: number): T => {
  const value = values[index % values.length];
  if (value === undefined) {
    throw new Error('Cannot pick from an empty list.');
  }
  return value;
};

const enumValue = (value: string, enumName: string) =>
  sql`${value}::${sql.raw(`"${STAGE_DATABASE_SCHEMA}"."${enumName}"`)}`;

const contactValue = (
  type: ContactType,
  firstName: string,
  lastName: string,
  personIndex: number,
): string => {
  const slug = `${firstName}.${lastName}.${personIndex}`.toLowerCase();
  if (type === 'email') {
    return `${slug}@example.com`;
  }
  if (type === 'phone') {
    return `+1-555-${String(1000 + personIndex).padStart(4, '0')}`;
  }
  if (type === 'mobile') {
    return `+1-555-${String(2000 + personIndex).padStart(4, '0')}`;
  }
  if (type === 'linkedin') {
    return `linkedin.com/in/${slug.replaceAll('.', '-')}`;
  }
  return `@${slug.replaceAll('.', '')}`;
};

const addressesFor = (
  personId: string,
  personIndex: number,
  nextId: () => string,
): SeedAddress[] => {
  const count = 1 + (personIndex % 3);
  return Array.from({ length: count }, (_, offset) => {
    const place = pick(PLACES, personIndex + offset);
    return {
      city: place.city,
      country: place.country,
      id: nextId(),
      isPrimary: offset === 0,
      personId,
      postalCode: place.postalCode,
      state: place.state,
      street: `${12 + personIndex + offset} ${pick(STREET_NAMES, personIndex + offset)}`,
      type: offset === 0 ? 'home' : pick(ADDRESS_TYPES, offset),
    };
  });
};

const bankAccountsFor = (
  personId: string,
  personIndex: number,
  nextId: () => string,
): SeedBankAccount[] => {
  const count = 1 + (personIndex % 2);
  return Array.from({ length: count }, (_, offset) => ({
    accountNumberLast4: String(1000 + personIndex + offset).slice(-4),
    accountType: pick(ACCOUNT_TYPES, personIndex + offset),
    bankName: pick(BANKS, personIndex + offset),
    bic: `SEED${String(personIndex + offset).padStart(4, '0')}`,
    iban: `GB00SEED0000000000${String(personIndex + offset).padStart(4, '0')}`,
    id: nextId(),
    isPrimary: offset === 0,
    personId,
  }));
};

const contactsFor = (
  personId: string,
  personIndex: number,
  nextId: () => string,
): SeedContact[] => {
  const firstName = pick(FIRST_NAMES, personIndex);
  const lastName = pick(LAST_NAMES, Math.floor(personIndex / FIRST_NAMES.length));
  const count = 2 + (personIndex % 3);
  return Array.from({ length: count }, (_, offset) => {
    const type = offset === 0 ? 'email' : pick(CONTACT_TYPES, offset - 1);
    return {
      id: nextId(),
      isPrimary: offset === 0,
      isVerified: offset === 0 || personIndex % 2 === 0,
      personId,
      type,
      value: contactValue(type, firstName, lastName, personIndex),
    };
  });
};

const employmentsFor = (
  personId: string,
  personIndex: number,
  nextId: () => string,
): SeedEmployment[] => {
  const count = 1 + (personIndex % 3);
  return Array.from({ length: count }, (_, offset) => {
    const isCurrent = offset === 0;
    const startYear = isCurrent ? 2018 + (personIndex % 5) : 2004 + ((personIndex + offset) % 8);
    return {
      companyName: pick(COMPANIES, personIndex + offset),
      currency: pick(CURRENCIES, personIndex),
      department: pick(DEPARTMENTS, personIndex + offset),
      endDate: isCurrent ? null : isoDate(startYear + 3, 9, 1),
      id: nextId(),
      isCurrent,
      personId,
      position: pick(POSITIONS, personIndex + offset),
      salary: 45_000 + ((personIndex + offset) % 20) * 5_000,
      startDate: isoDate(startYear, isCurrent ? 3 : 4, 1),
    };
  });
};

/** Deterministic persons plus addresses, contacts, bank accounts, and employments. */
export const buildSeedPersons = (
  count: number,
  writtenAt: string = new Date().toISOString(),
): SeedPersonGraph => {
  let sequence = 0;
  const nextId = (group: number) => () => seedId(group, sequence++);
  const nextPersonId = nextId(1);
  const nextAddressId = nextId(2);
  const nextBankAccountId = nextId(3);
  const nextContactId = nextId(4);
  const nextEmploymentId = nextId(5);
  const graph: SeedPersonGraph = {
    addresses: [],
    bankAccounts: [],
    contacts: [],
    employments: [],
    persons: [],
  };

  for (let index = 0; index < count; index++) {
    const personId = nextPersonId();
    graph.persons.push({
      createdAt: writtenAt,
      dateOfBirth: isoDate(1950 + (index % 40), (index % 12) + 1, (index % 28) + 1),
      firstName: pick(FIRST_NAMES, index),
      gender: pick(GENDERS, index),
      id: personId,
      lastName: pick(LAST_NAMES, Math.floor(index / FIRST_NAMES.length)),
      updatedAt: writtenAt,
    });
    graph.addresses.push(...addressesFor(personId, index, nextAddressId));
    graph.bankAccounts.push(...bankAccountsFor(personId, index, nextBankAccountId));
    graph.contacts.push(...contactsFor(personId, index, nextContactId));
    graph.employments.push(...employmentsFor(personId, index, nextEmploymentId));
  }

  return graph;
};

const idsOf = (rows: readonly { id: string }[]): ReadonlySet<string> =>
  new Set(rows.map((row) => row.id));

const belongingTo = <T extends { personId: string }>(
  rows: readonly T[],
  personIds: ReadonlySet<string>,
): T[] => rows.filter((row) => personIds.has(row.personId));

export const seedStageDatabase = async (
  input: SeedStageDatabaseInput,
): Promise<SeedStageDatabaseResult> => {
  const graph = buildSeedPersons(input.count ?? SEED_PERSON_COUNT);
  const db = drizzle({
    client: input.client,
    database: input.stageDatabaseName,
    resourceArn: input.clusterArn,
    secretArn: input.secretArn,
  });

  await db.transaction(async (tx) => {
    for (let offset = 0; offset < graph.persons.length; offset += BATCH_SIZE) {
      const personRows = graph.persons.slice(offset, offset + BATCH_SIZE);
      const personIds = idsOf(personRows);
      // oxlint-disable-next-line no-await-in-loop -- each batch must land before the next statement
      await tx
        .insert(persons)
        .values(
          personRows.map((person) => ({
            createdAt: person.createdAt,
            dateOfBirth: person.dateOfBirth,
            firstName: person.firstName,
            gender: enumValue(person.gender, 'gender'),
            id: person.id,
            lastName: person.lastName,
            updatedAt: person.updatedAt,
          })),
        )
        .onConflictDoNothing();
      // oxlint-disable-next-line no-await-in-loop -- child rows follow their persons inside the transaction
      await tx
        .insert(addresses)
        .values(
          belongingTo(graph.addresses, personIds).map((address) => ({
            city: address.city,
            country: address.country,
            id: address.id,
            isPrimary: address.isPrimary,
            personId: address.personId,
            postalCode: address.postalCode,
            state: address.state,
            street: address.street,
            type: enumValue(address.type, 'address_type'),
          })),
        )
        .onConflictDoNothing();
      // oxlint-disable-next-line no-await-in-loop -- child rows follow their persons inside the transaction
      await tx
        .insert(bankAccounts)
        .values(
          belongingTo(graph.bankAccounts, personIds).map((account) => ({
            accountNumberLast4: account.accountNumberLast4,
            accountType: enumValue(account.accountType, 'account_type'),
            bankName: account.bankName,
            bic: account.bic,
            iban: account.iban,
            id: account.id,
            isPrimary: account.isPrimary,
            personId: account.personId,
          })),
        )
        .onConflictDoNothing();
      // oxlint-disable-next-line no-await-in-loop -- child rows follow their persons inside the transaction
      await tx
        .insert(contacts)
        .values(
          belongingTo(graph.contacts, personIds).map((contact) => ({
            id: contact.id,
            isPrimary: contact.isPrimary,
            isVerified: contact.isVerified,
            personId: contact.personId,
            type: enumValue(contact.type, 'contact_type'),
            value: contact.value,
          })),
        )
        .onConflictDoNothing();
      // oxlint-disable-next-line no-await-in-loop -- child rows follow their persons inside the transaction
      await tx
        .insert(employments)
        .values(
          belongingTo(graph.employments, personIds).map((employment) => ({
            companyName: employment.companyName,
            currency: employment.currency,
            department: employment.department,
            endDate: employment.endDate,
            id: employment.id,
            isCurrent: employment.isCurrent,
            personId: employment.personId,
            position: employment.position,
            salary: employment.salary,
            startDate: employment.startDate,
          })),
        )
        .onConflictDoNothing();
    }
  });

  return {
    addresses: graph.addresses.length,
    bankAccounts: graph.bankAccounts.length,
    contacts: graph.contacts.length,
    employments: graph.employments.length,
    persons: graph.persons.length,
  };
};

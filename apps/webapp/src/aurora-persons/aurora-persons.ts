import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import {
  addresses,
  addressPageSchema,
  bankAccountPageSchema,
  bankAccounts,
  contactPageSchema,
  contacts,
  employmentPageSchema,
  employments,
  personPageSchema,
  persons,
  readAuroraSettings,
  STAGE_DATABASE_SCHEMA,
} from '@tanstack-aws/aurora';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import type { z } from 'zod';

export type StageDatabaseQueryClient = {
  send: (command: ExecuteStatementCommand) => Promise<ExecuteStatementCommandOutput>;
};

/**
 * Drizzle's Data API driver types its client as `RDSDataClient`. Callers pass a
 * narrower sender so tests can record SQL without calling AWS. The instance is
 * still an RDSDataClient; only `send` is delegated.
 */
const dataApiClient = (client: StageDatabaseQueryClient): RDSDataClient =>
  Object.assign(new RDSDataClient({}), {
    send: (command: ExecuteStatementCommand) => client.send(command),
  });

const stageDatabase = (client: StageDatabaseQueryClient, env: NodeJS.ProcessEnv) => {
  const settings = readAuroraSettings(env);
  return drizzle({
    client: dataApiClient(client),
    database: settings.databaseName,
    resourceArn: settings.clusterArn,
    secretArn: settings.secretArn,
  });
};

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
};

const writtenAt = () => new Date().toISOString();

type AuroraGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type AuroraPersonInput = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: AuroraGender | null;
};

type AuroraAddressType = 'home' | 'work' | 'billing' | 'shipping';

export type AuroraAddressInput = {
  id: string;
  personId: string;
  type: AuroraAddressType;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
};

type AuroraContactType = 'email' | 'phone' | 'mobile' | 'linkedin' | 'twitter';

export type AuroraContactInput = {
  id: string;
  personId: string;
  type: AuroraContactType;
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
};

type AuroraAccountType = 'checking' | 'savings' | 'investment';

export type AuroraBankAccountInput = {
  id: string;
  personId: string;
  bankName: string;
  accountType: AuroraAccountType;
  accountNumberLast4: string;
  iban?: string | null;
  bic?: string | null;
  isPrimary: boolean;
};

export type AuroraEmploymentInput = {
  id: string;
  personId: string;
  companyName: string;
  position: string;
  department?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  salary?: number | null;
  currency: string;
};

/**
 * Person enums live in schema `default`. Each Data API call is its own session,
 * so a cast has to name that schema instead of relying on search_path.
 */
const enumValue = (value: string | null, enumName: string) =>
  sql`${value}::${sql.raw(`"${STAGE_DATABASE_SCHEMA}"."${enumName}"`)}`;

type PageColumnSelection<TSchema extends z.ZodType> = {
  [K in keyof z.infer<TSchema>]: unknown;
};

export const readAuroraPersons = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
) => {
  const db = stageDatabase(client, env);

  const personColumns = {
    id: persons.id,
    firstName: persons.firstName,
    lastName: persons.lastName,
    gender: persons.gender,
    dateOfBirth: persons.dateOfBirth,
  } satisfies PageColumnSelection<typeof personPageSchema>;
  const addressColumns = {
    id: addresses.id,
    personId: addresses.personId,
    type: addresses.type,
    isPrimary: addresses.isPrimary,
    street: addresses.street,
    city: addresses.city,
    state: addresses.state,
    postalCode: addresses.postalCode,
    country: addresses.country,
  } satisfies PageColumnSelection<typeof addressPageSchema>;
  const bankAccountColumns = {
    id: bankAccounts.id,
    personId: bankAccounts.personId,
    bankName: bankAccounts.bankName,
    isPrimary: bankAccounts.isPrimary,
    accountType: bankAccounts.accountType,
    accountNumberLast4: bankAccounts.accountNumberLast4,
    iban: bankAccounts.iban,
    bic: bankAccounts.bic,
  } satisfies PageColumnSelection<typeof bankAccountPageSchema>;
  const contactColumns = {
    id: contacts.id,
    personId: contacts.personId,
    type: contacts.type,
    isPrimary: contacts.isPrimary,
    isVerified: contacts.isVerified,
    value: contacts.value,
  } satisfies PageColumnSelection<typeof contactPageSchema>;
  const employmentColumns = {
    id: employments.id,
    personId: employments.personId,
    position: employments.position,
    isCurrent: employments.isCurrent,
    companyName: employments.companyName,
    department: employments.department,
    startDate: employments.startDate,
    endDate: employments.endDate,
    salary: employments.salary,
    currency: employments.currency,
  } satisfies PageColumnSelection<typeof employmentPageSchema>;

  const [personRows, addressRows, bankAccountRows, contactRows, employmentRows] = await Promise.all(
    [
      db.select(personColumns).from(persons),
      db.select(addressColumns).from(addresses),
      db.select(bankAccountColumns).from(bankAccounts),
      db.select(contactColumns).from(contacts),
      db.select(employmentColumns).from(employments),
    ],
  );

  return {
    addresses: addressRows,
    bankAccounts: bankAccountRows,
    contacts: contactRows,
    employments: employmentRows,
    persons: personRows,
  };
};

export const createAuroraPerson = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  person: AuroraPersonInput,
) => {
  const db = stageDatabase(client, env);
  const timestamp = writtenAt();
  await db.insert(persons).values({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    dateOfBirth: blankToNull(person.dateOfBirth),
    gender: enumValue(person.gender ?? null, 'gender'),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
};

export const updateAuroraPerson = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  person: AuroraPersonInput,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(persons)
    .set({
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: blankToNull(person.dateOfBirth),
      gender: enumValue(person.gender ?? null, 'gender'),
      updatedAt: writtenAt(),
    })
    .where(eq(persons.id, person.id));
};

export const deleteAuroraPerson = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  personId: string,
) => {
  const db = stageDatabase(client, env);
  await db.delete(addresses).where(eq(addresses.personId, personId));
  await db.delete(contacts).where(eq(contacts.personId, personId));
  await db.delete(bankAccounts).where(eq(bankAccounts.personId, personId));
  await db.delete(employments).where(eq(employments.personId, personId));
  await db.delete(persons).where(eq(persons.id, personId));
};

export const createAuroraAddress = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  address: AuroraAddressInput,
) => {
  const db = stageDatabase(client, env);
  await db.insert(addresses).values({
    id: address.id,
    personId: address.personId,
    type: enumValue(address.type, 'address_type'),
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isPrimary: address.isPrimary,
  });
};

export const updateAuroraAddress = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  address: AuroraAddressInput,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(addresses)
    .set({
      type: enumValue(address.type, 'address_type'),
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isPrimary: address.isPrimary,
    })
    .where(eq(addresses.id, address.id));
};

export const deleteAuroraAddress = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  addressId: string,
) => {
  const db = stageDatabase(client, env);
  await db.delete(addresses).where(eq(addresses.id, addressId));
};

export const createAuroraContact = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  contact: AuroraContactInput,
) => {
  const db = stageDatabase(client, env);
  await db.insert(contacts).values({
    id: contact.id,
    personId: contact.personId,
    type: enumValue(contact.type, 'contact_type'),
    value: contact.value,
    isPrimary: contact.isPrimary,
    isVerified: contact.isVerified,
  });
};

export const updateAuroraContact = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  contact: AuroraContactInput,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(contacts)
    .set({
      type: enumValue(contact.type, 'contact_type'),
      value: contact.value,
      isPrimary: contact.isPrimary,
      isVerified: contact.isVerified,
    })
    .where(eq(contacts.id, contact.id));
};

export const deleteAuroraContact = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  contactId: string,
) => {
  const db = stageDatabase(client, env);
  await db.delete(contacts).where(eq(contacts.id, contactId));
};

export const createAuroraBankAccount = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  bankAccount: AuroraBankAccountInput,
) => {
  const db = stageDatabase(client, env);
  await db.insert(bankAccounts).values({
    id: bankAccount.id,
    personId: bankAccount.personId,
    bankName: bankAccount.bankName,
    accountType: enumValue(bankAccount.accountType, 'account_type'),
    accountNumberLast4: bankAccount.accountNumberLast4,
    iban: blankToNull(bankAccount.iban),
    bic: blankToNull(bankAccount.bic),
    isPrimary: bankAccount.isPrimary,
  });
};

export const updateAuroraBankAccount = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  bankAccount: AuroraBankAccountInput,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(bankAccounts)
    .set({
      bankName: bankAccount.bankName,
      accountType: enumValue(bankAccount.accountType, 'account_type'),
      accountNumberLast4: bankAccount.accountNumberLast4,
      iban: blankToNull(bankAccount.iban),
      bic: blankToNull(bankAccount.bic),
      isPrimary: bankAccount.isPrimary,
    })
    .where(eq(bankAccounts.id, bankAccount.id));
};

export const deleteAuroraBankAccount = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  bankAccountId: string,
) => {
  const db = stageDatabase(client, env);
  await db.delete(bankAccounts).where(eq(bankAccounts.id, bankAccountId));
};

export const createAuroraEmployment = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  employment: AuroraEmploymentInput,
) => {
  const db = stageDatabase(client, env);
  await db.insert(employments).values({
    id: employment.id,
    personId: employment.personId,
    companyName: employment.companyName,
    position: employment.position,
    department: blankToNull(employment.department),
    startDate: employment.startDate,
    endDate: blankToNull(employment.endDate),
    isCurrent: employment.isCurrent,
    salary: employment.salary ?? null,
    currency: employment.currency,
  });
};

export const updateAuroraEmployment = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  employment: AuroraEmploymentInput,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(employments)
    .set({
      companyName: employment.companyName,
      position: employment.position,
      department: blankToNull(employment.department),
      startDate: employment.startDate,
      endDate: blankToNull(employment.endDate),
      isCurrent: employment.isCurrent,
      salary: employment.salary ?? null,
      currency: employment.currency,
    })
    .where(eq(employments.id, employment.id));
};

export const deleteAuroraEmployment = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  employmentId: string,
) => {
  const db = stageDatabase(client, env);
  await db.delete(employments).where(eq(employments.id, employmentId));
};

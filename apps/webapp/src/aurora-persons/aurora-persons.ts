import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import {
  accountTypeEnum,
  addresses,
  addressPageSchema,
  addressTypeEnum,
  bankAccountPageSchema,
  bankAccounts,
  contactPageSchema,
  contacts,
  contactTypeEnum,
  employmentPageSchema,
  employments,
  genderEnum,
  personDetailSchema,
  personListSchema,
  persons,
  readAuroraSettings,
  STAGE_DATABASE_SCHEMA,
} from '@tanstack-aws/aurora';
import { eq, getColumns, sql, type Table } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';

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

type AuroraGender = (typeof genderEnum.enumValues)[number];

export type AuroraPersonInput = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: AuroraGender | null;
};

type AuroraAddressType = (typeof addressTypeEnum.enumValues)[number];

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

type AuroraContactType = (typeof contactTypeEnum.enumValues)[number];

export type AuroraContactInput = {
  id: string;
  personId: string;
  type: AuroraContactType;
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
};

type AuroraAccountType = (typeof accountTypeEnum.enumValues)[number];

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
const enumValue = (value: string | null, pgEnum: { enumName: string }) =>
  sql`${value}::${sql.raw(`"${STAGE_DATABASE_SCHEMA}"."${pgEnum.enumName}"`)}`;

type TableColumns<TTable extends Table> = TTable['_']['columns'];

/** The `SELECT` list for one read: the table columns named by its page schema, and no others. */
const pageColumns = <TTable extends Table, TShape extends Record<string, unknown>>(
  table: TTable,
  pageSchema: { shape: TShape },
) => {
  const columns: Record<string, unknown> = getColumns(table);
  // Object.fromEntries widens the keys to string; the keys are exactly the page-schema keys.
  return Object.fromEntries(
    Object.keys(pageSchema.shape).map((key) => [key, columns[key]]),
  ) as Pick<TableColumns<TTable>, keyof TShape & keyof TableColumns<TTable>>;
};

const personListColumns = pageColumns(persons, personListSchema);
const personDetailColumns = pageColumns(persons, personDetailSchema);
const addressColumns = pageColumns(addresses, addressPageSchema);
const bankAccountColumns = pageColumns(bankAccounts, bankAccountPageSchema);
const contactColumns = pageColumns(contacts, contactPageSchema);
const employmentColumns = pageColumns(employments, employmentPageSchema);

export const readAuroraPersonList = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
) => {
  const db = stageDatabase(client, env);
  return db.select(personListColumns).from(persons);
};

export const readAuroraPersonDetail = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  personId: string,
) => {
  const db = stageDatabase(client, env);
  const [personRows, addressRows, bankAccountRows, contactRows, employmentRows] = await Promise.all(
    [
      db.select(personDetailColumns).from(persons).where(eq(persons.id, personId)),
      db.select(addressColumns).from(addresses).where(eq(addresses.personId, personId)),
      db.select(bankAccountColumns).from(bankAccounts).where(eq(bankAccounts.personId, personId)),
      db.select(contactColumns).from(contacts).where(eq(contacts.personId, personId)),
      db.select(employmentColumns).from(employments).where(eq(employments.personId, personId)),
    ],
  );

  return {
    addresses: addressRows,
    bankAccounts: bankAccountRows,
    contacts: contactRows,
    employments: employmentRows,
    person: personRows[0] ?? null,
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
    gender: enumValue(person.gender ?? null, genderEnum),
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
      gender: enumValue(person.gender ?? null, genderEnum),
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
    type: enumValue(address.type, addressTypeEnum),
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
      type: enumValue(address.type, addressTypeEnum),
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
    type: enumValue(contact.type, contactTypeEnum),
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
      type: enumValue(contact.type, contactTypeEnum),
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
    accountType: enumValue(bankAccount.accountType, accountTypeEnum),
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
      accountType: enumValue(bankAccount.accountType, accountTypeEnum),
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

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
} from '@tanstack-aws/aurora';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import type { z } from 'zod';

export type StageDatabaseQueryClient = {
  send: (command: ExecuteStatementCommand) => Promise<ExecuteStatementCommandOutput>;
};

/**
 * Drizzle's Data API driver types its client as `RDSDataClient`. Reads take a
 * narrower sender so tests can record SQL without calling AWS. The instance is
 * still an RDSDataClient; only `send` is delegated.
 */
const dataApiClient = (client: StageDatabaseQueryClient): RDSDataClient =>
  Object.assign(new RDSDataClient({}), {
    send: (command: ExecuteStatementCommand) => client.send(command),
  });

type PageColumnSelection<TSchema extends z.ZodType> = {
  [K in keyof z.infer<TSchema>]: unknown;
};

export const readAuroraPersons = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
) => {
  const settings = readAuroraSettings(env);
  const db = drizzle({
    client: dataApiClient(client),
    database: settings.databaseName,
    resourceArn: settings.clusterArn,
    secretArn: settings.secretArn,
  });

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

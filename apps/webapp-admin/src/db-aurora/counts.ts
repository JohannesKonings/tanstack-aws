import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import {
  addresses,
  bankAccounts,
  contacts,
  employments,
  persons,
  readAuroraSettings,
} from '@tanstack-aws/aurora';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';

export type StageDatabaseQueryClient = {
  send: (command: ExecuteStatementCommand) => Promise<ExecuteStatementCommandOutput>;
};

export type StageTableCounts = {
  addresses: number;
  bankAccounts: number;
  contacts: number;
  employments: number;
  persons: number;
};

/**
 * Drizzle's Data API driver types its client as `RDSDataClient`. Counts take a
 * narrower sender so tests can record SQL without calling AWS. The instance is
 * still an RDSDataClient; only `send` is delegated.
 */
const dataApiClient = (client: StageDatabaseQueryClient): RDSDataClient =>
  Object.assign(new RDSDataClient({}), {
    send: (command: ExecuteStatementCommand) => client.send(command),
  });

const readCount = (rows: { count: number }[]): number => {
  const row = rows[0];
  if (!row) {
    throw new Error('Stage database count returned no row');
  }
  return row.count;
};

export const countStageDatabaseTables = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
): Promise<StageTableCounts> => {
  const settings = readAuroraSettings(env);
  const db = drizzle({
    client: dataApiClient(client),
    database: settings.databaseName,
    resourceArn: settings.clusterArn,
    secretArn: settings.secretArn,
  });

  const [personRows, addressRows, bankAccountRows, contactRows, employmentRows] = await Promise.all(
    [
      db.select({ count: count() }).from(persons),
      db.select({ count: count() }).from(addresses),
      db.select({ count: count() }).from(bankAccounts),
      db.select({ count: count() }).from(contacts),
      db.select({ count: count() }).from(employments),
    ],
  );

  return {
    addresses: readCount(addressRows),
    bankAccounts: readCount(bankAccountRows),
    contacts: readCount(contactRows),
    employments: readCount(employmentRows),
    persons: readCount(personRows),
  };
};

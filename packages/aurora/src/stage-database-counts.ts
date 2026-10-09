import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { addresses, bankAccounts, contacts, employments, persons } from './person-schema.ts';

export class AuroraConfigurationError extends Error {
  constructor() {
    super('Aurora settings are missing');
    this.name = 'AuroraConfigurationError';
  }
}

export type AuroraSettings = {
  clusterArn: string;
  databaseName: string;
  schema: string;
  secretArn: string;
};

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

const setting = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name]?.trim();
  if (!value) {
    throw new AuroraConfigurationError();
  }
  return value;
};

export const readAuroraSettings = (env: NodeJS.ProcessEnv): AuroraSettings => ({
  clusterArn: setting(env, 'AURORA_CLUSTER_ARN'),
  databaseName: setting(env, 'AURORA_DATABASE_NAME'),
  schema: setting(env, 'AURORA_SCHEMA'),
  secretArn: setting(env, 'AURORA_SECRET_ARN'),
});

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

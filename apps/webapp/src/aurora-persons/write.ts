import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import {
  addresses,
  bankAccounts,
  contacts,
  employments,
  persons,
  readAuroraSettings,
  STAGE_DATABASE_SCHEMA,
} from '@tanstack-aws/aurora';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';

export type StageDatabaseQueryClient = {
  send: (command: ExecuteStatementCommand) => Promise<ExecuteStatementCommandOutput>;
};

/**
 * Drizzle's Data API driver types its client as `RDSDataClient`. Writes take a
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

type AuroraGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type AuroraPersonWrite = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: AuroraGender | null;
};

/**
 * Person enums live in schema `default`. Each Data API call is its own session,
 * so a cast has to name that schema instead of relying on search_path.
 */
const enumValue = (value: string | null, enumName: string) =>
  sql`${value}::${sql.raw(`"${STAGE_DATABASE_SCHEMA}"."${enumName}"`)}`;

export const createAuroraPerson = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  person: AuroraPersonWrite,
  writtenAt: string,
) => {
  const db = stageDatabase(client, env);
  await db.insert(persons).values({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    dateOfBirth: person.dateOfBirth,
    gender: enumValue(person.gender, 'gender'),
    createdAt: writtenAt,
    updatedAt: writtenAt,
  });
};

export const updateAuroraPerson = async (
  client: StageDatabaseQueryClient,
  env: NodeJS.ProcessEnv,
  person: AuroraPersonWrite,
  writtenAt: string,
) => {
  const db = stageDatabase(client, env);
  await db
    .update(persons)
    .set({
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: person.dateOfBirth,
      gender: enumValue(person.gender, 'gender'),
      updatedAt: writtenAt,
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

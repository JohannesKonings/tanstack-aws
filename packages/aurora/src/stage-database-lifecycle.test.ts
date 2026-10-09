import { describe, expect, it } from 'vite-plus/test';
import {
  applyStageDatabaseLifecycle,
  type AuroraDataApiClient,
  type AuroraDataApiStatement,
} from './stage-database-lifecycle.ts';

const MAINTENANCE_DATABASE = 'tanstackaws';
const FEATURE_DATABASE = 'feature_checkout';

const recordStatements = (): {
  client: AuroraDataApiClient;
  statements: AuroraDataApiStatement[];
} => {
  const statements: AuroraDataApiStatement[] = [];
  return {
    statements,
    client: {
      execute: async (statement) => {
        statements.push(statement);
      },
    },
  };
};

const featureTables: AuroraDataApiStatement[] = [
  { database: MAINTENANCE_DATABASE, sql: 'CREATE DATABASE "feature_checkout"' },
  { database: FEATURE_DATABASE, sql: 'CREATE SCHEMA IF NOT EXISTS "default"' },
  {
    database: FEATURE_DATABASE,
    sql: `DO $$ BEGIN CREATE TYPE "default"."gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    database: FEATURE_DATABASE,
    sql: `DO $$ BEGIN CREATE TYPE "default"."address_type" AS ENUM ('home', 'work', 'billing', 'shipping'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    database: FEATURE_DATABASE,
    sql: `DO $$ BEGIN CREATE TYPE "default"."account_type" AS ENUM ('checking', 'savings', 'investment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    database: FEATURE_DATABASE,
    sql: `DO $$ BEGIN CREATE TYPE "default"."contact_type" AS ENUM ('email', 'phone', 'mobile', 'linkedin', 'twitter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    database: FEATURE_DATABASE,
    sql: 'CREATE TABLE IF NOT EXISTS "default"."persons" ("id" uuid PRIMARY KEY, "firstName" text NOT NULL, "lastName" text NOT NULL, "dateOfBirth" timestamptz, "gender" "default"."gender", "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL)',
  },
  {
    database: FEATURE_DATABASE,
    sql: 'CREATE TABLE IF NOT EXISTS "default"."addresses" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "default"."persons" ("id") ON DELETE CASCADE, "type" "default"."address_type" NOT NULL, "street" text NOT NULL, "city" text NOT NULL, "state" text NOT NULL, "postalCode" text NOT NULL, "country" text NOT NULL, "isPrimary" boolean NOT NULL)',
  },
  {
    database: FEATURE_DATABASE,
    sql: 'CREATE TABLE IF NOT EXISTS "default"."bank_accounts" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "default"."persons" ("id") ON DELETE CASCADE, "bankName" text NOT NULL, "accountType" "default"."account_type" NOT NULL, "accountNumberLast4" text NOT NULL, "iban" text, "bic" text, "isPrimary" boolean NOT NULL)',
  },
  {
    database: FEATURE_DATABASE,
    sql: 'CREATE TABLE IF NOT EXISTS "default"."contacts" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "default"."persons" ("id") ON DELETE CASCADE, "type" "default"."contact_type" NOT NULL, "value" text NOT NULL, "isPrimary" boolean NOT NULL, "isVerified" boolean NOT NULL)',
  },
  {
    database: FEATURE_DATABASE,
    sql: 'CREATE TABLE IF NOT EXISTS "default"."employments" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "default"."persons" ("id") ON DELETE CASCADE, "companyName" text NOT NULL, "position" text NOT NULL, "department" text, "startDate" timestamptz NOT NULL, "endDate" timestamptz, "isCurrent" boolean NOT NULL, "salary" numeric, "currency" text NOT NULL)',
  },
];

describe('stage database lifecycle', () => {
  it('creates the stage database from the maintenance database, then schema default and the person tables', async () => {
    const { client, statements } = recordStatements();

    await applyStageDatabaseLifecycle(client, {
      dropDatabaseOnDelete: true,
      maintenanceDatabase: MAINTENANCE_DATABASE,
      requestType: 'Create',
      stageDatabaseName: FEATURE_DATABASE,
    });

    expect(statements).toEqual(featureTables);
  });

  it('creates the same objects when the stage database already exists', async () => {
    const statements: AuroraDataApiStatement[] = [];
    const client: AuroraDataApiClient = {
      execute: async (statement) => {
        statements.push(statement);
        if (statement.sql.startsWith('CREATE DATABASE')) {
          throw new Error('database "feature_checkout" already exists');
        }
      },
    };

    await applyStageDatabaseLifecycle(client, {
      dropDatabaseOnDelete: true,
      maintenanceDatabase: MAINTENANCE_DATABASE,
      requestType: 'Update',
      stageDatabaseName: FEATURE_DATABASE,
    });

    expect(statements).toEqual(featureTables);
  });

  it('drops the stage database when an ephemeral stack is deleted', async () => {
    const { client, statements } = recordStatements();

    await applyStageDatabaseLifecycle(client, {
      dropDatabaseOnDelete: true,
      maintenanceDatabase: MAINTENANCE_DATABASE,
      requestType: 'Delete',
      stageDatabaseName: FEATURE_DATABASE,
    });

    expect(statements).toEqual([
      {
        database: MAINTENANCE_DATABASE,
        sql: 'DROP DATABASE IF EXISTS "feature_checkout"',
      },
    ]);
  });

  it('keeps the stage database when a permanent stage is deleted', async () => {
    const results = await Promise.all(
      ['main', 'prod'].map(async (stageDatabaseName) => {
        const recorded = recordStatements();
        await applyStageDatabaseLifecycle(recorded.client, {
          dropDatabaseOnDelete: false,
          maintenanceDatabase: MAINTENANCE_DATABASE,
          requestType: 'Delete',
          stageDatabaseName,
        });
        return recorded.statements;
      }),
    );

    expect(results).toEqual([[], []]);
  });
});
